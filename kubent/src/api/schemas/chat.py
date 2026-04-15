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
    