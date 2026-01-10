from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import BaseModel
from ...kubent_celery.tasks import TaskProgress

class ChatRequest(BaseModel):
    session_id: str | None
    message: str
    project_id: int | None

class ChatResponse(BaseModel):
    task_id: str

class ChatSessionResponse(BaseModel):
    id: UUID
    user_uuid: UUID
    title: str | None
    last_update_timestamp: datetime

class ChatSessionTitleRequest(BaseModel):
    message: str
    session_id: str

class ChatTaskResponse(BaseModel):
    status: Literal["PENDING", "RECEIVED", "STARTED", "SUCCESS", "FAILURE", "REVOKED", "REJECTED", "RETRY", "IGNORED"]
    """task status"""

    content: str | None
    """content after successful to execute task"""

    exception_traceback: str | None
    """error traceback"""

    progress_info: TaskProgress | None
    """Started task information in the progress"""