from uuid import UUID
from contextlib import contextmanager
from .context import current_session_id, current_user_id, current_project_name, current_agent_name

@contextmanager
def execution_scope(*, session_id: UUID, user_id: UUID, project_name: str, agent_name: str):
    t1 = current_session_id.set(session_id)
    t2 = current_user_id.set(user_id)
    t3 = current_project_name.set(project_name)
    t4 = current_agent_name.set(agent_name)
    try:
        yield
    finally:
        current_session_id.reset(t1)
        current_user_id.reset(t2)
        current_project_name.reset(t3)
        current_agent_name.reset(t4)