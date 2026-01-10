from typing import Generic, TypeVar
import httpx
from typing import Callable
from pydantic import BaseModel, Field
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam
from ..toolkits import Tool
from ....agent.runtime import get_current_user_id, get_current_session_id, get_current_project_name

T = TypeVar("T")

_timeout = httpx.Timeout(
    connect=5.0,
    read=120.0,
    write=5.0,
    pool=5,
)

_client = httpx.Client(
    base_url="http://localhost:20261/kubent/extentions/robin_server",
    timeout=_timeout,
)

class ResponseModel(BaseModel, Generic[T]):
    code: int = 0
    message: str = "ok"
    data: T | None = None

class ConsultResult(BaseModel):
    message: str

def consult_robin(question: str, agent_name: str) -> str:
    user_uuid = get_current_user_id()
    session_id = get_current_session_id()
    project_name = get_current_project_name()
    
    if not user_uuid or not session_id or not project_name:
        # TODO: Add a logger warning.
        return "You are not talking a project in the session. Please don't use the function again."
    
    response = _client.post(
        "/consult",
        json={
            "question": question,
            "user_uuid": str(user_uuid),
            "session_id": str(session_id),
            "project_name": project_name,
            "agent_name": agent_name,
        }
    )
    response.raise_for_status()
    resp = ResponseModel[ConsultResult].model_validate(response.json())
    if resp.code != 200:
        return resp.message
    return resp.data.message

class ConsultRobinParams(BaseModel):
    question: str = Field(..., description="Question you want to consult Robin.")
    agent_name: str = Field(..., description="Your name.")

class ConsultRobin(Tool):
    func:Callable = consult_robin
    type:str = "communicate"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        ConsultRobinParams,
        name="consult_robin",
        description="Consult Robin about the project's strategy or make sure yourself communications with others are always on the project's strategy."
    )
