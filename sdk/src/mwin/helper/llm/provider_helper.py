from ...models.common import LLMProvider


def resolve_llm_provider(llm_provider: LLMProvider, model: str | None) -> LLMProvider:
    """Resolve AUTO to a concrete OpenAI-compatible provider from model name."""
    if llm_provider is not LLMProvider.AUTO:
        return llm_provider

    if model is None or len(model.strip()) == 0:
        return llm_provider

    normalized_model = model.strip().lower()
    if "deepseek" in normalized_model:
        return LLMProvider.DEEPSEEK
    if "kimi" in normalized_model or "moonshot" in normalized_model:
        return LLMProvider.KIMI
    if "glm" in normalized_model or "zhipu" in normalized_model:
        return LLMProvider.GLM
    return LLMProvider.OPENAI
