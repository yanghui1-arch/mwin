from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, field_serializer
from openai.types.completion_usage import CompletionUsage
from ....helper import serialize_helper

class LogStepRequest(BaseModel):
    project_name: str
    """Project name"""

    step_name: str
    """Step name. Usually it's the functio name"""
    
    step_id: str
    """Step id"""

    trace_id: str
    """This step's trace"""

    parent_step_id: str | None
    """This step's parent id"""

    step_type: str
    """Step type"""

    tags: List[str]
    """Step tags"""

    input: Dict[str, Any] | None
    """Step function and llm input"""

    output: Any | None
    """Step function and llm output"""

    error_info: str | None
    """Step error information"""

    model: str | None
    """LLM model"""

    usage: CompletionUsage | None
    """Step token usage"""

    start_time: datetime
    """Step start time"""

    end_time: datetime | None
    """Step end time"""

    description: str | None
    """Step python docs"""

    llm_provider: str | None
    """llm inference provider"""

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