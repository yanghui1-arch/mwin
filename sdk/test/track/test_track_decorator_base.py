import asyncio

import pytest

from mwin import context, start_trace, track


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
    assert len(fake_client.traces) == 0

    step = fake_client.steps[0]
    assert step["step_name"] == "add"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == 3
    assert step["tags"] == ["unit"]
    assert step["step_type"] == "general"
    assert step["model"] == "demo-model"
    assert step["description"] == "Add numbers."
    assert step["trace_id"] is None


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
    assert len(fake_client.traces) == 0

    step = fake_client.steps[0]
    assert step["step_name"] == "test_track_inner_func_input_with_kwargs.sub"
    assert step["input"] == {"func_inputs": {"x": 1, "y": 2}}
    assert step["output"]["func_output"] == -1
    assert step["tags"] == ["unit"]
    assert step["step_type"] == "general"
    assert step["model"] == "demo-model"
    assert step["description"] == "Sub numbers."
    assert step["trace_id"] is None


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
    assert len(fake_client.traces) == 0

    step = fake_client.steps[0]
    assert step["error_info"] == "boom"
    assert step["output"]["func_output"] is None

    assert step["trace_id"] is None


def test_track_async_records_output(fake_client):
    """Test async function output is right."""

    @track(tags=["unit"])
    async def fetch():
        return "ok"

    result = asyncio.run(fetch())

    assert result == "ok"
    assert len(fake_client.steps) == 1
    assert len(fake_client.traces) == 0
    assert fake_client.steps[0]["trace_id"] is None
    assert fake_client.steps[0]["output"]["func_output"] == "ok"


def test_separate_standalone_calls_do_not_create_traces(fake_client):
    """Separate bare calls produce standalone Steps without Traces."""

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

    assert len(fake_client.traces) == 0
    assert len(fake_client.steps) == 2
    assert fake_client.steps[0]["trace_id"] is None
    assert fake_client.steps[1]["trace_id"] is None


def test_sequential_track_calls_share_explicit_root_trace(fake_client):
    """Sequential calls inside one root scope share its trace."""

    @track(tags=["unit"])
    def step(value):
        return value

    with start_trace():
        step("first")
        step("second")
        step("third")

    assert len(fake_client.steps) == 3

    # All steps share the same trace
    trace_id = fake_client.steps[0]["trace_id"]
    assert fake_client.steps[1]["trace_id"] == trace_id
    assert fake_client.steps[2]["trace_id"] == trace_id


def test_sequential_bare_calls_remain_standalone(fake_client):
    """Sequential bare calls do not introduce a Trace lifecycle."""
    @track(tags=["unit"])
    def step(value):
        return value
    step(["hello", "second"])
    step(["hello", "second", "third"])

    assert len(fake_client.traces) == 0
    assert [item["trace_id"] for item in fake_client.steps] == [None, None]


def test_nested_bare_calls_share_step_parent_without_creating_trace(fake_client):
    """Standalone nested Steps keep call structure without Trace semantics."""

    @track(tags=["unit"])
    def child():
        return "child"

    @track(tags=["unit"])
    def parent():
        return child()

    assert parent() == "child"

    child_step = next(
        step for step in fake_client.steps
        if step["step_name"].endswith(".child")
    )
    parent_step = next(
        step for step in fake_client.steps
        if step["step_name"].endswith(".parent")
    )
    assert child_step["parent_step_id"] == parent_step["step_id"]
    assert child_step["trace_id"] is None
    assert parent_step["trace_id"] is None
    assert fake_client.traces == []


def test_threadpool_executor_exports_standalone_steps(fake_client):
    """ThreadPoolExecutor reuses threads. Using copy_context().run()
    when submitting ensures each task gets an isolated context,
    so each task can maintain an independent Step stack.
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
    assert len(fake_client.traces) == 0
    assert fake_client.steps[0]["trace_id"] is None
    assert fake_client.steps[1]["trace_id"] is None
