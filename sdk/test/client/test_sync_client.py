import json
from datetime import datetime
from uuid import uuid4

import httpx
import pytest

from mwin.client.sync_client import SyncClient
from mwin.exporter import StepSnapshot, TraceTreeSnapshot
from mwin.models import Step, Trace


@pytest.mark.parametrize(
    ("parent_trace_id", "pass_parent_trace_id"),
    [(str(uuid4()), True), (None, True), (None, False)],
)
def test_log_trace_sends_parent_trace_id(parent_trace_id, pass_parent_trace_id):
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
        trace_kwargs = {
            "parent_trace_id": parent_trace_id,
        } if pass_parent_trace_id else {}
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
            **trace_kwargs,
        )
    finally:
        client._client.close()

    assert captured_json is not None
    assert captured_json["parent_trace_id"] == parent_trace_id


def test_log_trace_tree_constructs_request_from_snapshot():
    captured_path = None
    captured_json = None
    component = {
        "traces": [
            {
                "project_name": "demo",
                "trace_name": "request",
                "trace_id": "trace-1",
                "parent_trace_id": None,
                "conversation_id": "conversation-1",
                "tags": [],
                "input": {"prompt": "你好"},
                "output": {"answer": "world"},
                "error_info": None,
                "start_time": "2026-07-24 10:00:00.000000",
                "last_update_timestamp": "2026-07-24 10:00:01.000000",
            }
        ],
        "steps": [],
    }
    snapshot = TraceTreeSnapshot.create(
        project_name="demo",
        traces=(
            Trace(
                id="trace-1",
                conversation_id="conversation-1",
                name="request",
                tags=[],
                input={"prompt": "你好"},
                output={"answer": "world"},
                start_time=datetime(2026, 7, 24, 10, 0, 0),
                last_update_timestamp=datetime(2026, 7, 24, 10, 0, 1),
            ),
        ),
        steps=(),
    )

    def handle_request(request: httpx.Request) -> httpx.Response:
        nonlocal captured_path, captured_json
        captured_path = request.url.path
        captured_json = json.loads(request.content)
        return httpx.Response(200, json={"data": {"accepted": 1}})

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
        response = client.log_trace_tree(snapshot)
    finally:
        client._client.close()

    assert response.status_code == 200
    assert captured_path == "/log/trace_tree"
    assert captured_json == component


def test_log_step_sends_standalone_step_without_trace_id():
    captured_path = None
    captured_json = None
    snapshot = StepSnapshot.create(
        project_name="demo",
        step=Step(
            name="standalone",
            id="step-1",
            trace_id=None,
            input={"prompt": "hello"},
            output={"answer": "world"},
        ),
    )

    def handle_request(request: httpx.Request) -> httpx.Response:
        nonlocal captured_path, captured_json
        captured_path = request.url.path
        captured_json = json.loads(request.content)
        return httpx.Response(200, json={"data": "step-1"})

    client = SyncClient(
        project_name="fallback",
        host_url="https://mwin.test",
        apikey="test-key",
    )
    client._client.close()
    client._client = httpx.Client(
        base_url="https://mwin.test",
        transport=httpx.MockTransport(handle_request),
    )

    try:
        response = client.log_step(snapshot)
    finally:
        client._client.close()

    assert response.status_code == 200
    assert captured_path == "/log/step"
    assert captured_json["project_name"] == "demo"
    assert captured_json["step_id"] == "step-1"
    assert captured_json["trace_id"] is None
