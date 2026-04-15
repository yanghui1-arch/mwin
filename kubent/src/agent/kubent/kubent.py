from typing import List, Dict, Any, Callable
from uuid import UUID
import os
import logging
from textwrap import dedent
from pydantic import BaseModel, PrivateAttr, ConfigDict, Field, model_validator
from dotenv import load_dotenv
from openai import OpenAI, Stream, BadRequestError
from openai.types.chat import (
    ChatCompletionMessageParam, 
    ChatCompletion,
    ChatCompletionMessage,
    ChatCompletionMessageFunctionToolCall,
    ChatCompletionFunctionToolParam,
    ChatCompletionChunk
)
from openai.types.chat.chat_completion_message_function_tool_call import Function
from mwin import track, LLMProvider
from .system_prompt import build_kubent_system_prompt
from ..react import ReActAgent
from ..events import AgentEventType, SSEEvent
from ..tools import WebSearch, QueryStep, Bash
from ..runtime import current_project_name, current_user_id
from ...config import config
from ...utils.llm_context import build_save_dir

logger = logging.getLogger(__file__)

class Result(BaseModel):
    answer: str
    """Answer of Kubent"""

    chats: List[Dict[str, Any]]
    """ChatCompletionParams list. It contains user's question, kubent's tool calling & kubent's thoughts and kubent's answer but not contains previous chat history."""

load_dotenv()
_BASE_URL = os.getenv("kimi_base_url")
_API_KEY = os.getenv("kimi_api_key")
_OPENAI_CLIENT_KWARGS: dict[str, str] = {}
if _BASE_URL:
    _OPENAI_CLIENT_KWARGS["base_url"] = _BASE_URL
if _API_KEY:
    _OPENAI_CLIENT_KWARGS["api_key"] = _API_KEY


class Kubent(ReActAgent):
    name: str = "kubent"
    model: str = config.get("kubent.model", "anthropic/claude-haiku-4.5")
    tools: List[ChatCompletionFunctionToolParam] = Field(..., default_factory=list)
    engine: OpenAI = OpenAI(**_OPENAI_CLIENT_KWARGS)
    attempt: int = 15
    extra_body: Dict[str, Any] | None = None
    _system_prompt: str = PrivateAttr(default="")

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @model_validator(mode="after")
    def load_tools(self):
        self.tools = [
            WebSearch().json_schema,
        ]
        return self
    
    @model_validator(mode="after")
    def set_extra_body(self):
        if "anthropic" in self.model:
            self.extra_body = {
                "reasoning": {
                    "enabled": True,
                    "max_tokens": 4000,
                }
            }
        
        if "qwen" in self.model.lower():
            self.extra_body = {
                "enable_thinking": True
            }
        
        return self


    @model_validator(mode="after")
    def inject_system_prompt(self):
        from src.agent.runtime import get_current_project_name, get_current_user_id
        from src.repository.db.conn import SessionLocal
        from src.repository.project import query_project_sync

        project_name = get_current_project_name()
        user_id = get_current_user_id()

        with SessionLocal() as session:
            project = query_project_sync(session, user_id=user_id, name=project_name)
            if not project:
                raise ValueError("No project for user %s: %s ", str(user_id), project_name)

            name = project.name
            description = project.description

            self._system_prompt = build_kubent_system_prompt(
                project_name=name,
                project_description=description
            )
            logger.info("Kubent build system prompt.")
            
        return self
    
    @property
    def system_prompt(self):
        return self._system_prompt

    @track
    def act(
        self, 
        question: str | None,
        obs: List[ChatCompletionMessageParam],
        chat_hist: List[ChatCompletionMessageParam] | None,
        agent_workflows: List[str] | None,
        session_id: UUID,
        user_id: UUID,
        project_name: str,
    ):
        ...

    def run():
        ...
    
    @track
    def step(
        self,
        question: str | None,
        obs: List[ChatCompletionMessageParam],
        chat_hist: List[ChatCompletionMessageParam] | None,
    ) -> ChatCompletion:
        """Kubent execute one step

        Args:
            question(str | None): question
            obs(List[ChatCompletionMessageParam]): Kubent observations in the context.
            chat_hist(List[ChatCompletionMessageParam] | None): kubent chat history.
            agent_workflows(List[str] | None): traces agent workflows.

        Returns:
            llm chat completion
        """
        ...

    @track(llm_provider=LLMProvider.OPEN_ROUTER, project_name="Kubent")
    def stream_step(
        self,
        current_turn_ctx: list[ChatCompletionMessageParam],
        on_progress: Callable[[SSEEvent], None],
    ) -> ChatCompletionMessage:
        """Like step() but streams token deltas via on_progress as the LLM generates them.

        Args:
            on_progress: called with each SSEEvent (PROGRESS with delta or answer_delta).
                         Pass ``lambda _: None`` if you don't need streaming updates.

        Returns:
            Reconstructed assistant message compatible with env.step().
        """
        

        conversation_dir = build_save_dir(
            agent_name=self.name, user_uuid=str(current_user_id.get()),
            project_name=current_project_name.get()
        )
        if conversation_dir.exists() and conversation_dir.is_dir():
            kubent_system_prompt = "" # placeholder
            pattern = f"conversation_*.md"
            matched_files = list(conversation_dir.glob(pattern))
            matched_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            kubent_system_prompt += dedent(
                f"""
                # Stored Conversation Path
                {config.get("agent.docker.conversations_dir")}

                ## Some latest conversation files name
                {"\n".join([ file.name for file in matched_files[:3] ])}
                """
            )

        try:
            stream:Stream[ChatCompletionChunk] = self.engine.chat.completions.create(
                model=self.model,
                messages=current_turn_ctx,
                tools=self.tools,
                parallel_tool_calls=True,
                stream=True,
            )
            return self._collect_stream(stream, on_progress)
        except BadRequestError as bqe:
            raise bqe

    def _collect_stream(
        self,
        stream: Stream[ChatCompletionChunk],
        on_progress: Callable[[SSEEvent], None],
    ) -> ChatCompletionMessage:
        """Consume a streaming LLM response.

        Classifies the step on the first meaningful chunk:
        - tool_calls chunk        → intermediate step: emits PROGRESS(delta=...)
        - reasoning_content chunk → intermediate step: emits PROGRESS(delta=...)
        - content chunk           → final answer step: emits PROGRESS(answer_delta=...)
        Returns a reconstructed assistant message param (content + tool_calls + optional reasoning_content).
        """

        content_parts: List[str] = []
        reasoning_parts: List[str] = []
        tool_calls_acc: dict[int, dict] = {}
        event_type = AgentEventType.PROGRESS
        finish_reason = None

        for chunk in stream:
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            delta = choice.delta
            finish_reason: str | None = choice.finish_reason
            if finish_reason is not None and finish_reason == "stop":
                event_type = AgentEventType.DONE

            reasoning_delta: str | None = getattr(delta, "reasoning_content", None)
            content_delta: str | None = delta.content

            if reasoning_delta:
                reasoning_parts.append(reasoning_delta)
                on_progress(SSEEvent(type=event_type, delta=reasoning_delta))

            if content_delta:
                content_parts.append(content_delta)
                if event_type == AgentEventType.PROGRESS:
                    on_progress(SSEEvent(type=event_type, delta=content_delta))
                elif event_type == AgentEventType.DONE:
                    on_progress(SSEEvent(type=event_type, answer_delta=content_delta))

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls_acc[idx]["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            tool_calls_acc[idx]["name"] += tc.function.name
                        if tc.function.arguments:
                            tool_calls_acc[idx]["arguments"] += tc.function.arguments

        tool_calls: list[ChatCompletionMessageFunctionToolCall] | None = None
        
        if tool_calls_acc:
            tool_calls = [
                ChatCompletionMessageFunctionToolCall(
                    id=tc["id"],
                    type="function",
                    function=Function(name=tc["name"], arguments=tc["arguments"])
                )
                for _, tc in sorted(tool_calls_acc.items())
            ]

        content = "".join(content_parts) or None
        reasoning_content = "".join(reasoning_parts) or None
        assistant_message = ChatCompletionMessage(
            role="assistant",
            content=content,
            tool_calls=tool_calls,
        )
        if reasoning_content:
            assistant_message.__setattr__("reasoning_content", reasoning_content)

        return assistant_message

