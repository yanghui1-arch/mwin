# Sandbox
Sandbox is used for agent to use bash command to use computer.

# Example
```python
# demo.py
import docker
from src.sandbox import DockerSandboxConfig, DockerSandbox

if __name__ == '__main__':
    sandbox_config = DockerSandboxConfig(agent_name="agent", session_id="2", docker_image="python:3.12.12")
    sandbox = DockerSandbox(config=sandbox_config, docker_client=docker.from_env())
    sandbox.write_file("/workspace/hello_world.py", content="print(\"hello world\")")
    print(
        sandbox.bash("cat /workspace/hello_world.py")
    )
```

Output:
```
(kubent) PS D:\workspace\codes\python\AT\kubent> python demo.py
ExecResult(exit_code=0, output=(b'print("hello world")\n', None))
```

Volumns
```python
# demo.py
if __name__ == "__main__":
    volumns = [VolumeMount(host_path=Path("./client.py").resolve(), container_path="/workspace/data/client.py")]
    sandbox_config = DockerSandboxConfig(
        agent_name="agent", 
        session_id="403", 
        docker_image="python:3.12.12", 
        docker_volumns=volumns
    )
    sandbox = DockerSandbox(config=sandbox_config, docker_client=docker.from_env())
    print(sandbox.read_file("/workspace/data/client.py"))
```

Output
```bash
(kubent) python demo.py
ExecResult(exit_code=0, output=(b'import time\nimport docker\nfrom docker import DockerClient\nfrom docker.errors import DockerException\n\n_docker_client: DockerClient | None = None\n\n\ndef init_docker_client(\n    retries: int = 5,\n    base_delay: float = 0.5,\n) -> DockerClient:\n    """\n    Init a singleton DockerClient with retry.\n    It should be executed when fastapi startup. Otherwise there is a risk to block the whole process.\n\n    Args:\n        retries(int): max retry attempts\n        base_delay(float): initial delay (seconds), exponential backoff\n    """\n    global _docker_client\n\n    if _docker_client is not None:\n        return _docker_client\n\n    last_exc: Exception | None = None\n\n    for attempt in range(1, retries + 1):\n        try:\n            client = docker.from_env()\n            client.ping()\n\n            _docker_client = client\n            return client\n\n        except DockerException as e:\n            last_exc = e\n            if attempt >= retries:\n                break\n\n            delay = base_delay * (2 ** (attempt - 1))\n            time.sleep(delay)\n\n    raise RuntimeError(\n        f"Failed to initialize Docker client after {retries} retries"\n    ) from last_exc\n\n\ndef get_docker_client():\n    if _docker_client is None:\n        raise RuntimeError(\n            "Docker client not initialized. "\n
   "Did you forget to call init_docker_client() on startup?"\n        )\n    return _docker_client', None))
```