import json
from typing import Callable, TypedDict, Literal, List, Dict
from pydantic import BaseModel, Field
from openai.types.chat import ChatCompletionFunctionToolParam, ChatCompletionMessage, ChatCompletionMessageToolCallUnion, ChatCompletionMessageParam
from mwin import track
from .agent.tools import TOOL_KITS, Tool

class Action(BaseModel):
    func: Callable
    type: Literal['think', 'search', 'command', 'general_function', 'communicate'] = 'general_function'
    
    def is_search(self):
        return self.type == 'search'
    
    def is_command(self):
        return self.type == 'command'
    
    def is_general_function(self):
        return self.type == 'general_function'
    
    def is_think(self):
        return self.type == 'think'

class ToolUsage(TypedDict):
    name: str
    result: str

class EnvStepInfo(TypedDict):
    step_finish_reason: Literal["solved", "think", "action"] | None
    steps: int
    num_tool_callings: int
    answer: str | None
    tool_use: List[ToolUsage] | None

class Env(BaseModel):
    env_name: str
    """Enviroment name"""

    action_spaces: Dict[str, Action] = {}
    """Avaliable actions in the env. Generally it's agent tools and think action"""

    steps: int = 0
    """Execute one question steps"""

    num_think: int = 0
    """Think counts"""

    num_tool_callings: int = 0
    """Calling tool function number"""

    num_search: int = 0
    """Serach number"""

    obs: List[ChatCompletionMessageParam] = Field(..., default_factory=list)
    """Observation of current context.
    
    It contains all messages which is need for the next agent.run(question). However it doesn't contain three parts.
    > User's question
    > Assistant's final answer
    > Previous chat history
    """

    tool_usage_history: List[ToolUsage] | None = None
    """History of agent using tools in one step."""

    step_finish_reason: Literal["solved", "think", "action"] | None = None
    """Step finish reason."""

    answer: str | None = None
    """Agent final answer"""

    def reset(self) -> List[ChatCompletionMessageParam]:
        self.steps = 0
        self.num_search = 0
        self.num_tool_callings = 0
        self.obs = []
        self.tool_usage_history = None
        self.step_finish_reason = None
        self.answer =  None
        return self.obs
    
    @track
    def step(
        self,
        llm_action: ChatCompletionMessage,
    ) -> tuple[List[ChatCompletionMessageParam], float, bool, EnvStepInfo]:
        """Environment will be affected by an agent's decision.
        
        Args:
            llm_action(ChatCompletionMessage): agent action.

        Returns:
            a tuple consists of observation which is passed to the next round conversation, action accumulated rewards, terminate flag 
            and EnvStepInfo. 
            EnvStepInfo contains finish reason such as "solved", "think", "action", current steps and counts of calling tool.
        """

        reward = 0
        terminate = False

        content:str | None = llm_action.content
        tool_calls:List[ChatCompletionMessageToolCallUnion] | None = llm_action.tool_calls

        if content is not None and tool_calls is None:
            terminate = True
            self.answer = content
            self.steps += 1
            self._mark_step("solved")
            return self.obs, reward, terminate, self._get_info()

        if tool_calls is not None:
            self.obs.append(
                {"role": "assistant", "content": content, "tool_calls": [
                        {"id": tool_call.id, "type": tool_call.type, "function": tool_call.function.model_dump()}
                        for tool_call in tool_calls
                    ]
                }
            )
            
            # Initialize tool usage history.
            self.tool_usage_history = []

            for tool_call in tool_calls:
                tool_name = tool_call.function.name
                tool_call_id = tool_call.id
                act:Action = self.action_spaces.get(tool_name, None)
                if act is not None:
                    func = act.func
                    arguments = tool_call.function.arguments
                    result = "None"
                    try:
                        arguments_json: Dict = json.loads(arguments)
                        result = func(**arguments_json)
                        result_str = str(result)
                        if act.is_think():
                            self.obs.append(
                                {
                                    "role": "tool",
                                    "content": f"[Think #{self.num_think}] {result_str}",
                                    "tool_call_id": tool_call_id
                                }
                            )
                            self._mark_step("think")
                            self.num_think += 1
                        else:
                            self.obs.append(
                                {
                                    "role": "tool",
                                    "content": f"[Observation #{self.num_tool_callings}] {result_str}", 
                                    "tool_call_id": tool_call_id
                                }
                            )
                            self._mark_step("action")
                            self.num_tool_callings += 1
                    except json.JSONDecodeError as jde:
                        if act.is_think():
                            self.obs.append(
                                {
                                    "role": "tool",
                                    "content": f"[Think #{self.num_think} Exception] Failed to think question because {arguments} is not string type.",
                                    "tool_call_id": tool_call_id
                                }
                            )
                            self._mark_step("think")
                            self.num_think += 1
                        else:
                            self.obs.append(
                                {
                                    "role": "tool", 
                                    "content": f"[Observation #{self.num_tool_callings}] Failed to execute tool {self.num_tool_callings} in step {self.steps}, which tool name is {tool_name}, because argument is not a valid json. Invalid arguments: {arguments}",
                                    "tool_call_id": tool_call_id
                                }
                            )
                            self._mark_step("action")
                            self.num_tool_callings += 1
                        result = f"Invalid arguments: {arguments}"
                    finally:
                        # add tool use
                        self.tool_usage_history.append(ToolUsage(name=tool_name, result=str(result)))
                
                else:
                    self.obs.append(
                        {
                            "role": "tool",
                            "content": f"[Observation #{self.num_tool_callings}] Call invaild tool: {tool_name} which can not found in agent action space.",
                            "tool_call_id": tool_call_id
                        }
                    )
                    self.num_tool_callings += 1

        self.steps += 1
        return self.obs, reward, terminate, self._get_info()

    def update_space_action(self, tool: ChatCompletionFunctionToolParam):
        tool_name = tool['function']['name']
        if tool_name in TOOL_KITS.keys():
            toolkit:Tool = TOOL_KITS.get(tool_name)
            action = Action(func=toolkit.func, type=toolkit.type)
            self.action_spaces[tool_name] = action
        else:
            print(f"[Error] Failed to update space action: Can't find {tool_name} in tool kits.")

    def _get_info(self) -> EnvStepInfo:
        return {
            "step_finish_reason": self.step_finish_reason,
            "steps": self.steps,
            "num_tool_callings": self.num_tool_callings, 
            "answer": self.answer,
            "tool_use": self.tool_usage_history
        }
    
    def _mark_step(self, step_type: Literal["think", "action", "solved"]):
        """Mark the step as an action step"""

        self.step_finish_reason = step_type

