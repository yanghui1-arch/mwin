from dataclasses import dataclass, field, replace
from datetime import datetime
from typing import Literal
from uuid import UUID

from ..models.key_models import Step, Trace


TraceStatus = Literal["active", "completed", "failed"]
StepStatus = Literal["active", "completed"]


@dataclass(slots=True)
class _TraceRecord:
    """Trace data and its lifecycle status, keyed by normalized trace ID."""

    trace: Trace
    status: TraceStatus = "active"


@dataclass(slots=True)
class _StepRecord:
    """Step data and its lifecycle status, keyed by normalized step ID."""

    step: Step
    status: StepStatus = "active"


@dataclass(slots=True, eq=False)
class TraceTreeBuffer:
    """Collect data and lifecycle state for one complete trace tree.

    Trace and step records are keyed by their string-normalized IDs. Keeping
    each model beside its status prevents separate maps from drifting apart.
    """

    _trace_records: dict[str, _TraceRecord] = field(
        default_factory=dict,
        init=False,
    )
    """Trace records the key is the trace id"""

    _step_records: dict[str, _StepRecord] = field(
        default_factory=dict,
        init=False,
    )
    """Step records the key is the step id"""

    _project_name: str | None = field(default=None, init=False, repr=False)


    @property
    def traces(self) -> tuple[Trace, ...]:
        """Return traces in parent-before-child registration order.

        Returns:
            Traces registered in this tree buffer.
        """

        return tuple(record.trace for record in self._trace_records.values())

    @property
    def steps(self) -> tuple[Step, ...]:
        """Return steps in parent-before-child registration order.

        Returns:
            Steps registered in this tree buffer.
        """

        return tuple(record.step for record in self._step_records.values())

    @property
    def project_name(self) -> str | None:
        return self._project_name

    @property
    def is_complete(self) -> bool:
        """Check whether every registered trace and step has finished.

        Returns:
            ``True`` when the complete trace tree is ready for export.
        """

        traces_complete = bool(self._trace_records) and all(
            record.status != "active"
            for record in self._trace_records.values()
        )
        steps_complete = all(
            record.status == "completed"
            for record in self._step_records.values()
        )
        return traces_complete and steps_complete

    def add_trace(self, trace: Trace) -> None:
        """Register or update a trace without changing its original order.

        Args:
            trace: Trace to register or update.
        """

        trace_id = str(trace.id)
        record = self._trace_records.get(trace_id)
        if record is None:
            self._trace_records[trace_id] = _TraceRecord(trace=trace)
        else:
            record.trace = trace

    def add_step(self, step: Step) -> None:
        """Register or update a step without changing its original order.

        Args:
            step: Step to register or update.
        """

        step_id = str(step.id)
        record = self._step_records.get(step_id)
        if record is None:
            self._step_records[step_id] = _StepRecord(step=step)
        else:
            record.step = step

    def complete_step(self, step: Step) -> None:
        """Update and mark a registered step as completed.

        Args:
            step: Finalized step data.
        """

        step_id = str(step.id)
        record = self._step_records.get(step_id)
        if record is None:
            self._step_records[step_id] = _StepRecord(
                step=step,
                status="completed",
            )
        else:
            record.step = step
            record.status = "completed"

    def complete_trace(
        self,
        trace: Trace,
        status: Literal["completed", "failed"],
    ) -> None:
        """Mark a registered trace as completed or failed.

        Args:
            trace: Finalized trace data.
            status: Final lifecycle status of the trace.
        """

        trace_id = str(trace.id)
        record = self._trace_records.get(trace_id)
        if record is None:
            self._trace_records[trace_id] = _TraceRecord(
                trace=trace,
                status=status,
            )
        else:
            record.trace = trace
            record.status = status

    def set_project_name(self, project_name: str | None) -> None:
        """Remember the project selected by the first tracked step."""

        if project_name is None:
            return
        if self._project_name is None:
            self._project_name = project_name

    def get_trace_status(
        self,
        trace_id: str | UUID | int,
    ) -> TraceStatus | None:
        """Return the lifecycle status for a trace ID.

        Args:
            trace_id: Stable trace ID.

        Returns:
            Current trace status, or ``None`` when the trace is not registered.
        """

        record = self._trace_records.get(str(trace_id))
        return record.status if record is not None else None

    def get_step_status(
        self,
        step_id: str | UUID | int,
    ) -> StepStatus | None:
        """Return the lifecycle status for a step ID.

        Args:
            step_id: Stable step ID.

        Returns:
            Current step status, or ``None`` when the step is not registered.
        """

        record = self._step_records.get(str(step_id))
        return record.status if record is not None else None


@dataclass(frozen=True, slots=True)
class TraceSession:
    """Own the runtime state of one trace scope.

    A session binds the scope's trace to its trace-local active-step stack,
    lifecycle status, and the tree buffer shared with its parent and child
    sessions. The storage context keeps sessions in a stack so its top session
    always identifies the currently active trace.

    Attributes:
        trace: Trace represented by this scope.
        tree_buffer: Collector shared by every session in the root trace tree.
        step_stack: Active nested steps belonging only to this trace.
        status: Lifecycle state of this trace scope.

    The session itself is immutable: stack and status transitions return a new
    session. The referenced trace model and shared tree buffer remain mutable
    so finalized data is visible to every session in the tree.
    """

    trace: Trace
    tree_buffer: TraceTreeBuffer
    step_stack: tuple[Step, ...] = tuple()
    status: TraceStatus = "active"

    @classmethod
    def start(
        cls,
        trace: Trace,
        tree_buffer: TraceTreeBuffer | None = None,
    ) -> "TraceSession":
        """Create an active session and register its trace.

        Args:
            trace: Trace owned by the new session.
            tree_buffer: Root trace-tree buffer. A new buffer is created when
                this is a root session.

        Returns:
            An active trace session.
        """

        if tree_buffer is None:
            tree_buffer = TraceTreeBuffer()
        tree_buffer.add_trace(trace)
        return cls(trace=trace, tree_buffer=tree_buffer)

    def push_step(self, step: Step) -> "TraceSession":
        """Return this session with a new active step on its local stack.

        Args:
            step: Step entering the trace-local calling stack.

        Returns:
            A copy of the session containing the updated stack.
        """

        return replace(self, step_stack=self.step_stack + (step,))

    def pop_step(self) -> tuple["TraceSession", Step | None]:
        """Remove the top step from this session.

        Returns:
            A tuple containing the updated session and removed step. The step
            is ``None`` when the stack is empty.
        """

        if not self.step_stack:
            return self, None
        return replace(self, step_stack=self.step_stack[:-1]), self.step_stack[-1]

    def complete(self, error_info: str | None = None) -> "TraceSession":
        """Finalize this trace and update its tree buffer.

        Args:
            error_info: Unhandled error captured while exiting the trace scope.

        Returns:
            A copy of the session with its final lifecycle status.
        """

        if error_info is not None:
            self.trace.error_info = error_info
        self.trace.last_update_timestamp = datetime.now()

        status: Literal["completed", "failed"] = (
            "failed"
            if self.trace.error_info is not None
            else "completed"
        )
        self.tree_buffer.complete_trace(self.trace, status)
        return replace(self, status=status)
