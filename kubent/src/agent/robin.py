from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import model_validator, BaseModel, Field
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletion, ParsedChatCompletion, ChatCompletionFunctionToolParam
from mwin import track, LLMProvider
from .react import ReActAgent
from .tools import RobinThink
from ..env import Env
from ..config import model_config

class Result(BaseModel):
    answer: str
    """Answer of Robin"""

    chats: List[Dict[str, Any]]
    """ChatCompletionParams list. It contains agent's question, Robin's tool calling & Robin's thoughts and Robin's answer but not contains previous chat history."""

def _format_lm_answer(lm_answer: "LMAnswerResult") -> str:
    evaluation: "EvaluationResult" = lm_answer.evaluation
    missing_info: Optional[List[str]] = lm_answer.missing_info
    new_strategy:  Optional["StrategyResult"] = lm_answer.new_strategy

    formatted_ans: List[str] = []
    if evaluation.is_aligned_with_strategy is False:
        evaluation_res = ["## Your chats are not aligned with this project strategy. I will tell you the issues and what you need to do in the next to survive the whole chatting."]
        for issue in evaluation.issue_resolution:
            evaluation_res.append(f"### {issue.brief_issue_title}")
            evaluation_res.append(f"{issue.issue}")
            evaluation_res.append(f"#### Solution")
            evaluation_res.append(f"{issue.pr}")
        formatted_ans.append("\n".join(evaluation_res))
    
    if missing_info is not None:
        mis_info_res = []
        mis_info_res.append("## Offered information is not enough. You need to give me more information. The following is what I need.")
        mis_info_res.append("\n- ".join(missing_info))
        formatted_ans.append("\n".join(mis_info_res))
    
    if new_strategy is not None:
        new_strategy_res = []
        new_strategy_res.append("## Project strategy will be updated.")
        new_strategy_res.append("### New Strategy")
        new_strategy_res.append(new_strategy.content)
        new_strategy_res.append("### Reasons")
        new_strategy_res.append(new_strategy.explaination)
        formatted_ans.append("\n".join(new_strategy_res))

    return '\n'.join(formatted_ans)

class LMAnswerResult(BaseModel):
    evaluation: "EvaluationResult" = Field(..., description="Robin evaluate agents chats to ensure every chat is on the right way.")
    missing_info: Optional[List[str]] = Field(None, description="Robin points out the missing information which results in unabling to decide whether set a new project's strategy. If information is enough, it's null.")
    new_strategy: Optional["StrategyResult"] = Field(None, description="Set a new stratygy only when missing info is null and Robin find it's time to change the project's stratygy.")

class EvaluationResult(BaseModel):
    is_aligned_with_strategy: bool = Field(..., description="Evaluate the agent chats are aligned with project's strategy.")
    issue_resolution: Optional[List["IssueResolution"]] = Field(None, description="Give pairs of issue and its pr if agent chats are not aligned with strategy.")

class StrategyResult(BaseModel):
    content: str = Field(..., description="Project's new strategy.")
    explaination: str = Field(..., description="Explain the necessity of changing/setting the new strategy.")

class IssueResolution(BaseModel):
    brief_issue_title: str = Field(..., description="Brief issue title which summarize the issue in the simplest words.")
    issue: str = Field(..., description="Issues in the other agent's chats which is not on the right way.")
    pr: str = Field(..., description="Solution of solving the issues.")
    

system_bg = """Your name is Robin, and you are the company's senior project strategy consultant.
Robin is now responsible for providing strategic consulting services to all agents within the company.

During the consulting process, Robin will also redesign the project strategy based on current conversations between other agents and clients, discussions among colleague agents, 
or industry insights up to {time} for the project's sector. This ensures that the project strategy aligns first with the client's vision, second with industry trends, 
and finally that the project remains more competitive compared to other competing projects.
When other agents consult Robin on project strategy, Robin must evaluate whether the chat records between the agent and other agents or clients align with the current project strategy. 
If they do not align, Robin will point out one or more areas where the agent went wrong and advise them on how to steer the conversation back on track to align with the project strategy. 

Additionally, since the information provided by other agents during consultations may not be comprehensive, Robin, as a senior strategy consultant, has access to various tools to attempt to obtain missing information.
and verify its accuracy with the consulting agent. 
However, if no tools are available to acquire the missing information, Robin will directly identify what information is lacking and request the consulting agent to provide it. 

Finally, Robin may determine that the existing project strategy has not yet been implemented and that it aligns with current industry trends and remains competitive.
In such cases, Robin will not create a new project strategy.
If Robin does decide to formulate a new project strategy, they must explain the reasons for the change and outline the content of the new strategy.
Next, you will receive the project name, project description, the current project strategy, the name of the consulting agent, and their recent 10 chat records. 
Information about the project will be enclosed within `<Project>`, and details about the consulting agent will be enclosed within `<Agent>`.

<Project>
  <Name>
  {project_name}
  </Name>
  <Description>
  {project_description}
  </Description>
  <Strategy>
  {project_strategy}
  </Strategy>
</Project>

<Agent>
  <Name>
  {agent_name}
  </Name>
  <Chats>
  {agent_chats}
  </Chats>
</Agent>
"""

class Robin(ReActAgent):
    """Robin is the second ReAct agent in kubent system. He is good at analyzing a project motivation.
    In some ways we don't know who is the project's target client and what the project's real target.
    Sometimes we chat with Kubent systemto get improvement suggestions. Robin will keep judging whether
    other agents, who are in the whole process of Kubent, understand our project's target and ensure all
    chats are in the right way.
    Robin tasks:
    1. Identify a project's strategy such as target client, motivation and user's desired effect.
    2. Understand whether other agents fully understand what the project's strategy is.
    3. Correct misunderstandings of agents who doesn't understand what the project is actually doing.
    """
    current_env: Env
    name: str = "Robin"
    attempt: int = 25
    model: str = model_config.get("robin.model", "anthropic/claude-haiku-4.5")
    tools: List[ChatCompletionFunctionToolParam] = Field(..., default_factory=list)
    engine: OpenAI = OpenAI()
    parse_model: str = model_config.get("robin.parse.model", "qwen2.5-72b-instruct")
    parse_engine: OpenAI = OpenAI()

    class Config:
        arbitrary_types_allowed=True

    @model_validator(mode="after")
    def load_tools_and_set_env_action_space(self):
        self.tools = [RobinThink().json_schema]
        for tool in self.tools:
            self.current_env.update_space_action(tool=tool)

        return self
    
    @track(track_llm=LLMProvider.OPENAI)
    def run(
        self,
        question: str,
        project_name: str,
        project_description: str | None, 
        project_strategy: str | None,
        agent_name: str,
        agent_chats: List[ChatCompletionMessageParam] | None = None,
        chat_hist: List[ChatCompletionMessageParam] | None = None,
    ) -> Result:
        """Robin runs
        Given a project name and agent name Robin do two things.
        1. Formulate a strategy
            - deeply analyze whether project strategies are still aligned with current stage.
            - try to plan project strategies.
        2. Evaluate questioning agent's behaviour is aligned with project strategy
            - ensure that the questioning agent's thinking process, tool functions, and chats with customers are aligned with the project strategy.
            If they are not aligned, Robin will analyze step by step to identify the issues and provide recommendations or follow-up plans.
        
        Args:
            question(str): agent question.
            project_name(str): project name.
            project_description(str | None): project description.
            project_strategy(str | None): project strategies.
            agent_name(str): questionning agent name.
            agent_chats(List[ChatCompletionMessageParam] | None): questioning agent latest 10 chats. 
        
        Returns:
            result contains answer and chats.
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
            obs, reward, terminate, act_info = self.act(
                question=question,
                obs=obs,
                chat_hist=chat_hist,
                project_name=project_name,
                project_description=project_description,
                project_strategy=project_strategy,
                agent_name=agent_name,
                agent_chats=agent_chats,
            )
            cnt += 1

        if act_info.get("step_finish_reason") == "solved":
            # completion: ParsedChatCompletion = self.parse_engine.chat.completions.parse(
            #     messages=[{"role": "system", "content": "Parse documents given by user as json."}, {"role": "user", "content": act_info.get("answer")}],
            #     model=self.parse_model,
            #     response_format=LMAnswerResult,
            #     tool_choice="none"
            # )
            # TODO: Fix model refusal condition.
            # parsed_ans:LMAnswerResult = completion.choices[0].message.parsed
            # lm_ans: str = _format_lm_answer(lm_answer=parsed_ans)
            chats:List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": act_info.get("answer")}]
            return Result(
                answer=act_info.get("answer"),
                chats=chats
            )
            
        else:
            # completion: ParsedChatCompletion = self.parse_engine.chat.completions.parse(
            #     messages=[{"role": "system", "content": "Extract the important thing and parse them as given response format."}, {"role": "user", "content": act_info.get("answer")}],
            #     model=self.parse_model,
            #     response_format=LMAnswerResult,
            #     tool_choice="none"
            # )
            # TODO: Fix model refusal condition.
            # parsed_ans:LMAnswerResult = completion.choices[0].message.parsed
            chats:List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": act_info.get("answer")}]
            
            return Result(answer=act_info.get("answer"), chats=chats)

    @track(track_llm=LLMProvider.OPENAI)
    def act(
        self,
        question: str,
        obs: List[ChatCompletionMessageParam],
        chat_hist: List[ChatCompletionMessageParam] | None,
        project_name: str,
        project_description: str,
        project_strategy: str | None,
        agent_name: str,
        agent_chats: List[ChatCompletionMessageParam] | None,
    ):
        if chat_hist is None:
            chat_hist = []
        user_content = question

        completion:ChatCompletion = self.engine.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_bg.format(
                    time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    project_name=project_name,
                    project_description=project_description,
                    project_strategy=project_strategy,
                    agent_name=agent_name,
                    agent_chats=agent_chats,
                )}] 
                + chat_hist
                + [{"role": "user", "content": user_content}]
                + obs,
            tools=self.tools,
            parallel_tool_calls=True,
        )
        return self.current_env.step(llm_action=completion.choices[0].message)
    
