from typing import Literal, List, Dict, Any
from datetime import datetime

from pydantic import BaseModel
from openai.types.chat.chat_completion import ChatCompletion, Choice
from openai.types.completion_usage import CompletionUsage
from openai.types.chat.chat_completion_message import Annotation
from openai.types.chat.chat_completion_audio import ChatCompletionAudio
from openai.types.chat.chat_completion_message_tool_call import ChatCompletionMessageToolCallUnion
from openai._types import NOT_GIVEN, not_given, omit

def remove_chat_completion_input_fields(
    openai_chat_completion_params: Dict[str, Any],
    ignore_fields: List[str] | None,
    is_ignore_omit: bool = True,
    is_ignore_not_given: bool = True,
    is_ignore_none: bool = True,
) -> Dict[str, Any]:
    """Remove OpenAI chat completion inputs fields
    ChatCompletion is used for openai.chat.completions.create(ChatCompletion)

    Args:
        openai_chat_completion(Completions): openai chat completion parameters.
        ignore_fileds(List): which part caller want to remove
        is_ignore_omit(bool): whether ignore Omit. Default to `True`.
        is_ignore_not_given(bool): whether ignore NOTGIVEN. Default to `True`.
        is_ignore_none(bool): whether ignore None. Default to `True`.

    Returns:
        Dict[str, Any]: remove keys that caller defines.
    """
    
    keys = openai_chat_completion_params.keys()
    if ignore_fields:
        for ignore_field in ignore_fields:
            if ignore_field not in keys:
                import warnings
                warnings.warn(f"WARNING: The ignore_field you pass `{ignore_field}` doesn't exist in openai.chat.completions.create() parameters.")

            openai_chat_completion_params.pop(ignore_field, "Not exists")

    for k in list(openai_chat_completion_params.keys()):
        if (
            (is_ignore_omit and openai_chat_completion_params[k] == omit )
            or (is_ignore_not_given and (openai_chat_completion_params[k] == not_given or openai_chat_completion_params[k] == NOT_GIVEN))
            or (is_ignore_none and openai_chat_completion_params[k] is None)
        ):
            openai_chat_completion_params.pop(k)
    return openai_chat_completion_params

class FilteredFieldsOpenAIChatCompletionsOutput(BaseModel):
    model: str
    created: datetime
    content: str | None = None
    role: Literal["assistant"] | None = None
    annotations: List[Annotation] | None = None
    audio: ChatCompletionAudio | None = None
    tool_calls: List[ChatCompletionMessageToolCallUnion] | None = None
    choices: List[Choice] | None = None
    service_tier: Literal["auto", "default", "flex", "scale", "priority"] | None = None
    system_fingerprint: str | None = None
    usage: CompletionUsage | None = None

def remove_chat_completion_output_fields(
        openai_chat_completion_output: ChatCompletion,
        ignore_fields: List[str] | None,
        reserve_service_tier: bool = False,
        reserve_system_fingerprint: bool = False,
        reserve_usage: bool = True,
) -> FilteredFieldsOpenAIChatCompletionsOutput:
    """Remove openai chat completion output fields
    
    Args:
        openai_chat_completion_output(ChatCompletion): openai.chat.completions.create() output
        ignore_fields(List[str] | None): ignore fields name.
        reserve_service_tier(bool): whether reserve service tier. Default to `False`.
        reserve_system_fingerprint(bool): whether reserve system finger print. Default to `False`.
        reserve_usage(bool): whether reserve usage.

    Returns:
        FilteredFieldsOpenAIChatCompletionsOutput: filter outputs
    """

    outputs = FilteredFieldsOpenAIChatCompletionsOutput(
        model=openai_chat_completion_output.model,
        created=datetime.fromtimestamp(timestamp=openai_chat_completion_output.created)
    )
    if len(openai_chat_completion_output.choices) == 1:
        message = openai_chat_completion_output.choices[0].message
        outputs.content = message.content
        outputs.role = message.role
        outputs.annotations = message.annotations
        outputs.audio = message.audio
        outputs.tool_calls = message.tool_calls
    else:
        outputs.choices = openai_chat_completion_output.choices
    
    if reserve_service_tier:
        outputs.service_tier = openai_chat_completion_output.service_tier
    if reserve_system_fingerprint:
        outputs.system_fingerprint = openai_chat_completion_output.system_fingerprint
    if reserve_usage:
        outputs.usage = openai_chat_completion_output.usage
    
    fields = FilteredFieldsOpenAIChatCompletionsOutput.model_fields
    if ignore_fields:
        for ignore_field in ignore_fields:
            if ignore_field not in fields:
                import warnings
                warnings.warn(f"An invalid ignore field name for RemovedFieldsOpenAIChatCompletionsOuptut. Invalid field: `{ignore_field}`.")
                continue
            setattr(outputs, ignore_field, None)
    return outputs
