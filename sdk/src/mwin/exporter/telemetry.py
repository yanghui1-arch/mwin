"""Implementation of process-level telemetry exporting."""

from __future__ import annotations

import atexit
import os
import threading
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from queue import Full, Queue

from ..client import sync_client
from ..logger import logger
from ..models import Step, Trace


@dataclass(frozen=True, slots=True)
class TraceTreeSnapshot:
    """An immutable snapshot of one completed trace tree.

    Trace and step models are copied before the snapshot enters the exporter
    queue. The HTTP client remains responsible for constructing request DTOs.
    """

    project_name: str | None
    traces: tuple[Trace, ...]
    steps: tuple[Step, ...]

    @classmethod
    def create(
        cls,
        project_name: str | None,
        traces: Sequence[Trace],
        steps: Sequence[Step],
    ) -> "TraceTreeSnapshot":
        """Create an independent snapshot of a completed trace tree.

        Args:
            project_name: Project associated with the completed trace tree, or
                ``None`` to use the HTTP client's configured project.
            traces: Traces belonging to the completed trace tree.
            steps: Steps belonging to the completed trace tree.

        Returns:
            A snapshot containing copies of the supplied traces and steps.
        """

        trace_data = [trace.model_dump(mode="json") for trace in traces]
        step_data = [step.model_dump(mode="json") for step in steps]
        return cls(
            project_name=project_name,
            traces=tuple(Trace.model_validate(trace) for trace in trace_data),
            steps=tuple(Step.model_validate(step) for step in step_data),
        )


@dataclass(frozen=True, slots=True)
class StepSnapshot:
    """An immutable snapshot of one completed standalone Step."""

    project_name: str | None
    step: Step

    @classmethod
    def create(
        cls,
        project_name: str | None,
        step: Step,
    ) -> "StepSnapshot":
        """Create an independent snapshot of a standalone Step.

        Args:
            project_name: Project associated with the Step, or ``None`` to
                use the HTTP client's configured project.
            step: Completed standalone Step to copy.

        Returns:
            A snapshot containing a copy of the supplied Step.
        """

        step_data = step.model_dump(mode="json")
        return cls(
            project_name=project_name,
            step=Step.model_validate(step_data),
        )


TelemetrySnapshot = TraceTreeSnapshot | StepSnapshot
TelemetrySender = Callable[[TelemetrySnapshot], None]

def _telemetry_sender(
    snapshot: TelemetrySnapshot,
) -> None:
    """Send one telemetry snapshot through the synchronous HTTP client.

    Args:
        snapshot: Completed TraceTree or standalone Step snapshot to send.

    Raises:
        RuntimeError: If the server or network response reports an export
            failure.
    """

    client = sync_client.get_cached_sync_client()
    if isinstance(snapshot, TraceTreeSnapshot):
        response = client.log_trace_tree(snapshot)
    else:
        response = client.log_step(snapshot)
    if response.server_error_info is not None:
        raise RuntimeError(response.server_error_info)


class Exporter:
    """Exports completed telemetry from a process-level shared object.

    The default ``Exporter`` returned by :func:`get_exporter` is shared by all
    application threads in
    the current Python process. It owns one internal background thread, which
    consumes completed TraceTree or standalone Step snapshots one at a time
    and sends them to the server. Application threads only enqueue snapshots
    and do not perform the HTTP request themselves.

    Each Python process has its own default exporter, queue, and background
    thread. An exporter and its thread are never shared between processes.

    Args:
        max_queue_size: Maximum number of telemetry snapshots waiting in the
            queue. When full, a newly submitted snapshot is dropped instead
            of blocking the application thread.
        sender: Function called by the background thread to send one
            telemetry snapshot. When omitted, the synchronous HTTP client
            sends TraceTrees to ``/log/trace_tree`` and standalone Steps to
            ``/log/step``.
    """

    def __init__(
        self,
        *,
        max_queue_size: int = 2048,
        sender: TelemetrySender | None = None,
    ) -> None:

        self.max_queue_size = max_queue_size

        self._sender = sender or _telemetry_sender
        self._queue: Queue[TelemetrySnapshot | None] = Queue(
            maxsize=max_queue_size,
        )
        self._lock = threading.Lock()
        self._consumer_thread: threading.Thread | None = None
        self._running = False
        self._stopping = False
        self._stop_signal_enqueued = False
        self._dropped_snapshots = 0
        self._export_failures = 0
        self._last_drop_warning_at = 0.0

    @property
    def dropped_snapshots(self) -> int:
        with self._lock:
            return self._dropped_snapshots

    @property
    def export_failures(self) -> int:
        with self._lock:
            return self._export_failures

    @property
    def is_running(self) -> bool:
        with self._lock:
            return self._running and not self._stopping

    def start(self) -> None:
        """Start the single background consumer thread.

        Calling this method more than once while the exporter is running has
        no effect.

        Raises:
            RuntimeError: If the exporter has already started shutting down.
        """

        with self._lock:
            if self._running:
                return
            if self._stopping:
                raise RuntimeError(
                    "A stopped Exporter cannot be restarted"
                )
            self._consumer_thread = threading.Thread(
                target=self._run,
                name="mwin-telemetry-consumer",
                daemon=True,
            )
            self._running = True
            try:
                self._consumer_thread.start()
            except Exception:
                self._consumer_thread = None
                self._running = False
                raise

    def enqueue(self, snapshot: TelemetrySnapshot) -> bool:
        """Add a snapshot without blocking the calling application.

        The lifecycle owner must call :meth:`start` before enqueueing. The
        process-level exporter returned by :func:`get_exporter` is
        already started.

        Args:
            snapshot: Completed telemetry snapshot to add to the export queue.

        Returns:
            ``True`` when the snapshot is accepted. ``False`` when the
            exporter is not running, is stopping, or its queue is full.
        """

        now = time.monotonic()
        with self._lock:
            if not self._running or self._stopping:
                self._record_drop_locked(now)
                return False

            try:
                self._queue.put_nowait(snapshot)
            except Full:
                self._record_drop_locked(now)
                return False
            return True

    def _record_drop_locked(self, now: float) -> None:
        """Record a dropped snapshot while the exporter lock is held.

        The caller must hold ``self._lock``. This method also rate-limits the
        queue overflow warning to at most once per minute.

        Args:
            now: Current value from ``time.monotonic()`` in seconds.
        """

        self._dropped_snapshots += 1
        if now - self._last_drop_warning_at >= 60:
            self._last_drop_warning_at = now
            logger.warning(
                "Mwin telemetry exporter is unavailable or its queue is full; "
                "dropping the newest telemetry snapshot (dropped=%d)",
                self._dropped_snapshots,
            )

    def close(self, timeout: float | None = None) -> bool:
        """Drain queued snapshots and stop the background consumer thread.

        Args:
            timeout: Maximum number of seconds to wait for the consumer
                thread. ``None`` waits without a timeout.

        Returns:
            ``True`` if the consumer thread is stopped before the timeout, or
            if it was never started. ``False`` if the timeout expires or this
            method is called from the consumer thread itself.
        """

        deadline = None if timeout is None else time.monotonic() + timeout
        with self._lock:
            if not self._running:
                self._stopping = True
                return True
            self._stopping = True
            consumer_thread = self._consumer_thread
            if not self._stop_signal_enqueued:
                try:
                    # None is the stop signal
                    self._queue.put_nowait(None)
                except Full:
                    pass
                else:
                    self._stop_signal_enqueued = True

        if consumer_thread is threading.current_thread():
            return False
        remaining = (
            None
            if deadline is None
            else max(0.0, deadline - time.monotonic())
        )
        consumer_thread.join(remaining)
        return not consumer_thread.is_alive()

    def _run(self) -> None:
        """Consume and export snapshots until the exporter is stopped.

        This method is the target of the single background consumer thread.
        Sender failures are recorded and do not stop later snapshots from
        being consumed.
        """

        try:
            while True:
                snapshot = self._queue.get()
                # None is the stop signal
                if snapshot is None:
                    self._queue.task_done()
                    return

                try:
                    self._sender(snapshot)
                except Exception:
                    with self._lock:
                        self._export_failures += 1
                    logger.warning(
                        "Mwin failed to export a telemetry snapshot",
                        exc_info=True,
                    )
                finally:
                    self._queue.task_done()
                    with self._lock:
                        should_stop = (
                            self._stopping and self._queue.empty()
                        )

                if should_stop:
                    return
        finally:
            with self._lock:
                self._running = False


__exporter: Exporter | None = None
__exporter_pid: int | None = None
__exporter_lock = threading.Lock()
__exporter_options = {
    "max_queue_size": 1024,
}


def configure_exporter(
    *,
    max_queue_size: int = 2048,
) -> None:
    """Configure the default exporter before it is first used.

    This function stores configuration only; it does not start a thread. That
    makes it safe to call before the current process forks.

    Args:
        max_queue_size: Maximum number of telemetry snapshots waiting for the
            background consumer.

    Raises:
        RuntimeError: If the default exporter has already been created.
    """

    global __exporter_options
    options = {
        "max_queue_size": max_queue_size,
    }
    with __exporter_lock:
        if __exporter is not None:
            raise RuntimeError(
                "The default Exporter is already running; configure "
                "it before tracing starts"
            )
        __exporter_options = options


def get_exporter() -> Exporter:
    """Return the started default exporter for the current process.

    A new exporter is created when no default exists or when the recorded PID
    differs from the current PID.

    Returns:
        The sole started default exporter owned by the current process.
    """

    global __exporter, __exporter_pid
    current_pid = os.getpid()
    with __exporter_lock:
        if (
            __exporter is None
            or __exporter_pid != current_pid
        ):
            __exporter = Exporter(**__exporter_options)
            __exporter_pid = current_pid
            __exporter.start()
        return __exporter


def shutdown_exporter(timeout: float | None = None) -> bool:
    """Drain and stop the default exporter owned by the current process.

    Args:
        timeout: Maximum number of seconds to wait for the consumer thread.
            ``None`` waits without a timeout.

    Returns:
        ``True`` if no current-process exporter exists or it stops before the
        timeout. ``False`` otherwise.
    """

    global __exporter, __exporter_pid
    current_pid = os.getpid()
    with __exporter_lock:
        exporter = (
            __exporter
            if __exporter_pid == current_pid
            else None
        )
        __exporter = None
        __exporter_pid = None
    if exporter is None:
        return True
    return exporter.close(timeout=timeout)


def _reset_telemetry_exporter_after_fork() -> None:
    """Discard default exporter state inherited from the parent process.

    The inherited lock is replaced instead of acquired because another parent
    thread may have held it when the process forked.
    """

    global __exporter, __exporter_pid, __exporter_lock
    __exporter = None
    __exporter_pid = None
    __exporter_lock = threading.Lock()


if hasattr(os, "register_at_fork"):
    os.register_at_fork(after_in_child=_reset_telemetry_exporter_after_fork)


atexit.register(shutdown_exporter, 10.0)
