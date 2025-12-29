from typing import Callable, Literal, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam
from .toolkits import Tool
from ...repository.models import Step
from ...repository.db.conn import SessionLocal

def io(step_id: str) -> Dict[Literal["input", "output"], Dict[str, Any]]:
    with SessionLocal() as db:
        step_uuid = UUID(step_id)
        stmt = db.query(Step).where(Step.id == step_uuid)
        result = db.execute(stmt)
        step: Step | None = result.scalar_one_or_none()
        if step is None:
            raise ValueError(f"Step id [{step_id}] is not existed in database.")
        return {
            "input": step.input,
            "output": step.output,
        }

class QueryStepIOParams(BaseModel):
    step_id: str = Field(..., description="Step id to query its input and output.")
    
class QueryStepInputAndOutput(Tool):
    func:Callable = io
    type:str = "search"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        QueryStepIOParams,
        name="query_step_input_and_output", 
        description="""Query step input and its output.
        The input includes two parts. One is step function recieves. Another is llm recieves if llm is used in the step.
        The output also includes two parts. One is step function returns/outputs which is used for other steps. Another is llm outputs which is generated in the step.
        """
    )
