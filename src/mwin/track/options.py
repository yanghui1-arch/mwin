from enum import Enum
from typing import List, Literal
from dataclasses import dataclass
from ..models.key_models import StepType
from ..models.common import LLMProvider


@dataclass
class TrackerOptions:
    """ tracker options
    Controls how tracker tracks the llm input and output.
    
    Args:
        tags(List[str] | None): tags of step or trace. Default to `None`.
        func_name(str | None): function name. It can be set manually or automatically. Default to `None`.
        step_type(StepType | None): step type. Default to `None`.
        model(str | None): using model name. Default to `None`.
        trace_name(str | None): trace name. Default to `None`.
        track_llm(LLMProvider | None): track a certain llm. Default to `None`. 
                                        If `track_llm` is not `None`, AITrace will track provider's api.
        llm_ignore_fields(List[str] | None): a list of llm ignore fields name. Default to `None`.
    """

    tags: List[str] | None = None
    func_name: str | None = None
    step_type: StepType | None = None
    model: str | None = None
    trace_name: str | None = None
    track_llm: LLMProvider | None = None
    llm_ignore_fields: List[str] | None = None