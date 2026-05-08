import os

import pytest

from mwin import context
from mwin.helper.llm import provider_helper

os.environ.setdefault("MWIN_ENABLE_TRACK_IN_TEST", "1")


class FakeClient:
    def __init__(self) -> None:
        self.steps = []
        self.traces = []

    def log_step(self, **kwargs):
        kwargs["llm_provider"] = provider_helper.resolve_llm_provider(
            kwargs["llm_provider"],
            kwargs.get("model"),
        )
        self.steps.append(kwargs)

    def log_trace(self, **kwargs):
        self.traces.append(kwargs)


@pytest.fixture
def fake_client(monkeypatch):
    client = FakeClient()

    monkeypatch.setattr(
        "mwin.client.sync_client.get_cached_sync_client",
        lambda **kwargs: client,
    )

    import mwin.patches.openai.completions as openai_completions
    import mwin.patches.openai.async_completions as openai_async_completions

    monkeypatch.setattr(openai_completions, "get_cached_sync_client", lambda **kwargs: client)
    monkeypatch.setattr(openai_async_completions, "get_cached_sync_client", lambda **kwargs: client)

    return client


@pytest.fixture(autouse=True)
def clean_context():
    while context.pop_storage_step() is not None:
        pass
    context.pop_storage_trace()

    yield

    while context.pop_storage_step() is not None:
        pass
    context.pop_storage_trace()
