import threading
import json
from typing import List, Dict, Any, Callable
from uuid import UUID
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionMessage

from .tools import TOOL_KITS
from .kubent import Kubent, Result, system_bg as kubent_system
from .events import AgentEventType, SSEEvent
from ..env import Env, EnvStepInfo
from ..repository.db.conn import SessionLocal
from ..repository import kubent_chat


def run_with_callback(
    on_progress: Callable[[SSEEvent], None],
    cancel: threading.Event,
    kubent: Kubent,
    question: str,
) -> Result:
    """Run the Kubent agent, reporting progress via callback instead of Celery task state.

    Args:
        on_progress: called after each agent step with (event_type, data).
    """
    cnt = 0
    terminate = False
    current_turn_ctx: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": kubent_system},
        {"role": "user", "content": question}
    ]

    while terminate is False and cnt <= kubent.attempt and not cancel.is_set():
        cnt += 1
        message: ChatCompletionMessage = kubent.stream_step(
            current_turn_ctx=current_turn_ctx,
            on_progress=on_progress,
        )
        current_turn_ctx.append(message.model_dump(exclude_none=True))
        tool_names = []

        # Execute tool result
        if message.tool_calls is not None:
            for tc in message.tool_calls:
                id = tc.id
                name = tc.function.name
                args = tc.function.arguments
                tool_names.append(name)
                try:
                    args_json = json.loads(args)
                    callable_tool = TOOL_KITS.get(name, None)
                    if callable_tool is None:
                        raise ValueError("no tool")
                    exec_info = callable_tool.func(**args_json)
                
                except json.JSONDecodeError as jde:
                    exec_info = f"Failed to execute {name}: {str(jde)}"

                except ValueError:
                    exec_info = f"Failed to execute {name}: the tool is not existed."
                
                current_turn_ctx.append({
                    "role": "tool",
                    "content": exec_info,
                    "tool_call_id": id
                })

            # content already streamed token-by-token above; only report tool names here
            on_progress(
                SSEEvent(
                    type=AgentEventType.PROGRESS,
                    tool_names=tool_names if len(tool_names) > 0 else None
                )
            )

        else:
            terminate = True

    # End
    if cnt <= kubent.attempt and not cancel.is_set():
        assert current_turn_ctx[-1]["role"] == "assistant", "kubent's the last message role of current_turn_ctx is not assistant."
        answer = current_turn_ctx[-1]["content"]
        return Result(answer=answer, chats=current_turn_ctx)
    else:
        return Result(answer=f"Exceed max attempts: {kubent.attempt}", chats=current_turn_ctx)


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
