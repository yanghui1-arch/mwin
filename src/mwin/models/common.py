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

    @classmethod
    def resolve(cls, llm_provider: "LLMProvider", model: str | None) -> "LLMProvider":
        """Resolve AUTO to a concrete provider for OpenAI-compatible models."""
        if llm_provider is not cls.AUTO:
            return llm_provider

        if model is None or len(model.strip()) == 0:
            return llm_provider

        normalized_model = model.strip().lower()
        if "deepseek" in normalized_model:
            return cls.DEEPSEEK
        if "gemini" in normalized_model:
            return cls.GOOGLE
        if "kimi" in normalized_model or "moonshot" in normalized_model:
            return cls.KIMI
        if "glm" in normalized_model or "zhipu" in normalized_model:
            return cls.GLM
        return cls.OPENAI
