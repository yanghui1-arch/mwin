from typing import List, Dict, Any
from pydantic import BaseModel, Field, model_validator
from openai import OpenAI, pydantic_function_tool
from openai.types.chat import ChatCompletionMessageParam, ChatCompletion, ChatCompletionFunctionToolParam
from mwin import track, LLMProvider
from .react import ReActAgent
from .tools.search import SearchGoogle
from .tools.kubent_think import KubentThink
from .tools import QueryStepInputAndOutput
from ..env import Env

class Result(BaseModel):
    answer: str
    """Answer of Kubent"""

    chats: List[Dict[str, Any]]
    """ChatCompletionParams list. It contains user's question, kubent's tool calling & kubent's thoughts and kubent's answer but not contains previous chat history."""

system_bg = f"""Your name is "Kubent". Kubent is a useful assistant to keep improve agent performance better.
Generally, Kubent will recieve one or multiple abstract agent process flow graphs which will be closure in <Agent> XML tags. 
These graphs reflects how agent system works. It's possible that more than two graphs works as the same. Kubent can think them as a pattern or a fixed route.
Kubent's task is to response user's question based on agent system workflow.

As we all know, every agent system works for a certain purpose.
For example one people designs a phone agent that can give strange a phone and recommend its product. Another designs an office-word agent that can handle word documents.
Due to the complexity of various agent purposes, their process flow graph is different. In the same time, make their performance better will be different.
Kubent need to pose a concrete and specifically optimized for the task solution to make agent system performance upgrade about ~1% at least than before.
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
"""

class Kubent(ReActAgent):
    name: str = "Kubent"
    model: str = "anthropic/claude-haiku-4.5"
    tools: List[ChatCompletionFunctionToolParam] = Field(..., default_factory=list)
    engine: OpenAI = OpenAI()
    current_env: Env
    attempt: int = 15

    class Config:
        arbitrary_types_allowed=True

    @model_validator(mode="after")
    def load_tools_and_set_env_action_space(self):
        self.tools = [
            SearchGoogle().json_schema, 
            KubentThink().json_schema,
            QueryStepInputAndOutput().json_schema,
        ]
        for tool in self.tools:
            self.current_env.update_space_action(tool=tool)

        return self

    def run(
        self, 
        question: str, 
        chat_hist: List[ChatCompletionMessageParam] | None = None,
        agent_workflows: List[str] | None = None,
    ) -> Result:
        """Kubent start to solve a question
        
        Args:
            question(str): question
            chat_hist(List[ChatCompletionMessageParam]|None): chat history with Kubent. Default to `None`.
        
        Returns:
            Result that Kubent gives
        """

        cnt = 0
        terminate = False
        obs = self.current_env.reset()
        act_info = {
            "step_finish_reason": "",
            "steps": 0,
            "num_tool_callings": 0, 
            "answer": ""
        }
        while terminate is False and cnt < self.attempt:
            obs, reward, terminate, act_info = self.act(question=question, obs=obs, chat_hist=chat_hist, agent_workflows=agent_workflows)
            cnt += 1

        if act_info.get("step_finish_reason") == "solved":
            chats:List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": act_info.get("answer")}]
            return Result(
                answer=act_info.get("answer"),
                chats=chats
            )
            
        else:
            chats:List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": f"Exceed max attempts: {self.attempt}"}]
            # TODO: Fix it in the later. Makes it pass the final answer not an exceed information.
            return Result(answer=f"Exceed max attempts: {self.attempt}", chats=chats)

    @track(track_llm=LLMProvider.OPENAI)
    def act(
        self, 
        question: str | None,
        obs: List[ChatCompletionMessageParam],
        chat_hist: List[ChatCompletionMessageParam] | None,
        agent_workflows: List[str] | None,
    ) -> tuple[List[ChatCompletionMessageParam], float, bool, Dict[str, str]]:
        if chat_hist is None:
            chat_hist = []
        user_content = question
        if agent_workflows is not None and len(agent_workflows) > 0:
            workflows_desc = [f"<AgentExecutionGraph>\n{workflow}\n</AgentExecutionGraph>" for workflow in agent_workflows]
            user_content = f"<Agent>\n{"\n".join(workflows_desc)}\n</Agent>" + "\n" + f"<Question>\n{question}\n</Question>"

        completion:ChatCompletion = self.engine.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_bg}] + chat_hist + [{"role": "user", "content": user_content}] + obs,
            tools=self.tools,
            parallel_tool_calls=True,
        )
        return self.current_env.step(llm_action=completion.choices[0].message)

    def register_tool(self, tool):
        try:
            new_tool:ChatCompletionFunctionToolParam = pydantic_function_tool(tool)
            self.tools.append(new_tool)
            self.current_env.update_space_action(tool=tool)
        except Exception as exce:
            print(f"[Error] Failed to register new tool for Kubent: {exce}")

    def change_env(self, new_env: Env):
        self.current_env = new_env
