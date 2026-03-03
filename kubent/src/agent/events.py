from typing import List
from enum import StrEnum
from pydantic import BaseModel


class AgentEventType(StrEnum):
    PROGRESS = "PROGRESS"
    DONE = "DONE"
    ERROR = "ERROR"


class SSEEvent(BaseModel):
    type: AgentEventType
    delta: str | None = None
    """Think-bubble token, streamed during intermediate tool-call steps."""

    answer_delta: str | None = None
    """Final-answer token, streamed during the last step."""

    tool_names: List[str] | None = None
    """Tools called in this step, reported after env.step() during PROGRESS."""

    answer: str | None = None
    """Final answer from the agent, present on DONE."""

    detail: str | None = None
    """Error message, present on ERROR."""
