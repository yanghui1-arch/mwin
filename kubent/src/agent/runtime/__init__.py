from .context import current_session_id, current_user_id, current_project_name, current_agent_name
from .scope import execution_scope

get_current_session_id = current_session_id.get
get_current_user_id = current_user_id.get
get_current_project_name = current_project_name.get
get_current_agent_name = current_agent_name.get

__all__ = [
    "get_current_session_id",
    "get_current_user_id",
    "get_current_project_name",
    "get_current_agent_name",
    "execution_scope",
]