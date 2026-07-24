"""Trace scope is defined by start_trace and start_trace_async.

Memory leak and unexpected step's trace caused by `@track` appears without start_trace or start_trace_async.
In `@track` it doesn't release reference of `current_trace` in context. It causes memory leak.<br/>
Meanwhile setting `current_trace` contextvar in a thread doesn't make sense expecailly for those reusable threads.


@track can work but still has potential memory leak in a small backend, scripts, asyncio event loop without start_trace and start_trace_async.
If not use start_trace and start_trace_async, caller must follow a strict rule that no `current_trace` in context before thread submit work.
For example in a fastapi project and use thread executor not default one. To follow above strict rule, it is a must thing to do that
use `contextvars.copy_context()` and make sure no `current_trace` in the current context.
```python
@router.post("/foo")
async def foo():
    loop = asyncio.get_running_loop()
    pool_executor = ThreadPoolExecutor(max_workers=10)
    ctx = contextvars.copy_context()
    loop.run_in_executor(pool_executor, ctx.run, run_agent)
```

It works well at beginning of project but not recommend it for developer. it's very complex and difficult to maintain.
Please use following demo to develop with mwin. It's more safe, easier and more controllable.

```python
from mwin import track
from mwin.runner import start_trace
@track()
def call_openai() -> Dict:
    ...

@track(step_type="tool")
def execute_bash(*args, **kwargs)
    ...

@router.post("/foo")
async def foo():
    with start_trace():
        parsed_result = call_openai()
        bash_res = execute_bash(**parsed_result)
```
"""

from collections.abc import AsyncGenerator, Generator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

from .storage import aitrace_storage_context
from ..helper import args_helper
from ..models.key_models import Trace

@contextmanager
def start_trace(
    name: str | None = None,
    input: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> Generator[Trace, None, None]:
    """Start a new trace scope.

    Every scope creates a trace. If another trace is active, the new trace is
    its child and shares its conversation. Each trace also gets an independent
    step stack so step parent relationships never cross trace boundaries.
    """

    parent_trace = aitrace_storage_context.get_current_trace()
    trace = args_helper.create_new_trace(
        input=input,
        name=name,
        tags=tags,
        conversation_id=(
            parent_trace.conversation_id
            if parent_trace is not None
            else None
        ),
        parent_trace_id=(
            parent_trace.id
            if parent_trace is not None
            else None
        ),
    )
    trace_token = aitrace_storage_context.set_trace(current_trace=trace)
    steps_token = aitrace_storage_context.set_steps()

    try:
        yield trace
    finally:
        try:
            aitrace_storage_context.reset_steps(steps_token)
        finally:
            aitrace_storage_context.reset_trace(trace_token)


@asynccontextmanager
async def start_trace_async(
    name: str | None = None,
    input: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> AsyncGenerator[Trace, None]:
    """Async context-manager variant of :func:`start_trace`."""

    with start_trace(name=name, input=input, tags=tags) as trace:
        yield trace
