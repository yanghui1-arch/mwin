from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import BaseModel

class ChatRequest(BaseModel):
    session_id: str | None
    message: str
    project_id: int | None

class ChatSessionResponse(BaseModel):
    id: UUID
    user_uuid: UUID
    title: str | None
    last_update_timestamp: datetime

class ChatSessionTitleRequest(BaseModel):
    message: str
    session_id: str

class DeleteChatSessionRequest(BaseModel):
    session_id: str


class OptimizeAgentSystemRequest(BaseModel):
    message: str
    project_name: str | None = None
    repo_url: str
    # repo_ref is a git ref such as a branch name, tag, or commit SHA.
    repo_ref: str | None = None


class OptimizeAgentSystemResponse(BaseModel):
    plan_type: Literal["feature", "fix", "patch"]
    title: str
    summary: str
    answer: str
    
