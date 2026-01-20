import asyncio

import pytest

from mwin import track
from mwin.models import StepType


def test_track_sync_records_input_output_and_trace(fake_client):
    @track(tags=["unit"], step_type=StepType.CUSTOMIZED, model="demo-model")
    def add(x, y=2):
        """Add numbers."""
        return x + y

    result = add(1)

    assert result == 3
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1

    step = fake_client.steps[0]
    assert step["step_name"] == "add"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == 3
    assert step["tags"] == ["unit"]
    assert step["step_type"] == StepType.CUSTOMIZED
    assert step["model"] == "demo-model"
    assert step["description"] == "Add numbers."

    trace = fake_client.traces[0]
    assert trace["output"] == {"func_output": 3}


def test_track_class_method_uses_instance_qualname(fake_client):
    class Demo:
        @track(tags=["unit"])
        def ping(self, value):
            return value

    Demo().ping("ok")

    step = fake_client.steps[0]
    assert step["step_name"] == "Demo().ping"


def test_track_exception_is_logged_and_raised(fake_client):
    @track(tags=["unit"])
    def boom():
        raise ValueError("boom")

    with pytest.raises(ValueError):
        boom()

    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1

    step = fake_client.steps[0]
    assert step["error_info"] == "boom"
    assert step["output"]["func_output"] is None

    trace = fake_client.traces[0]
    assert trace["error_info"] == "boom"
    assert trace["output"] is None


def test_track_async_records_output(fake_client):
    @track(tags=["unit"])
    async def fetch():
        return "ok"

    result = asyncio.run(fetch())

    assert result == "ok"
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1
    assert fake_client.steps[0]["output"]["func_output"] == "ok"
