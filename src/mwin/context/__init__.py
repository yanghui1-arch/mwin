from .storage import aitrace_storage_context
from .runner import start_trace, start_trace_async

__all__ = [
    "start_trace",
    "start_trace_async",
    "add_storage_step",
    "pop_storage_step",
    "set_storage_trace",
    "pop_storage_trace",
    "get_storage_top_step_data",
    "get_storage_current_trace_data",
]

add_storage_step  = aitrace_storage_context.add_step
pop_storage_step  = aitrace_storage_context.pop_step
set_storage_trace = aitrace_storage_context.set_trace
pop_storage_trace = aitrace_storage_context.pop_trace

get_storage_top_step_data       = aitrace_storage_context.get_top_step
get_storage_current_trace_data  = aitrace_storage_context.get_current_trace
