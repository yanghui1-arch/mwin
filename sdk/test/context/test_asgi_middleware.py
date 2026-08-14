import asyncio

from mwin import context
from mwin.integrations import MwinTraceMiddleware


class CapturingExporter:
    def __init__(self):
        self.snapshots = []

    def enqueue(self, snapshot):
        self.snapshots.append(snapshot)
        return True


def test_asgi_middleware_finishes_after_streaming_app_returns(monkeypatch):
    exporter = CapturingExporter()
    monkeypatch.setattr(
        "mwin.exporter.get_exporter",
        lambda: exporter,
    )
    trace_was_active_after_last_chunk = False

    async def app(scope, receive, send):
        nonlocal trace_was_active_after_last_chunk
        await send({"type": "http.response.start", "status": 200})
        await send({"type": "http.response.body", "body": b"one", "more_body": True})
        await send({"type": "http.response.body", "body": b"two", "more_body": False})
        trace_was_active_after_last_chunk = (
            context.get_storage_current_trace_data() is not None
        )

    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request", "body": b""}

    middleware = MwinTraceMiddleware(app)
    asyncio.run(middleware(
        {
            "type": "http",
            "method": "GET",
            "path": "/stream",
            "query_string": b"page=1",
        },
        receive,
        send,
    ))

    assert trace_was_active_after_last_chunk is True
    assert context.get_storage_current_trace_data() is None
    assert len(sent) == 3
    assert len(exporter.snapshots) == 1
    snapshot = exporter.snapshots[0]
    assert snapshot.traces[0].name == "GET /stream"
    assert snapshot.traces[0].input == {
        "method": "GET",
        "path": "/stream",
        "query_string": "page=1",
    }
