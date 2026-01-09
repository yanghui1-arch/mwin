from typing import List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, model_validator
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletion, ChatCompletionFunctionToolParam
from mwin import track, LLMProvider
from .react import ReActAgent
from .tools.search import SearchGoogle
from .tools.kubent_think import KubentThink
from .tools import QueryStepInputAndOutput
from .tools import ConsultRobin

class Result(BaseModel):
    answer: str
    """Answer of Kubent"""

    chats: List[Dict[str, Any]]
    """ChatCompletionParams list. It contains user's question, kubent's tool calling & kubent's thoughts and kubent's answer but not contains previous chat history."""

system_bg = """Your name is "Kubent". Kubent is a useful assistant to keep improve agent performance better.
Generally, Kubent will recieve one or multiple abstract agent process flow graphs which will be closure in <Agent> XML tags. 
These graphs reflects how agent system works. It's possible that more than two graphs works as the same. Kubent can think them as a pattern or a fixed route.
Kubent's task is to response user's question based on agent system workflow.

As we all know, every agent system works for a certain purpose.
For example one people designs a phone agent that can give strange a phone and recommend its product. Another designs an office-word agent that can handle word documents.
Due to the complexity of various agent purposes, their process flow graph is different. In the same time, make their performance better will be different.
Kubent need to pose a concrete and specifically optimized for the task solution to make agent system performance upgrade about ~1% \\at least than before.
There are many tools you can use them. Sometimes Kubent will think considerate details, how to start next step and so on.

Finally Kubent will provide user with a specific enterprise-level solution. This solution must fulfill the following requirements:
> Describe Kubent's solution as precisely and explicitly as possible.
> Provide structured data of the modified agent system flowchart.
> Briefly summarize the differences between the modified flowchart and the original one.
> Explain to the user what problems the proposed solution can address.

When Kubent believes this round of conversation has ended, he will start with [Finish], followed by the response content for the user.
Finish reason has three conditions.
Condition 1: Offer a specific enterprise-level solution.
Condition 2: Request user provide more details that you can't access by tools or your brain knowledge.
Condition 3: Think a great response to reply user.
Condition 4: Daily chat.

<SessionId>{session_id}</SessionId>
<UserId>{user_id}</UserId>
<ProjectName>{project_name}</ProjectName>
"""

class Kubent(ReActAgent):
    name: str = "Kubent"
    model: str = "anthropic/claude-haiku-4.5"
    tools: List[ChatCompletionFunctionToolParam] = Field(..., default_factory=list)
    engine: OpenAI = OpenAI()
    attempt: int = 15

    class Config:
        arbitrary_types_allowed=True

    @model_validator(mode="after")
    def load_tools(self):
        self.tools = [
            SearchGoogle().json_schema, 
            KubentThink().json_schema,
            QueryStepInputAndOutput().json_schema,
            ConsultRobin().json_schema,
        ]
        return self

    @track(track_llm=LLMProvider.OPENAI)
    @DeprecationWarning("Not use. Replace it to step")
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

    @DeprecationWarning("Not use.")
    def run():
        ...
    
    @track(track_llm=LLMProvider.OPENAI)
    def step(
        self, 
        question: str | None,
        obs: List[ChatCompletionMessageParam],
        chat_hist: List[ChatCompletionMessageParam] | None,
        agent_workflows: List[str] | None,
        session_id: UUID,
        user_id: UUID,
        project_name: str,
    ) -> ChatCompletion:
        """Kubent execute one step
        
        Args:
            question(str | None): question
            obs(List[ChatCompletionMessageParam]): Kubent observations in the context.
            chat_hist(List[ChatCompletionMessageParam] | None): kubent chat history.
            agent_workflows(List[str] | None): traces agent workflows.
            session_id(UUID): session uuid
            user_id(UUID): user uuid
            project_name(str): working project
        
        Returns:
            llm chat completion
        """
        
        if chat_hist is None:
            chat_hist = []
        user_content = question
        if agent_workflows is not None and len(agent_workflows) > 0:
            workflows_desc = [f"<AgentExecutionGraph>\n{workflow}\n</AgentExecutionGraph>" for workflow in agent_workflows]
            user_content = f"<Agent>\n{"\n".join(workflows_desc)}\n</Agent>" + "\n" + f"<Question>\n{question}\n</Question>"

        completion:ChatCompletion = self.engine.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_bg.format(session_id=session_id, user_id=user_id, project_name=project_name)}] + chat_hist + [{"role": "user", "content": user_content}] + obs,
            tools=self.tools,
            parallel_tool_calls=True,
        )
        return completion
