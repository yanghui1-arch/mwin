import pytest

from mwin import context


class FakeClient:
    def __init__(self) -> None:
        self.steps = []
        self.traces = []

    def log_step(self, **kwargs):
        self.steps.append(kwargs)

    def log_trace(self, **kwargs):
        self.traces.append(kwargs)


@pytest.fixture
def fake_client(monkeypatch):
    client = FakeClient()

    monkeypatch.setattr(
        "mwin.client.sync_client.get_cached_sync_client",
        lambda: client,
    )

    import mwin.patches.openai.completions as openai_completions
    import mwin.patches.openai.async_completions as openai_async_completions

    monkeypatch.setattr(openai_completions, "get_cached_sync_client", lambda: client)
    monkeypatch.setattr(openai_async_completions, "get_cached_sync_client", lambda: client)

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
