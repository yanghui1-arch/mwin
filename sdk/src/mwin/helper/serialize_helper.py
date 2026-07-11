from typing import Any
from pydantic import BaseModel
from openai import Stream, AsyncStream

def safe_serialize(obj: Any) -> Any:
    """safe serialize all customized classes.
    If obj is a subclass of pydantic.BaseModel it will return BaseModel instance method `.model_dump()`
    which means obj's all fields should be serializable. In other words, if obj includes a not serializable
    field such as customized class, not a subclass of pydantic.BaseModel, the obj should have a method 
    decorated with @pydantic.field_serializer() to make it serializable while calling `.model_dump()`.
    This function is mostly used in the situation.

    For example:
    ```python
    class Myclass:
        def __init__(self, x):
            self.x = x

    # my_class is not serializable.
    # Should have a @pydantic.field_serializer() function
    class YourClass(BaseModel):
        y: int = 2
        my_class: Myclass = Myclass(1)

        @field_serializer('my_class')
        def safe_serializer(self, value:Any):
            # use here
            return serialize_helper.safe_serialize(value)
    ```

    Args:
        obj(Any): any type data or class

    Returns:
        Any: obj or data after being safely searialized 
    """

    # None
    if obj is None:
        return None
    
    # basic type
    if isinstance(obj, (str, int, float, bool)):
        return obj
    
    # pydantic
    if isinstance(obj, BaseModel):
        return obj.model_dump()
    
    if isinstance(obj, AsyncStream):
        return str(obj)

    if isinstance(obj, Stream):
        return str(obj)
    
    # dict
    if isinstance(obj, dict):
        return {k: safe_serialize(v) for k, v in obj.items()}
    
    # list or tuple
    if isinstance(obj, (list, tuple)):
        return [safe_serialize(item) for item in obj]
    
    # customized class with `__dict__` function
    if hasattr(obj, '__dict__') and obj.__dict__:
        return safe_serialize(obj.__dict__)
    
    # other information
    try:
        return str(obj)
    except:
        return f'<CAN NOT SERIALIZED TYPE: {type(obj).__name__}>'