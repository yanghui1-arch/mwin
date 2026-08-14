"""Process-level background export of completed telemetry.

The default exporter is a singleton within one Python process. It owns an
internal background thread that consumes completed TraceTree and standalone
Step snapshots and sends them to the server.

When a process forks, the child inherits a copy of the exporter object but not
its running background thread. The exporter records the PID that owns the
default instance and compares it with ``os.getpid()`` whenever the exporter is
requested. A PID change means the object came from another process, so a new
exporter and background thread are created for the current process. On systems
that support ``os.register_at_fork()``, inherited exporter and lock state are
also cleared immediately after the fork.
"""

from .telemetry import (
    Exporter,
    StepSnapshot,
    TraceTreeSnapshot,
    configure_exporter,
    get_exporter,
    shutdown_exporter,
)

__all__ = [
    "Exporter",
    "StepSnapshot",
    "TraceTreeSnapshot",
    "configure_exporter",
    "get_exporter",
    "shutdown_exporter",
]
