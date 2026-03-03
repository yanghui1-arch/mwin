import threading
from typing import List, Dict, Any, Callable
from enum import StrEnum
from uuid import UUID
from pydantic import BaseModel
from openai.types.chat import ChatCompletionMessageParam
from .kubent import Kubent, Result
from ..env import Env, EnvStepInfo
from ..repository.db.conn import SessionLocal
from ..repository import kubent_chat


class AgentEventType(StrEnum):
    PROGRESS = "PROGRESS"
    DONE = "DONE"
    ERROR = "ERROR"


class SSEEvent(BaseModel):
    type: AgentEventType
    delta: str | None = None
    """LLM text token, streamed during PROGRESS."""

    tool_names: List[str] | None = None
    """Tools called in this step, reported after env.step() during PROGRESS."""

    answer: str | None = None
    """Final answer from the agent, present on DONE."""

    detail: str | None = None
    """Error message, present on ERROR."""


def run_with_callback(
    on_progress: Callable[[SSEEvent], None],
    cancel: threading.Event,
    env: Env,
    kubent: Kubent,
    question: str,
    chat_hist: List[ChatCompletionMessageParam] | None = None,
    agent_workflows: List[str] | None = None,
) -> Result:
    """Run the Kubent agent, reporting progress via callback instead of Celery task state.

    Args:
        on_progress: called after each agent step with (event_type, data).
    """
    cnt = 0
    terminate = False
    obs = env.reset()
    act_info: EnvStepInfo = {
        "step_finish_reason": "",
        "steps": 0,
        "num_tool_callings": 0,
        "answer": "",
        "tool_use": None,
    }
    while terminate is False and cnt < kubent.attempt and not cancel.is_set():
        content, tool_calls = kubent.stream_step(
            question=question,
            obs=obs,
            chat_hist=chat_hist,
            agent_workflows=agent_workflows,
            on_token=lambda delta: on_progress(SSEEvent(type=AgentEventType.PROGRESS, delta=delta)),
        )
        obs, reward, terminate, act_info = env.step(content=content, tool_calls=tool_calls)
        cnt += 1

        # content already streamed token-by-token above; only report tool names here
        on_progress(SSEEvent(
            type=AgentEventType.PROGRESS,
            tool_names=[t["name"] for t in act_info["tool_use"]] if act_info["tool_use"] is not None else None,
        ))

    if act_info.get("step_finish_reason") == "solved":
        chats: List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": act_info.get("answer")}]
        return Result(answer=act_info.get("answer"), chats=chats)
    else:
        chats: List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": f"Exceed max attempts: {kubent.attempt}"}]
        return Result(answer=f"Exceed max attempts: {kubent.attempt}", chats=chats)


def add_chat(
    session_id: UUID,
    user_id: UUID,
    messages: List[Dict[str, Any]],
    agent_name: str,
):
    with SessionLocal() as db:
        with db.begin():
            for message in messages:
                role = message.get("role", None)
                if role is None:
                    raise ValueError("[DB] Failed to store chats because no role.")

                kubent_chat.create_new_chat_sync(
                    db=db,
                    session_id=session_id,
                    user_id=user_id,
                    role=message.get("role"),
                    payload=message,
                    agent_name=agent_name,
                )
