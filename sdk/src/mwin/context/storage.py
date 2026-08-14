from contextvars import ContextVar, Token
from dataclasses import replace

from ..models.key_models import Step, Trace
from .session import TraceSession, TraceTreeBuffer


TraceSessionStack = tuple[TraceSession, ...]
StandaloneStepStack = tuple[Step, ...]


class AITraceStorageContext:
    """Store a task-local stack of trace sessions."""

    def __init__(self):
        self._sessions: ContextVar[TraceSessionStack] = ContextVar(
            "trace_sessions",
            default=tuple(),
        )
        self._standalone_steps: ContextVar[StandaloneStepStack] = ContextVar(
            "standalone_steps",
            default=tuple(),
        )

    def push_trace(self, trace: Trace) -> Token[TraceSessionStack]:
        """Push a new trace session, sharing its parent's tree buffer.

        Args:
            trace: Trace owned by the new session.

        Returns:
            Context token used to restore the previous session stack.
        """

        sessions = self._sessions.get()
        tree_buffer = (
            sessions[-1].tree_buffer
            if sessions
            else TraceTreeBuffer()
        )
        session = TraceSession.start(trace=trace, tree_buffer=tree_buffer)
        return self._sessions.set(sessions + (session,))

    def complete_trace(
        self,
        error_info: str | None = None,
    ) -> TraceSession | None:
        """Finalize the active trace session without removing its scope.

        Args:
            error_info: Unhandled error captured while exiting the trace scope.

        Returns:
            Completed session, or ``None`` when no session is active.
        """

        sessions = self._sessions.get()
        if not sessions:
            return None

        completed_session = sessions[-1].complete(error_info=error_info)
        self._sessions.set(sessions[:-1] + (completed_session,))
        return completed_session

    def get_current_session(self) -> TraceSession | None:
        """Return the active trace session.

        Returns:
            Active session, or ``None`` when no trace scope exists.
        """

        sessions = self._sessions.get()
        return sessions[-1] if sessions else None

    def get_current_tree_buffer(self) -> TraceTreeBuffer | None:
        """Return the root buffer shared by the active trace tree.

        Returns:
            Active root trace-tree buffer, or ``None`` when no session exists.
        """

        session = self.get_current_session()
        return session.tree_buffer if session is not None else None

    def add_step(self, new_step: Step) -> None:
        """Push a step onto the active trace's local step stack.

        Args:
            new_step: Step entering the tracked calling stack.

        When no Trace session is active, the Step is stored in the standalone
        Step stack instead.
        """

        sessions = self._sessions.get()
        if not sessions:
            standalone_steps = self._standalone_steps.get()
            self._standalone_steps.set(standalone_steps + (new_step,))
            return

        current_session = sessions[-1]
        current_session.tree_buffer.add_step(new_step)
        self._sessions.set(
            sessions[:-1] + (current_session.push_step(new_step),)
        )

    def pop_step(self) -> Step | None:
        """Pop the active trace's top step.

        Returns:
            Removed step, or ``None`` when no step is active.
        """

        sessions = self._sessions.get()
        if not sessions:
            standalone_steps = self._standalone_steps.get()
            if not standalone_steps:
                return None
            self._standalone_steps.set(standalone_steps[:-1])
            return standalone_steps[-1]

        updated_session, step = sessions[-1].pop_step()
        self._sessions.set(sessions[:-1] + (updated_session,))
        return step

    def get_top_step(self) -> Step | None:
        """Return the active trace's top step without removing it.

        Returns:
            Active top step, or ``None`` when the step stack is empty.
        """

        session = self.get_current_session()
        if session is None:
            standalone_steps = self._standalone_steps.get()
            return standalone_steps[-1] if standalone_steps else None
        if not session.step_stack:
            return None
        return session.step_stack[-1]

    def add_completed_step(self, step: Step) -> None:
        """Add a finalized step to the active trace tree buffer.

        Args:
            step: Finalized step data.

        Raises:
            RuntimeError: If no trace session is active.
        """

        tree_buffer = self.get_current_tree_buffer()
        if tree_buffer is None:
            raise RuntimeError(
                "Cannot record a completed step without an active trace session."
            )
        tree_buffer.complete_step(step)

    def set_trace(self, current_trace: Trace | None) -> Token[TraceSessionStack]:
        """Compatibility setter for callers outside ``start_trace``.

        Updating the active trace keeps its session. Setting a different trace
        starts a new standalone root session. ``start_trace`` uses
        :meth:`push_trace` for hierarchical scopes.

        Args:
            current_trace: Trace to make active, or ``None`` to clear all
                sessions.

        Returns:
            Context token used to restore the previous session stack.
        """

        sessions = self._sessions.get()
        if current_trace is None:
            return self._sessions.set(tuple())

        if sessions and str(sessions[-1].trace.id) == str(current_trace.id):
            current_session = sessions[-1]
            current_session.tree_buffer.add_trace(current_trace)
            updated_session = replace(current_session, trace=current_trace)
            return self._sessions.set(sessions[:-1] + (updated_session,))

        session = TraceSession.start(trace=current_trace)
        return self._sessions.set((session,))

    def pop_trace(self) -> Trace | None:
        """Clear the current trace-session stack.

        Returns:
            Previously active trace, or ``None`` when no session existed.
        """

        session = self.get_current_session()
        self._sessions.set(tuple())
        return session.trace if session is not None else None

    def get_current_trace(self) -> Trace | None:
        """Return the active trace data.

        Returns:
            Active trace, or ``None`` when no session exists.
        """

        session = self.get_current_session()
        return session.trace if session is not None else None

    def reset_trace(self, token: Token[TraceSessionStack]) -> None:
        """Restore a previously captured session stack.

        Args:
            token: Token returned by ``push_trace`` or ``set_trace``.
        """

        self._sessions.reset(token)

    def clear(self) -> None:
        """Clear all Trace sessions and standalone Steps in this context."""

        self._sessions.set(tuple())
        self._standalone_steps.set(tuple())


aitrace_storage_context = AITraceStorageContext()
