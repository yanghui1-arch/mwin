from openai import resources, Stream
from openai.types.completion_usage import CompletionUsage
from openai.types.chat import ChatCompletion, chat_completion
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk, Choice, ChoiceDelta

from mwin import track
from mwin.models import LLMProvider


def _build_chat_completion(content: str, model: str) -> ChatCompletion:
    message = chat_completion.ChatCompletionMessage(role="assistant", content=content)
    choice = chat_completion.Choice(index=0, finish_reason="stop", message=message)
    return ChatCompletion(
        id="cmpl-kimi-test",
        choices=[choice],
        created=0,
        model=model,
        object="chat.completion",
        usage=CompletionUsage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
    )


class _FakeStream(Stream):
    def __init__(self, chunks):
        self._chunks = iter(chunks)

        class _Resp:
            def close(self):
                pass

        self.response = _Resp()

    def __iter__(self):
        return self

    def __next__(self):
        return next(self._chunks)


def _build_stream_chunks() -> list[ChatCompletionChunk]:
    return [
        ChatCompletionChunk(
            id="kimi-chunk-1",
            choices=[Choice(index=0, delta=ChoiceDelta(content="hello"), finish_reason=None)],
            created=0,
            model="moonshot-v1-8k",
            object="chat.completion.chunk",
        ),
        ChatCompletionChunk(
            id="kimi-chunk-2",
            choices=[Choice(index=0, delta=ChoiceDelta(content=" kimi"), finish_reason="stop")],
            created=0,
            model="moonshot-v1-8k",
            object="chat.completion.chunk",
        ),
    ]


def test_track_kimi_chat_completions_logs_llm_step(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False, **kwargs):
        return _build_chat_completion(content="ok", model=model)

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.KIMI, system_prompt="kimi/default@1.0")
        def call_kimi():
            return resources.chat.completions.Completions.create(
                object(),
                model="moonshot-v1-8k",
                messages=[{"role": "user", "content": "hi kimi"}],
            )

        call_kimi()
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    llm_steps = [
        step for step in fake_client.steps
        if "llm_inputs" in (step.get("input") or {})
    ]
    assert len(llm_steps) == 1

    llm_inputs = llm_steps[0]["input"]["llm_inputs"]
    assert llm_inputs["model"] == "moonshot-v1-8k"
    assert llm_inputs["messages"][0]["content"] == "hi kimi"

    llm_output = llm_steps[0]["output"]["llm_outputs"]
    assert llm_output.content == "ok"

    assert llm_steps[0]["pipeline"] == "kimi"
    assert llm_steps[0]["prompt_name"] == "default"
    assert llm_steps[0]["prompt_version"] == "1.0"
    assert llm_steps[0]["llm_provider"] == LLMProvider.KIMI


def test_track_kimi_chat_completions_stream_logs_llm_step(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False, **kwargs):
        return _FakeStream(_build_stream_chunks())

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.KIMI, system_prompt="kimi/default@1.0")
        def call_kimi_stream():
            return resources.chat.completions.Completions.create(
                object(),
                model="moonshot-v1-8k",
                messages=[{"role": "user", "content": "hi kimi"}],
                stream=True,
            )

        stream = call_kimi_stream()
        list(stream)
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    llm_steps = [
        step for step in fake_client.steps
        if "llm_inputs" in (step.get("input") or {})
    ]
    assert len(llm_steps) == 1

    llm_output = llm_steps[0]["output"]["llm_outputs"]
    assert llm_output["content"] == "hello kimi"

    assert llm_steps[0]["pipeline"] == "kimi"
    assert llm_steps[0]["prompt_name"] == "default"
    assert llm_steps[0]["prompt_version"] == "1.0"
    assert llm_steps[0]["llm_provider"] == LLMProvider.KIMI


def test_kimi_not_logged_outside_tracked_call(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False, **kwargs):
        return _build_chat_completion(content="ok", model=model)

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.KIMI, system_prompt="kimi/default@1.0")
        def install_patch():
            return "ok"

        install_patch()
        step_count = len(fake_client.steps)

        resources.chat.completions.Completions.create(
            object(),
            model="moonshot-v1-8k",
            messages=[{"role": "user", "content": "hi kimi"}],
        )
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    assert len(fake_client.steps) == step_count
