from enum import Enum

class LLMProvider(Enum):
    """LLMProvider is AI inference engine.
    Lots of existing inference engine such as vllm, sglang and so on. Different engine has their own input format and return type.
    
    OPENAI: use openai api key
    OPEN_ROUTER: use openrouter api key
    GOOGLE: use google api key
    ANTHROPIC: use anthropic api key
    OLLAMA: use ollama api key
    VLLM: use VLLM api key
    HF: use hugging face seires products or sdk.
    SGLANG: use sglang api key
    """
    
    OPENAI = 'openai'
    OPEN_ROUTER = "open_router"
    GOOGLE = 'google'
    ANTHROPIC = 'anthropic'
    OLLAMA = 'ollama'
    VLLM = "vllm"
    HF = "hugging_face"
    SGLANG = "sglang"