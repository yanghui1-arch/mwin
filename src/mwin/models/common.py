from enum import Enum

class LLMProvider(Enum):
    """LLMProvider is AI inference engine.
    Lots of existing inference engine such as vllm, sglang and so on. Different engine has their own input format and return type.
    
    OPENAI: use openai sdk
    GOOGLE: use google sdk
    ANTHROPIC: use anthropic sdk
    OLLAMA: use ollama sdk or its inference server
    VLLM: use VLLM sdk or its inference server
    HF: use hugging face seires products or sdk.
    SGLANG: use sglang sdk
    """
    
    OPENAI = 'openai'
    GOOGLE = 'google'
    ANTHROPIC = 'anthropic'
    OLLAMA = 'ollama'
    VLLM = "vllm"
    HF = "hugging_face"
    SGLANG = "sglang"