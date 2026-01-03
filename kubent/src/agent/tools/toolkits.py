from typing import Callable, Literal
from pydantic import BaseModel
from openai.types.chat import ChatCompletionFunctionToolParam

class Tool(BaseModel):
    func: Callable
    type: Literal['think', 'search', 'command', 'general_function', 'communicate']
    json_schema: ChatCompletionFunctionToolParam
