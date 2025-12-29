import inspect
from typing import Callable, Tuple, Dict, Any

def parse_to_dict_input(
    func: Callable,
    args: Tuple,
    kwargs: Dict[str, Any]
) -> Dict[str, Any]:
    """parse args and kwargs to a dict type input
    
    Args:
        args(Tuple): arguments tuple. args tuple maybe empty.
        kwargs(Dict[str, Any]): keyword arguemnts. kwargs dict maybe empty.
    
    Returns:
        Dict[str, Any]: input with dict type
    """
    
    sig = inspect.signature(func)
    
    # Create binding of arguments to parameters
    bound_args = sig.bind(*args, **kwargs)
    bound_args.apply_defaults()
    if "self" in bound_args.arguments.keys():
        del bound_args.arguments["self"]
    
    return dict(bound_args.arguments)

def get_call_name(func: Callable, args: tuple) -> str:
    """Get decorated method name in details.
    Return 'Class.method' or 'method'. Instance method should be 'Class.method' format-string and general function is 'method'.

    Args:
        func(Callable): decorated function
        args(tuple): arguments of function
    """

    method_name = func.__name__

    # instance method
    if args:
        first = args[0]
        if hasattr(first, "__class__"):
            cls = first.__class__
            if cls.__module__ != "builtins":
                return f"{cls.__name__}.{method_name}"

    # fallback to qualname
    qualname = getattr(func, "__qualname__", "")
    if "." in qualname:
        class_name = qualname.split(".")[0]
        return f"{class_name}.{method_name}"

    return method_name
