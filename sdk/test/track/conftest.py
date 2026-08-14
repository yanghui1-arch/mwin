import os

import pytest

from mwin import context
from mwin.client.config import build_client_config
from mwin.exporter import StepSnapshot, TraceTreeSnapshot
from mwin.models import LLMProvider

os.environ.setdefault("MWIN_ENABLE_TRACK_IN_TEST", "1")


class FakeClient:
    def __init__(self) -> None:
        self.steps = []
        self.traces = []
        self.media = []
        self.snapshots = []

    def log_step(self, **kwargs):
        self.steps.append(kwargs)

    def log_trace(self, **kwargs):
        self.traces.append(kwargs)

    def upload_media(self, data: bytes, mime_type: str):
        self.media.append({"data": data, "mime_type": mime_type})
        return f"/api/v0/media/media-{len(self.media)}"


class FakeExporter:
    def __init__(self, client: FakeClient) -> None:
        self.client = client
        self.snapshots = []

    def enqueue(self, snapshot) -> bool:
        self.snapshots.append(snapshot)
        self.client.snapshots.append(snapshot)
        project_name = snapshot.project_name or build_client_config(
            project_name=None,
            host_url=None,
            apikey=None,
        ).project_name
        if isinstance(snapshot, StepSnapshot):
            steps = (snapshot.step,)
            traces = ()
        elif isinstance(snapshot, TraceTreeSnapshot):
            steps = snapshot.steps
            traces = snapshot.traces
        else:
            raise TypeError(f"Unsupported snapshot: {type(snapshot)!r}")

        for step in steps:
            data = step.model_dump(mode="json")
            data["project_name"] = project_name
            data["step_name"] = data.pop("name")
            data["step_id"] = str(data.pop("id"))
            data["step_type"] = data.pop("type")
            if data["trace_id"] is not None:
                data["trace_id"] = str(data["trace_id"])
            if data["parent_step_id"] is not None:
                data["parent_step_id"] = str(data["parent_step_id"])
            data["llm_provider"] = LLMProvider(data["llm_provider"])
            self.client.steps.append(data)
        for trace in traces:
            data = trace.model_dump(mode="json")
            data["project_name"] = project_name
            data["trace_name"] = data.pop("name")
            data["trace_id"] = str(data.pop("id"))
            data["conversation_id"] = str(data["conversation_id"])
            if data["parent_trace_id"] is not None:
                data["parent_trace_id"] = str(data["parent_trace_id"])
            self.client.traces.append(data)
        return True


@pytest.fixture
def fake_client(monkeypatch):
    client = FakeClient()
    exporter = FakeExporter(client)

    monkeypatch.setattr(
        "mwin.exporter.get_exporter",
        lambda: exporter,
    )

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
