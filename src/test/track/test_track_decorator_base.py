import asyncio

import pytest

from mwin import context, track


@track(tags=["unit"], step_type="general", model="demo-model")
def add(x, y=2):
    """Add numbers."""
    return x + y

class Demo:
    @track(tags=["unit"])
    def ping(self, value):
        return value


def test_track_sync(fake_client):
    """Test general function decorated by track."""

    result = add(1)

    assert result == 3
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1

    step = fake_client.steps[0]
    assert step["step_name"] == "add"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == 3
    assert step["tags"] == ["unit"]
    assert step["step_type"] == "general"
    assert step["model"] == "demo-model"
    assert step["description"] == "Add numbers."

    trace = fake_client.traces[0]
    assert trace["output"] == {"func_output": 3}


def test_track_inner_func_input_with_kwargs(fake_client):
    """Test inner function decorated by track
    The inner function inputs has args or kwargs.
    """

    @track(tags=["unit"], step_type="general", model="demo-model")
    def sub(x, y=2):
        """Sub numbers."""
        return x - y

    result = sub(1)

    assert result == -1
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1

    print(fake_client.steps)

    step = fake_client.steps[0]
    assert step["step_name"] == "test_track_inner_func_input_with_kwargs.sub"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == -1
    assert step["tags"] == ["unit"]
    assert step["step_type"] == "general"
    assert step["model"] == "demo-model"
    assert step["description"] == "Sub numbers."

    trace = fake_client.traces[0]
    assert trace["output"] == {"func_output": -1}


def test_track_inner_func_without_args(fake_client):
    """Test inner function decorated by track without args."""

    @track(tags=["unit"])
    def add():
        return 1

    result = add()

    assert result == 1
    assert len(fake_client.steps) == 1

    step = fake_client.steps[0]
    assert step["step_name"] == "test_track_inner_func_without_args.add"


def test_track_class_method_uses_instance_qualname(fake_client):
    """Test general customized class function which is decorated by track."""
    Demo().ping("ok")

    step = fake_client.steps[0]
    assert step["step_name"] == "Demo().ping"


def test_track_exception_is_logged_and_raised(fake_client):
    """Track inner function , which is decorated by track, raise an error."""

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
    """Test async function output is right."""

    @track(tags=["unit"])
    async def fetch():
        return "ok"

    result = asyncio.run(fetch())

    assert result == "ok"
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 1
    assert fake_client.steps[0]["output"]["func_output"] == "ok"


def test_two_requests_have_different_traces(fake_client):
    """Two separate HTTP requests should produce two different traces."""

    @track(tags=["unit"])
    def handle_request(value):
        return value

    # First request
    handle_request("first")

    # Simulate context reset between HTTP requests
    while context.pop_storage_step() is not None:
        pass
    context.pop_storage_trace()

    # Second request
    handle_request("second")

    assert len(fake_client.traces) == 2
    assert len(fake_client.steps) == 2


    # Two traces should have different trace IDs
    assert fake_client.traces[0]["trace_id"] != fake_client.traces[1]["trace_id"]

    # Each step should reference its own trace
    assert fake_client.steps[0]["trace_id"] == fake_client.traces[0]["trace_id"]
    assert fake_client.steps[1]["trace_id"] == fake_client.traces[1]["trace_id"]


def test_sequential_track_calls_share_trace(fake_client):
    """Sequential @track calls from an untracked parent share one trace.

    This is the core design: one execution chain = one trace.
    All @track functions within the same chain (thread context)
    belong to the same interaction.
    """

    @track(tags=["unit"])
    def step(value):
        return value

    step("first")
    step("second")
    step("third")

    assert len(fake_client.steps) == 3

    # All steps share the same trace
    trace_id = fake_client.steps[0]["trace_id"]
    assert fake_client.steps[1]["trace_id"] == trace_id
    assert fake_client.steps[2]["trace_id"] == trace_id


def test_threadpool_executor_isolates_traces_with_copy_context(fake_client):
    """ThreadPoolExecutor reuses threads. Using copy_context().run()
    when submitting ensures each task gets an isolated context,
    so different tasks get different traces.
    """
    import contextvars
    from concurrent.futures import ThreadPoolExecutor

    @track(tags=["unit"])
    def handle():
        return "ok"

    with ThreadPoolExecutor(max_workers=1) as pool:
        ctx1 = contextvars.copy_context()
        pool.submit(ctx1.run, handle).result()
        ctx2 = contextvars.copy_context()
        pool.submit(ctx2.run, handle).result()

    assert len(fake_client.steps) == 2
    assert fake_client.steps[0]["trace_id"] != fake_client.steps[1]["trace_id"]
