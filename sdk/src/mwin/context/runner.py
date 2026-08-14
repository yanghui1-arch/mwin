"""Trace scopes and their lifecycle management."""

from collections.abc import AsyncGenerator, Generator
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime
from typing import Any

from .storage import aitrace_storage_context
from ..helper import args_helper
from .. import exporter
from ..logger import logger
from ..models.key_models import Step, Trace


def complete_step(
    step: Step,
    project_name: str | None,
    trace_output: dict[str, Any] | None,
    error_info: str | None,
) -> None:
    """Complete a tracked Step in or outside a Trace scope.

    A Step inside a Trace is added to its TraceTreeBuffer. A standalone Step
    is snapshotted and queued for background export without creating a Trace.

    Args:
        step: Completed Step model.
        project_name: Project associated with the Step.
        trace_output: Function output used to update an active Trace.
        error_info: Function error used to update an active Trace.
    """

    current_trace = aitrace_storage_context.get_current_trace()
    if current_trace is None:
        snapshot = exporter.StepSnapshot.create(
            project_name=project_name,
            step=step,
        )
        exporter.get_exporter().enqueue(snapshot)
        return

    current_trace.last_update_timestamp = datetime.now()
    if error_info is None:
        current_trace.output = trace_output
    else:
        current_trace.output = None
        current_trace.error_info = error_info

    tree_buffer = aitrace_storage_context.get_current_tree_buffer()
    if tree_buffer is not None:
        tree_buffer.set_project_name(project_name)
    aitrace_storage_context.add_completed_step(step)


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

    Args:
        name: Human-readable trace name.
        input: Input associated with the complete trace scope.
        tags: Tags associated with the trace.

    Yields:
        The trace created for this scope.
    """

    parent_trace = aitrace_storage_context.get_current_trace()
    is_root_trace = parent_trace is None
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
    trace_token = aitrace_storage_context.push_trace(trace=trace)
    error_info: str | None = None

    try:
        yield trace
    except BaseException as error:
        error_info = str(error) or type(error).__name__
        raise
    finally:
        try:
            completed_session = aitrace_storage_context.complete_trace(
                error_info=error_info
            )
            if is_root_trace and completed_session is not None:
                try:
                    tree_buffer = completed_session.tree_buffer
                    snapshot = exporter.TraceTreeSnapshot.create(
                        project_name=tree_buffer.project_name,
                        traces=tree_buffer.traces,
                        steps=tree_buffer.steps,
                    )
                    exporter.get_exporter().enqueue(snapshot)
                except Exception:
                    logger.warning(
                        "Mwin could not enqueue a completed trace tree",
                        exc_info=True,
                    )
        finally:
            aitrace_storage_context.reset_trace(trace_token)


@asynccontextmanager
async def start_trace_async(
    name: str | None = None,
    input: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> AsyncGenerator[Trace, None]:
    """Start a new asynchronous trace scope.

    Args:
        name: Human-readable trace name.
        input: Input associated with the complete trace scope.
        tags: Tags associated with the trace.

    Yields:
        The trace created for this scope.
    """

    with start_trace(name=name, input=input, tags=tags) as trace:
        yield trace
