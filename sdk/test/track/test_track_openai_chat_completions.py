import base64

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
        id="cmpl-test",
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
            id="chunk-1",
            choices=[Choice(index=0, delta=ChoiceDelta(content="hi"), finish_reason=None)],
            created=0,
            model="gpt-4o-mini",
            object="chat.completion.chunk",
        ),
        ChatCompletionChunk(
            id="chunk-2",
            choices=[Choice(index=0, delta=ChoiceDelta(content=" there"), finish_reason="stop")],
            created=0,
            model="gpt-4o-mini",
            object="chat.completion.chunk",
        ),
    ]


def test_track_openai_chat_completions_logs_llm_step(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False, temperature=None):
        return _build_chat_completion(content="ok", model=model)

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(
            tags=["unit"],
            llm_provider=LLMProvider.OPENAI,
            llm_ignore_fields=["temperature"],
        )
        def call_llm():
            return resources.chat.completions.Completions.create(
                object(),
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "hi"}],
                temperature=0.7,
            )

        call_llm()
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    llm_steps = [
        step for step in fake_client.steps
        if "llm_inputs" in (step.get("input") or {})
    ]
    func_steps = [
        step for step in fake_client.steps
        if "func_inputs" in (step.get("input") or {})
    ]

    assert len(llm_steps) == 1
    assert len(func_steps) == 1

    llm_inputs = llm_steps[0]["input"]["llm_inputs"]
    assert llm_inputs["model"] == "gpt-4o-mini"
    assert llm_inputs["messages"][0]["content"] == "hi"
    assert "temperature" not in llm_inputs

    llm_output = llm_steps[0]["output"]["llm_outputs"]
    assert llm_output.content == "ok"


def test_track_openai_chat_completions_stream_logs_llm_step(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False):
        return _FakeStream(_build_stream_chunks())

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.OPENAI)
        def call_llm_stream():
            return resources.chat.completions.Completions.create(
                object(),
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "hi"}],
                stream=True,
            )

        stream = call_llm_stream()
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
    assert llm_output["content"] == "hi there"


def test_openai_chat_completions_not_logged_outside_tracked_call(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    def fake_create(self, *, model, messages, stream=False):
        return _build_chat_completion(content="ok", model=model)

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.OPENAI)
        def install_patch():
            return "ok"

        install_patch()
        step_count = len(fake_client.steps)

        resources.chat.completions.Completions.create(
            object(),
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "hi"}],
        )
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    assert len(fake_client.steps) == step_count


def test_track_openai_multimodal_input_uploads_data_url_in_log_copy(fake_client, monkeypatch):
    import mwin.patches.openai.completions as openai_completions

    captured_messages = None

    def fake_create(self, *, model, messages, stream=False):
        nonlocal captured_messages
        captured_messages = messages
        return _build_chat_completion(content="ok", model=model)

    monkeypatch.setattr(openai_completions, "raw_openai_create", fake_create)
    image_bytes = b"\x89PNG\r\n\x1a\ntracked-image"
    data_url = "data:image/png;base64," + base64.b64encode(image_bytes).decode()
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "describe this image"},
                {"type": "image_url", "image_url": {"url": data_url, "detail": "high"}},
            ],
        }
    ]

    original_create = resources.chat.completions.Completions.create
    original_async_create = resources.chat.completions.AsyncCompletions.create
    try:
        @track(tags=["unit"], llm_provider=LLMProvider.OPENAI)
        def call_llm():
            return resources.chat.completions.Completions.create(
                object(),
                model="gpt-4o-mini",
                messages=messages,
            )

        call_llm()
    finally:
        resources.chat.completions.Completions.create = original_create
        resources.chat.completions.AsyncCompletions.create = original_async_create

    assert captured_messages[0]["content"][1]["image_url"]["url"] == data_url
    assert fake_client.media == [{"data": image_bytes, "mime_type": "image/png"}]

    llm_step = next(
        step for step in fake_client.steps
        if "llm_inputs" in (step.get("input") or {})
    )
    logged_image = llm_step["input"]["llm_inputs"]["messages"][0]["content"][1]
    assert logged_image["image_url"]["url"] == "/api/v0/media/media-1"
    assert logged_image["image_url"]["detail"] == "high"
