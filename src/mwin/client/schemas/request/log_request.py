from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, field_serializer
from openai.types.completion_usage import CompletionUsage
from ....helper import serialize_helper

class LogStepRequest(BaseModel):
    project_name: str
    step_name: str
    step_id: str
    trace_id: str
    parent_step_id: str | None
    step_type: str
    tags: List[str]
    input: Dict[str, Any] | None
    output: Any | None
    error_info: str | None
    model: str | None
    usage: CompletionUsage | None
    start_time: datetime
    end_time: datetime | None
    description: str | None

    @field_serializer('input', 'output')
    def serialize_any_field(self, value: Any):
        return serialize_helper.safe_serialize(value)
    
    @field_serializer("start_time", "end_time")
    def serialize_datetime(self, value: datetime | None):
        if value is None:
            return None
        return value.strftime("%Y-%m-%d %H:%M:%S.%f")

class LogTraceRequest(BaseModel):
    project_name: str
    trace_name: str
    trace_id: str
    conversation_id: str
    tags: List[str]
    input: Dict[str, Any] | None
    output: Dict[str, Any] | None
    error_info: str | None
    start_time: datetime
    last_update_timestamp: datetime

    @field_serializer('input', 'output')
    def serialize_any_field(self, value: Any):
        return serialize_helper.safe_serialize(value)
    
    @field_serializer("start_time", "last_update_timestamp")
    def serialize_datetime(self, value: datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S.%f")