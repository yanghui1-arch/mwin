from contextvars import ContextVar

current_session_id = ContextVar[str | None]("current_session_id", default=None)
current_user_id = ContextVar[str | None]("current_user_id", default=None)
current_project_name = ContextVar[str | None]("current_project_name", default=None)