from enum import Enum

class LLMProvider(Enum):
    """LLMProvider is AI inference engine.
    Lots of existing inference engine such as vllm, sglang and so on. Different engine has their own input format and return type.
    
    AUTO: infer the provider from the OpenAI-compatible model name
    OPENAI: use openai api key
    KIMI = "kimi"
    OPEN_ROUTER: use openrouter api key
    DEEPSEEK: use official deepseek api key
    GLM: use z.ai / zhipu api key
    """
    
    AUTO = "auto"
    OPENAI = 'openai'
    KIMI = "kimi"
    OPEN_ROUTER = "open_router"
    DEEPSEEK = "deepseek"
    GLM = "glm"
