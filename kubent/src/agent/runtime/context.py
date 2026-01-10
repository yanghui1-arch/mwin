from uuid import UUID
from contextvars import ContextVar

current_session_id = ContextVar[UUID | None]("current_session_id", default=None)
current_user_id = ContextVar[UUID | None]("current_user_id", default=None)
current_project_name = ContextVar[UUID | None]("current_project_name", default=None)