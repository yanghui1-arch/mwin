from openai import resources
from openai.types.completion_usage import CompletionUsage
from openai.types.chat import ChatCompletion, chat_completion
import pytest

from mwin import track
from mwin.helper.llm import provider_helper
from mwin.models import LLMProvider


def _build_chat_completion(content: str, model: str) -> ChatCompletion:
    message = chat_completion.ChatCompletionMessage(role="assistant", content=content)
    choice = chat_completion.Choice(index=0, finish_reason="stop", message=message)
    return ChatCompletion(
        id="cmpl-auto-test",
        choices=[choice],
        created=0,
        model=model,
        object="chat.completion",
        usage=CompletionUsage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
    )


@pytest.mark.parametrize(
    ("model", "expected_provider"),
    [
        ("deepseek-chat", LLMProvider.DEEPSEEK),
        ("gemini-2.5-flash", LLMProvider.OPENAI),
        ("kimi-k2.6", LLMProvider.KIMI),
        ("moonshot-v1-8k", LLMProvider.KIMI),
        ("glm-5.1", LLMProvider.GLM),
        ("gpt-4o-mini", LLMProvider.OPENAI),
    ],
)
def test_track_auto_chat_completions_resolves_provider_from_model_name(
    fake_client,
    monkeypatch,
    model,
    expected_provider,
):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False, **kwargs):
        return _build_chat_completion(content="ok", model=model)

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.AUTO, system_prompt="auto/default@1.0")
        def call_llm():
            return resources.chat.completions.Completions.create(
                object(),
                model=model,
                messages=[{"role": "user", "content": "hi"}],
            )

        call_llm()
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    llm_steps = [
        step for step in fake_client.steps
        if "llm_inputs" in (step.get("input") or {})
    ]

    assert len(llm_steps) == 1
    assert llm_steps[0]["llm_provider"] == expected_provider


@pytest.mark.parametrize(
    ("model", "expected_provider"),
    [
        ("", LLMProvider.AUTO),
        (None, LLMProvider.AUTO),
    ],
)
def test_llm_provider_resolve_auto_keeps_auto_without_model(model, expected_provider):
    assert provider_helper.resolve_llm_provider(LLMProvider.AUTO, model) == expected_provider
