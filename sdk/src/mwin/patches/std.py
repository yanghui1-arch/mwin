from typing import Literal, List
from pydantic import BaseModel
from openai.types.completion_usage import CompletionUsage
from openai.types.chat import ChatCompletionAudio, ChatCompletion
from openai.types.chat.chat_completion_message_tool_call import ChatCompletionMessageToolCallUnion

class Function(BaseModel):
    name: str
    arguments: str

class ToolFunctionCall(BaseModel):
    id: int
    function: Function

class PatchResponse(BaseModel):
    """Patch stream standard response"""
    role: Literal['assistant', 'tool']
    content: str | None = None
    tool_calls: List[ChatCompletionMessageToolCallUnion] | None = None
    audio: ChatCompletionAudio | None = None

class PatchStreamResponse(BaseModel):
    """Patch stream standard response"""
    role: Literal['assistant', 'tool']
    content: str
    tool_calls: List[ToolFunctionCall] | None = None

def patch_std_output(openai_output: ChatCompletion) -> PatchResponse | None:
    choices = openai_output.choices
    if len(choices) > 0:
        choice = choices[0]
        content = choice.message.content
        role = choice.message.role
        audio = choice.message.audio
        tool_calls = choice.message.tool_calls
        return PatchResponse(
            role=role,
            content=content,
            tool_calls=tool_calls,
            audio=audio,
        )
    return None
    