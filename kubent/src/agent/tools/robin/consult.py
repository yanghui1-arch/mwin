from typing import Generic, TypeVar
import httpx
from typing import Callable
from pydantic import BaseModel, Field
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam
from ..toolkits import Tool

T = TypeVar("T")

_timeout = httpx.Timeout(
    connect=5.0,
    read=120.0,
    write=5.0,
    pool=5,
)

_client = httpx.Client(
    base_url="http://localhost:8000/kubent/extentions/robin_server",
    timeout=_timeout,
)

class ResponseModel(BaseModel, Generic[T]):
    code: int = 0
    message: str = "ok"
    data: T | None = None

class ConsultResult(BaseModel):
    message: str

def consult_robin(question: str, user_uuid: str, session_id: str, project_name: str, agent_name: str) -> str:
    response = _client.post(
        "/consult",
        json={
            "question": question,
            "user_uuid": user_uuid,
            "session_id": session_id,
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
    user_uuid: str = Field(..., description="User uuid that you are talking about it.")
    session_id: str = Field(..., description="Session uuid that you are talking in.")
    project_name: str = Field(..., description="Which project you are involved with.")
    agent_name: str = Field(..., description="Your name.")

class ConsultRobin(Tool):
    func:Callable = consult_robin
    type:str = "communicate"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        ConsultRobinParams,
        name="consult_robin",
        description="Consult Robin about the project's strategy or make sure yourself communications with others are always on the project's strategy."
    )
