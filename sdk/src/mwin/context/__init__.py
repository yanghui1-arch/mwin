from .storage import aitrace_storage_context
from .runner import start_trace, start_trace_async
from .session import TraceSession, TraceTreeBuffer

__all__ = [
    "start_trace",
    "start_trace_async",
    "TraceSession",
    "TraceTreeBuffer",
    "add_storage_step",
    "add_storage_completed_step",
    "pop_storage_step",
    "set_storage_trace",
    "pop_storage_trace",
    "get_storage_top_step_data",
    "get_storage_current_trace_data",
    "get_storage_current_trace_session",
    "get_storage_current_trace_tree_buffer",
]

add_storage_step = aitrace_storage_context.add_step
add_storage_completed_step = aitrace_storage_context.add_completed_step
pop_storage_step = aitrace_storage_context.pop_step
set_storage_trace = aitrace_storage_context.set_trace
pop_storage_trace = aitrace_storage_context.pop_trace

get_storage_top_step_data = aitrace_storage_context.get_top_step
get_storage_current_trace_data = aitrace_storage_context.get_current_trace
get_storage_current_trace_session = aitrace_storage_context.get_current_session
get_storage_current_trace_tree_buffer = (
    aitrace_storage_context.get_current_tree_buffer
)
