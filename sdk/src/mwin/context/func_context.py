from contextvars import ContextVar

current_function_name_context = ContextVar("current_function_name", default=None)
