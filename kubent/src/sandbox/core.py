from pathlib import Path
import shlex
from typing import Iterable, Sequence

import docker
from pydantic import BaseModel


class VolumeMount(BaseModel):
    host_path: Path
    container_path: str
    read_only: bool = False
    create_if_missing: bool = True

    def volume_flag(self) -> str:
        suffix = ":ro" if self.read_only else ""
        return f"{self.host_path}:{self.container_path}{suffix}"


class DockerContainerConfig(BaseModel):
    image: str
    name_prefix: str = "agent-sandbox"
    work_dir: str = "/workspace"
    read_only_rootfs: bool = False
    network_disabled: bool = False
    user: str | None = None


class DockerContainerRunner:
    def __init__(
        self, 
        config: DockerContainerConfig, 
        client: docker.DockerClient | None = None,
    ):
        self.config = config
        self._docker_client = client or docker.from_env()

    def build_container_name(self, session_id: str) -> str:
        return f"{self.config.name_prefix}-{session_id}"

    def ensure_host_paths(self, mounts: Iterable[VolumeMount]) -> None:
        """Ensure host path is existed."""

        for mount in mounts:
            if mount.host_path.exists() or not mount.create_if_missing:
                continue
            mount.host_path.mkdir(parents=True, exist_ok=True)

    def build_run_kwargs(
        self,
        session_id: str,
        mounts: Sequence[VolumeMount],
        command: Sequence[str] | None = None,
    ) -> dict[str, object]:
        container_name = self.build_container_name(session_id)
        volumes: dict[str, dict[str, str]] = {}
        for mount in mounts:
            volumes[str(mount.host_path)] = {
                "bind": mount.container_path,
                "mode": "ro" if mount.read_only else "rw",
            }
        cmd: dict[str, object] = {
            "image": self.config.image,
            "detach": True,
            "name": container_name,
            "working_dir": self.config.work_dir,
            "read_only": self.config.read_only_rootfs,
            "network_disabled": self.config.network_disabled,
            "volumes": volumes,
        }
        if self.config.user:
            cmd["user"] = self.config.user
        if command is not None:
            cmd["command"] = list(command)
        return cmd
    
    def restart_container(
        self,
        session_id: str
    ):
        """Restart an existing container"""
        
        container_name = self.build_container_name(session_id)
        container = self._docker_client.containers.get(container_name)
        container.start()
        return container

    def run_container(
        self,
        session_id: str,
        mounts: Sequence[VolumeMount],
        command: Sequence[str] | None = None,
    ):
        """Run a container
        Create and start a container with command and attached with volumns.
        """

        self.ensure_host_paths(mounts)
        cmd = self.build_run_kwargs(session_id, mounts, command)
        return self._docker_client.containers.run(**cmd)

    def exec(self, session_id: str, command: Sequence[str]):
        container_name = self.build_container_name(session_id)
        container = self._docker_client.containers.get(container_name)
        return container.exec_run(list(command), demux=True)

    def stop_container(self, session_id: str):
        container_name = self.build_container_name(session_id)
        container = self._docker_client.containers.get(container_name)
        container.stop()
        return container

    def remove_container(self, session_id: str):
        container_name = self.build_container_name(session_id)
        container = self._docker_client.containers.get(container_name)
        container.remove()
        return container


class DockerSandboxConfig(BaseModel):
    session_id: str


class DockerSandbox:
    """File/script-level wrapper for DockerContainerRunner exec-based operations."""

    def __init__(self, runner: DockerContainerRunner, config: DockerSandboxConfig):
        self._runner = runner
        self.session_id = config.session_id

    def execute_file(
        self,
        path: str,
        args: Sequence[str] | None = None,
    ):
        """Execute a file inside the container only; no host execution occurs."""
        args_list = list(args) if args else []
        extension = Path(path).suffix
        if extension == ".sh":
            command = ["sh", path, *args_list]
            return self._runner.exec(self.session_id, command)
        if extension == ".py":
            command = ["python", path, *args_list]
            return self._runner.exec(self.session_id, command)
        if extension == ".js":
            command = ["node", path, *args_list]
            return self._runner.exec(self.session_id, command)
        if extension == ".c":
            output_path = f"/tmp/{Path(path).stem}-{self.session_id}.out"
            compile_command = ["cc", path, "-o", output_path]
            run_command = [output_path, *args_list]
            shell_command = " ".join(shlex.quote(item) for item in compile_command)
            shell_command += " && "
            shell_command += " ".join(shlex.quote(item) for item in run_command)
            return self._runner.exec(self.session_id, ["sh", "-c", shell_command])

        chmod_command = ["chmod", "+x", path]
        run_command = [path, *args_list]
        shell_command = " ".join(shlex.quote(item) for item in chmod_command)
        shell_command += " && "
        shell_command += " ".join(shlex.quote(item) for item in run_command)
        return self._runner.exec(self.session_id, ["sh", "-c", shell_command])

    def write_file(
        self,
        path: str,
        content: str,
    ):
        """Write content to a path that exists only inside the container filesystem."""

        command = ["sh", "-lc", f"cat > {shlex.quote(path)} << 'EOF'\n{content}\nEOF"]
        return self._runner.exec(self.session_id, command)

    def read_file(self, path: str):
        """Read content from a path that exists only inside the container filesystem."""
        
        command = ["sh", "-lc", f"cat {shlex.quote(path)}"]
        return self._runner.exec(self.session_id, command)
