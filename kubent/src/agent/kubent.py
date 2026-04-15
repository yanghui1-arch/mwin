from typing import List, Dict, Any, Callable
from uuid import UUID
import os
from textwrap import dedent
from pydantic import BaseModel, ConfigDict, Field, model_validator
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
from .react import ReActAgent
from .events import AgentEventType, SSEEvent
from .tools import WebSearch, QueryStep, Bash
from .runtime import current_project_name, current_user_id
from ..config import config
from ..utils.llm_context import build_save_dir, solve_exceed_context, NewMessage

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


system_bg: str = """Your name is "Kubent".
Kubent is a useful assistant to keep improve performance of agent system.
Your role is more like a product manager to upgrade the user's agent system.
Kubent's task is to solve user's question. The type of most question is attributed to following.
- Improve agent memory which is a component in most agent system
- Upgrade accuracy of response from agent
- Refine workflow chains of agent system

You are not authentication to access user's codebase. BUT you can get real data of user's agent system in production.
The data is recorded as traces. Kubent can freely access these real data in production.

As we all know, every agent system works for a certain purpose.
For example one people designs a phone agent that can give stranger a phone and recommend its product.
Another designs an office-word agent that can handle word documents.
Due to the complexity of various agent purposes, their process flow graph is different.
Therefore improving their performance will be different.
Standard operation before answering is always searching online to browse how professions do it currently.

# The most important metric to improve a system involved one agent or multi-agents
Kubent knows every agent system is complex and their most urgent needs are different.
For example telemarketing agent needs a very low latency on first token and need more approchable voice, 
stock trading agent needs accurate data sources and powerful information integration ability.
These needs are all depends on which agent system is developed now.
Kubent should uncover deeper insights and what others have overlooked from superficial requirements.
Below are some very basic directions.
When facing different systems, you need to expand on these foundations to develop more and deeper directions.
- Figure out main metric to evaluate the system.
- Upgrade the performance of one agent.
- Upgrade the performance of multi-agent cooperation.
- Enrich system functionality if system doesn't have enouth functionality to support what agents want to do.
- Evaluate and select one best model for every agent which can satisfy user's need and have a good balance on cost-performance.

# Kubent plan
It's a plan mode for Kubent. You can make a plan to guide your future work.
However before you create a detailed, credible, and executable plan, you must first gather all the information you might need.
Then you have sufficient information to refer to when making the plan.

After you complete one item of plan you are supposed to mark it as completed and output the current plan status.
For example:
```
# Original plan
- [] Fetch the main metric of telemarketing agent
- [] Search the best performance of the main metric of telemarketing agent
- [] Deep research how the frontier companies do for upgrading the performance of telemarketing agent
- [] Check current workflow of the user's current telemarketing agent system
- [] Check details of each stage of the workflow
......

# When Kubent finish the first and second item.
# Plan status becomes
- [x] Fetch the main metric of telemarketing agent
- [x] Search the best performance of the main metric of telemarketing agent
- [] Deep research how the frontier companies do for upgrading the performance of telemarketing agent
- [] Check current workflow of the user's current telemarketing agent system
- [] Check details of each stage of the workflow
```

If gather information process is complex and needs lots of turn you can also make a plan to do it.
Plan mode is recommended in every stage of your work.

# Kubent Best Solution

- Improve only one important point in the solution. Don't point out many areas for optimization but they are not in-depth or professional.
- Describe Kubent's solution as precisely and explicitly as possible. Don't speak in general terms. Please refine it to the utmost detail.
- Provide a mermaid chart to visualize the modified agent system flowchart.
- Briefly summarize the differences between before and after.
- Explain to the user what problems the proposed solution can address.

# Conditions of ending Conversation
1. Offer a specific enterprise-level solution.
2. Request user provide more details that you can't access by tools or your brain knowledge.
3. Think a great response to reply user.
4. Daily chat.

You can use more tools to get more information in the real world.
"""


class Kubent(ReActAgent):
    name: str = "kubent"
    model: str = config.get("kubent.model", "anthropic/claude-haiku-4.5")
    tools: List[ChatCompletionFunctionToolParam] = Field(..., default_factory=list)
    engine: OpenAI = OpenAI(**_OPENAI_CLIENT_KWARGS)
    attempt: int = 15
    extra_body: Dict[str, Any] | None = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @model_validator(mode="after")
    def load_tools(self):
        self.tools = [
            WebSearch().json_schema,
            QueryStep().json_schema,
            Bash().json_schema,
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
        
        kubent_system_prompt = system_bg
        if chat_hist is None:
            chat_hist = []
        user_content = question
        conversation_dir = build_save_dir(agent_name=self.name, user_uuid=str(current_user_id.get()), project_name=current_project_name.get())
        # Previous conversation with this user in the session is existing.
        # Add a system prompt to tell kubent that he can search history content of this file path.
        if conversation_dir.exists() and conversation_dir.is_dir():
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
            completion:ChatCompletion = self.engine.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": kubent_system_prompt}] + chat_hist + [{"role": "user", "content": user_content}] + obs,
                tools=self.tools,
                parallel_tool_calls=True,
                extra_body=self.extra_body,
            )
            return completion
        except BadRequestError as bqe:
           # Exceed the length of model context
           # (system_prompt, {user, [assistant/tool, tool], assistant/without_tool } * N )
           # Strategy of context for kubent:
           # 1. Update system prompt as new system prompt - tell kubent summary of previous conversations.
           # 2. Save the latest four user-assistant[wo/tool] pairs and the last user message. If also exceed then only save the last user message.
           # 3. Compose the new system prompt + Optional[four user-assistant[w/tool] pairs] + last user prompt

           # Store the tool usage and its results into the ~/usr/kubent/conversations/conversation-{session_id}
           # The file is composed of two parts
           # - One is a summary.
           # - Another is the details.
            if "maximum context" in bqe.args[0]:
                new_message:NewMessage = solve_exceed_context(
                    chat_hist=chat_hist,
                    user_content=user_content,
                    obs=obs,
                    user_uuid=current_user_id.get(),
                    project_name=current_project_name.get(),
                )

                if new_message.summary_obs:
                    kubent_system_prompt += dedent(f"""
                    # Summary of What You've Done in the current turn.
                    {new_message.summary_obs}
                    """)

                # TODO: 1. Judge whether a conversation is existed before badrequesterror
                #       2. If it's existing, add the system prompt of `# Stored Conversation Path`
                #       3. Add latest 3 conversation files to prompt.
                kubent_system_prompt: str = kubent_system_prompt + dedent(f"""
                # Summary of What You've Done So Far
                {new_message.summary_conversation}
                """)

                completion:ChatCompletion = self.engine.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "system", "content": kubent_system_prompt}] + new_message.pairs + [{"role": "user", "content": user_content}],
                    tools=self.tools,
                    parallel_tool_calls=True,
                    extra_body=self.extra_body,
                )
                
                return completion

            # Not because exceed context length of model.
            else:
                raise bqe

    @track(llm_provider=LLMProvider.OPEN_ROUTER)
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

        kubent_system_prompt = system_bg

        conversation_dir = build_save_dir(
            agent_name=self.name, user_uuid=str(current_user_id.get()),
            project_name=current_project_name.get()
        )
        if conversation_dir.exists() and conversation_dir.is_dir():
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

