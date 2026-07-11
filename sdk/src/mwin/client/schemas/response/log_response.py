from typing import Dict
from pydantic import BaseModel

class LogStepResponse(BaseModel):
    status_code: int
    status_desc: str
    json_content: Dict
    server_error_info: str | None = None


class LogTraceResponse(BaseModel):
    status_code: int
    status_desc: str
    json_content: Dict
    server_error_info: str | None = None