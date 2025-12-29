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
    qualname = getattr(func, "__qualname__", "")

    if "." in qualname:
        owner = qualname.split(".", 1)[0]
        if args:
            first = args[0]
            # instance method
            if hasattr(first, "__class__") and first.__class__.__name__ == owner:
                return f"{owner}().{method_name}"
            # classmethod or static method
            return f"{owner}.{method_name}"
    # general method
    return method_name
