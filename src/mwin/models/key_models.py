from uuid import UUID
from enum import Enum
from datetime import datetime
from typing import Any, Dict, List
from pydantic import BaseModel, Field, field_serializer
from openai.types.completion_usage import CompletionUsage
from ..helper import serialize_helper

class StepType(Enum):
    CUSTOMIZED = 'customized'
    LLM_RESPONSE = 'llm_response'
    RETRIEVE = 'retrieve'
    TOOL = 'tool'

class Step(BaseModel):
    name: str
    id: str | UUID
    trace_id: str | UUID
    parent_step_id: str | UUID | None = None
    type: StepType = StepType.CUSTOMIZED
    tags: List[str] = Field(default_factory=list)
    input: Dict[str, Any] | None = None
    output: Dict[str, Any] | None = None
    error_info: str | None = None
    model: str | None = None
    usage: CompletionUsage | None = None
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: datetime | None = None

    @field_serializer('input', 'output')
    def serialize_any_field(self, value: Any):
        return serialize_helper.safe_serialize(value)
    
    @field_serializer("start_time", "end_time")
    def serialize_datetime(self, value: datetime | None):
        if value is None:
            return None
        return value.strftime("%Y-%m-%d %H:%M:%S")

class Trace(BaseModel):
    id: str | UUID | int
    conversation_id: str | UUID
    name: str
    tags: List[str] = Field(default_factory=list)
    input: Dict[str, Any] | None = None
    output: Any | None = None
    error_info: str | None = None
    start_time: datetime = Field(default_factory=datetime.now)
    last_update_timestamp: datetime = Field(default_factory=datetime.now)

    @field_serializer('input', 'output')
    def serialize_any_field(self, value: Any):
        return serialize_helper.safe_serialize(value)
    
    @field_serializer("start_time", "last_update_timestamp")
    def serialize_datetime(self, value: datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")

class Conversation(BaseModel):
    id: str | UUID
    name: str
    traces: List[Trace]
    start_time: datetime
    last_update_time: datetime
    tags: List[str] = Field(default_factory=list)
