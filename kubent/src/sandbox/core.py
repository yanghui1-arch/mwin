from pathlib import Path
import shlex
from typing import Iterable, Sequence, List

import docker
from docker.models.containers import ExecResult, Container
from docker.errors import NotFound 
from pydantic import BaseModel

from .client import get_docker_client
from ..config import config


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
    container_name: str
    work_dir: str = config.get("agent.docker.work_dir", "/workspace")
    read_only_rootfs: bool = False
    network_disabled: bool = False
    user: str | None = None


class DockerContainer:
    """Docker Container
    Support start, run, execute, stop and remove container
    """

    def __init__(
        self,
        config: DockerContainerConfig,
        client: docker.DockerClient | None = None,
    ):
        self.config = config
        self.container_name = config.container_name
        self._docker_client = client or docker.from_env()

    def ensure_host_paths(self, mounts: Iterable[VolumeMount]) -> None:
        """Ensure host path is existed."""

        for mount in mounts:
            if mount.host_path.exists() or not mount.create_if_missing:
                continue
            mount.host_path.mkdir(parents=True, exist_ok=True)

    def build_run_kwargs(
        self,
        mounts: Sequence[VolumeMount],
        command: Sequence[str] | None = None,
    ) -> dict[str, object]:
        volumes: dict[str, dict[str, str]] = {}
        for mount in mounts:
            volumes[str(mount.host_path)] = {
                "bind": mount.container_path,
                "mode": "ro" if mount.read_only else "rw",
            }
        cmd: dict[str, object] = {
            "image": self.config.image,
            "detach": True,
            "name": self.config.container_name,
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
    
    def restart(
        self,
    ) -> Container:
        
        container = self._docker_client.containers.get(self.container_name)
        container.start()
        return container

    def run(
        self,
        mounts: Sequence[VolumeMount],
        command: Sequence[str] | None = None,
    ) -> Container:

        self.ensure_host_paths(mounts)
        cmd = self.build_run_kwargs(mounts, command)
        return self._docker_client.containers.run(**cmd)

    def exec(self, command: str | List[str]) -> ExecResult:
        container = self._docker_client.containers.get(self.container_name)
        if not self._is_running():
            container = self.restart()
            container.reload()
        return container.exec_run(command, demux=True)

    def stop(self) -> Container:
        container = self._docker_client.containers.get(self.container_name)
        container.stop()
        return container

    def remove_container(self) -> Container:
        container = self._docker_client.containers.get(self.container_name)
        container.remove()
        return container
    

    def _is_running(self):
        container = self._docker_client.containers.get(self.container_name)
        container.reload()
        return container.status == "running"
    
    @property
    def in_use(self):
        try:
            container = self._docker_client.containers.get(self.container_name)
            container.reload()
            return True
        except NotFound as not_found:
            return False


class DockerSandboxConfig(BaseModel):
    agent_name: str
    """Agent name who uses the sandbox."""

    session_id: str
    """Chat session id which is important for identifing docker container."""

    docker_image: str
    """Docker image."""

    docker_volumns: Sequence[VolumeMount] | None = None
    """Docker volumns"""

    life_seconds: int = 600
    """Docker will be stopped after life seconds."""


class DockerSandbox:
    """File/script-level wrapper for DockerContainer exec-based operations.
    Caller stimulate the sandbox to interact with docker. 
    """

    def __init__(self, config: DockerSandboxConfig, docker_client: docker.client.DockerClient):
        self.session_id = config.session_id
        container_config = DockerContainerConfig(
            image=config.docker_image,
            container_name=f"{config.agent_name}-sandbox-{config.session_id}",
        )
        self._container = DockerContainer(config=container_config, client=docker_client)
        if self._container.in_use:
            self._container.restart()
        else:
            self._container.run(
                mounts=config.docker_volumns or [],
                command=["sleep", str(config.life_seconds)]
            )

    def execute_file(
        self,
        path: str,
        args: Sequence[str] | None = None,
    ) -> ExecResult:
        """Execute a file inside the container only; no host execution occurs."""
        args_list = list(args) if args else []
        extension = Path(path).suffix
        if extension == ".sh":
            command = ["sh", path, *args_list]
            return self._container.exec(command)
        if extension == ".py":
            command = ["python", path, *args_list]
            return self._container.exec(command)
        if extension == ".js":
            command = ["node", path, *args_list]
            return self._container.exec(command)
        if extension == ".c":
            output_path = f"/tmp/{Path(path).stem}-{self.session_id}.out"
            compile_command = ["cc", path, "-o", output_path]
            run_command = [output_path, *args_list]
            shell_command = " ".join(shlex.quote(item) for item in compile_command)
            shell_command += " && "
            shell_command += " ".join(shlex.quote(item) for item in run_command)
            return self._container.exec(["sh", "-c", shell_command])

        chmod_command = ["chmod", "+x", path]
        run_command = [path, *args_list]
        shell_command = " ".join(shlex.quote(item) for item in chmod_command)
        shell_command += " && "
        shell_command += " ".join(shlex.quote(item) for item in run_command)
        return self._container.exec(["sh", "-c", shell_command])

    def write_file(
        self,
        path: str,
        content: str,
    ) -> ExecResult:
        """Write content to a path that exists only inside the container filesystem."""

        command = ["sh", "-lc", f"cat > {shlex.quote(path)} << 'EOF'\n{content}\nEOF"]
        return self._container.exec(command)

    def read_file(self, path: str) -> ExecResult:
        """Read content from a path that exists only inside the container filesystem."""
        
        command = ["sh", "-lc", f"cat {shlex.quote(path)}"]
        return self._container.exec(command)
    
    def bash(self, command: str) -> ExecResult:
        """Execute bash command"""
        # TODO: Add a judgement to avoid dangerous bash command to influence host.
        return self._container.exec(command)

    def close(self) -> None:
        """Close the sandbox by stopping the container."""
        try:
            self._container.stop()
        except Exception as e:
            print(f"Warning: Failed to stop container {self._container.container_name}: {e}")

        try:
            self._container.remove_container()
        except Exception as e:
            print(f"Warning: Failed to remove container {self._container.container_name}: {e}")


def create_sandbox(
    agent_name: str,
    session_id: str,
    docker_image: str,
    docker_volumns: Sequence[VolumeMount | None] = None,
    life_seconds: int = 600,
):
    sandbox_config = DockerSandboxConfig(
        agent_name=agent_name,
        session_id=session_id,
        docker_image=docker_image,
        docker_volumns=docker_volumns,
        life_seconds=life_seconds
    )

    docker_client = get_docker_client()
    return DockerSandbox(config=sandbox_config, docker_client=docker_client)
