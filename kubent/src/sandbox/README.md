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