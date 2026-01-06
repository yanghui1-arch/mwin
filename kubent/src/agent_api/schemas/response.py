from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class ResponseModel(BaseModel, Generic[T]):
    code: int = 0
    message: str = "ok"
    data: T | None = None

    @classmethod
    def success(cls, data: T, message: str | None = None):
        if not message:
            message = "Success"
        return cls(code=200, message=message, data=data)
    
    @classmethod
    def error(cls, message: str):
        return cls(code=400, message=message)
    