import json
from datetime import datetime
from uuid import uuid4

import httpx
import pytest

from mwin.client.sync_client import SyncClient


@pytest.mark.parametrize("parent_trace_id", [str(uuid4()), None])
def test_log_trace_sends_parent_trace_id(parent_trace_id):
    captured_json = None

    def handle_request(request: httpx.Request) -> httpx.Response:
        nonlocal captured_json
        captured_json = json.loads(request.content)
        return httpx.Response(200, json={"data": "trace-id"})

    client = SyncClient(
        project_name="demo",
        host_url="https://mwin.test",
        apikey="test-key",
    )
    client._client.close()
    client._client = httpx.Client(
        base_url="https://mwin.test",
        transport=httpx.MockTransport(handle_request),
    )

    try:
        client.log_trace(
            trace_name="child-trace",
            trace_id=str(uuid4()),
            conversation_id=str(uuid4()),
            tags=[],
            input={"prompt": "hello"},
            output={"answer": "world"},
            error_info=None,
            start_time=datetime(2026, 7, 24, 10, 0, 0),
            last_update_timestamp=datetime(2026, 7, 24, 10, 0, 1),
            parent_trace_id=parent_trace_id,
        )
    finally:
        client._client.close()

    assert captured_json is not None
    assert captured_json["parent_trace_id"] == parent_trace_id
