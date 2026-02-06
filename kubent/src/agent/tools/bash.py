from typing import Callable
from pathlib import Path
from pydantic import BaseModel, Field
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam

from .toolkits import Tool
from ..runtime import get_current_agent_name, get_current_session_id, get_current_user_id, get_current_project_name
from ...sandbox import get_sandbox_manager, DockerSandboxConfig, VolumeMount
from ...config import config

def bash(command: str):
    """Execute bash command
    
    Args:
        command(str): bash command
    """

    session_id = str(get_current_session_id())
    agent_name = get_current_agent_name()
    user_id = str(get_current_user_id())
    project_name = get_current_project_name()

    home_path = Path.home()
    conversation_path = home_path / config.get("agent.host.data_dir", "data") / config.get(f"agent.host.{agent_name}.conversations_dir", f"{agent_name}/conversations")
    conversation_path.mkdir(parents=True, exist_ok=True)
    pattern = f"conversation_{user_id}_{project_name}*.md"
    matched_files = list(conversation_path.glob(pattern=pattern))

    docker_volumns = []
    for file in matched_files:
        file_name = file.name
        docker_volumns.append(
            VolumeMount(
                host_path=file.resolve(),
                container_path=config.get("agent.docker.conversations_dir", "/workspace/conversations") + "/" + f"{file_name}",
                read_only=True
            )
        )

    sandbox_manager = get_sandbox_manager()
    sandbox = sandbox_manager.get_sandbox(
        agent_name=agent_name,
        session_id=session_id,
        config=DockerSandboxConfig(
            agent_name=agent_name,
            session_id=session_id,
            docker_image="python:3.12.12",
            docker_volumns=docker_volumns,
        )
    )
    
    bash_result = sandbox.bash(command)
    
    stdout, stderr = bash_result.output
    # Execute bash successfully
    if bash_result.exit_code == 0:
        result = stdout.decode("utf-8")
        return result

    else:
        return f"Fail to execute bash. {stdout.decode("utf-8") if stdout is not None else stderr}"


class BashParams(BaseModel):
    command: str = Field(..., description="Bash command to execute.")


class Bash(Tool):
    func: Callable = bash
    type: str = "command"
    json_schema: ChatCompletionFunctionToolParam  = pydantic_function_tool(BashParams, name="bash_command", description="""
                                         Bash Command based on linux Ubuntu 22.04.
                                         If you need to search, write, execute files or execute some bash commands to finish task, you should call bash tool.
                                         """)
