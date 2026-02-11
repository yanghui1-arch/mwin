from contextvars import ContextVar, Token
from dataclasses import dataclass
from ..models import Step
from ..track.options import TrackerOptions

@dataclass
class LLMPatchConfig:
    """Shared config for all LLM provider patches."""
    step: Step
    tracker_options: TrackerOptions
    func_name: str

# Single contextvar shared by all LLM providers
_llm_patch_config: ContextVar[LLMPatchConfig | None] = ContextVar(
    'llm_patch_config',
    default=None
)

def set_llm_patch_config(step: Step, tracker_options: TrackerOptions, func_name: str) -> Token:
    """Set patch config and return a single token."""
    config = LLMPatchConfig(step=step, tracker_options=tracker_options, func_name=func_name)
    return _llm_patch_config.set(config)

def reset_llm_patch_config(token: Token):
    """Reset patch config using the token."""
    _llm_patch_config.reset(token)

def get_llm_patch_config() -> LLMPatchConfig | None:
    """Get current patch config."""
    return _llm_patch_config.get()