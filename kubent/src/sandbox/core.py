from pathlib import Path
import shlex
import subprocess
from typing import Callable, Iterable, Sequence
from pydantic import BaseModel


DockerRunner = Callable[..., subprocess.CompletedProcess[str]]


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
        runner: DockerRunner | None = None
    ):
        self.config = config
        self._runner = runner or subprocess.run

    def build_container_name(self, session_id: str) -> str:
        return f"{self.config.name_prefix}-{session_id}"

    def ensure_host_paths(self, mounts: Iterable[VolumeMount]) -> None:
        """Ensure host path is existed."""

        for mount in mounts:
            if mount.host_path.exists() or not mount.create_if_missing:
                continue
            mount.host_path.mkdir(parents=True, exist_ok=True)

    def build_run_command(
        self,
        session_id: str,
        mounts: Sequence[VolumeMount],
        command: Sequence[str] | None = None,
    ) -> list[str]:
        container_name = self.build_container_name(session_id)
        cmd = [
            "docker",
            "run",
            "-d",
            "--name",
            container_name,
            "--workdir",
            self.config.work_dir,
        ]
        if self.config.read_only_rootfs:
            cmd.append("--read-only")
        if self.config.network_disabled:
            cmd.append("--network=none")
        if self.config.user:
            cmd.extend(["--user", self.config.user])
        for mount in mounts:
            cmd.extend(["-v", mount.volume_flag()])
        cmd.append(self.config.image)
        if command:
            cmd.extend(command)
        return cmd

    def run_agent_container(
        self,
        session_id: str,
        mounts: Sequence[VolumeMount],
        command: Sequence[str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        self.ensure_host_paths(mounts)
        cmd = self.build_run_command(session_id, mounts, command)
        return self._runner(cmd, check=True, text=True, capture_output=True)

    def exec(self, session_id: str, command: Sequence[str]) -> subprocess.CompletedProcess[str]:
        container_name = self.build_container_name(session_id)
        cmd = ["docker", "exec", container_name]
        cmd.extend(command)
        return self._runner(cmd, check=True, text=True, capture_output=True)

    def stop_container(self, agent_id: str) -> subprocess.CompletedProcess[str]:
        container_name = self.build_container_name(agent_id)
        return self._runner(["docker", "stop", container_name], check=True, text=True, capture_output=True)

    def remove_container(self, agent_id: str) -> subprocess.CompletedProcess[str]:
        container_name = self.build_container_name(agent_id)
        return self._runner(["docker", "rm", container_name], check=True, text=True, capture_output=True)


class DockerSandbox:
    """File/script-level wrapper for DockerContainerRunner exec-based operations."""

    def __init__(self, runner: DockerContainerRunner):
        self._runner = runner

    def execute_file(
        self,
        session_id: str,
        path: str,
        args: Sequence[str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        """Execute a file inside the container only; no host execution occurs."""
        args_list = list(args) if args else []
        extension = Path(path).suffix
        if extension == ".sh":
            command = ["sh", path, *args_list]
            return self._runner.exec(session_id, command)
        if extension == ".py":
            command = ["python", path, *args_list]
            return self._runner.exec(session_id, command)
        if extension == ".js":
            command = ["node", path, *args_list]
            return self._runner.exec(session_id, command)
        if extension == ".c":
            output_path = f"/tmp/{Path(path).stem}-{session_id}.out"
            compile_command = ["cc", path, "-o", output_path]
            run_command = [output_path, *args_list]
            shell_command = " ".join(shlex.quote(item) for item in compile_command)
            shell_command += " && "
            shell_command += " ".join(shlex.quote(item) for item in run_command)
            return self._runner.exec(session_id, ["sh", "-c", shell_command])

        chmod_command = ["chmod", "+x", path]
        run_command = [path, *args_list]
        shell_command = " ".join(shlex.quote(item) for item in chmod_command)
        shell_command += " && "
        shell_command += " ".join(shlex.quote(item) for item in run_command)
        return self._runner.exec(session_id, ["sh", "-c", shell_command])

    def write_file(
        self,
        session_id: str,
        path: str,
        content: str,
    ) -> subprocess.CompletedProcess[str]:
        """Write content to a path that exists only inside the container filesystem."""
        command = ["sh", "-lc", f"cat > {shlex.quote(path)} << 'EOF'\n{content}\nEOF"]
        return self._runner.exec(session_id, command)

    def read_file(self, session_id: str, path: str) -> subprocess.CompletedProcess[str]:
        """Read content from a path that exists only inside the container filesystem."""
        command = ["sh", "-lc", f"cat {shlex.quote(path)}"]
        return self._runner.exec(session_id, command)
