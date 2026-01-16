from typing import Callable, Literal, List
from uuid import UUID
from pydantic import BaseModel, Field
from openai import pydantic_function_tool, OpenAI
from openai.types.chat import ChatCompletionFunctionToolParam
from .toolkits import Tool
from ...repository.models import Step, StepMeta
from ...repository.db.conn import SessionLocal
from ...repository.step_meta import select_step_metadata

system_prompt = """You are a best programer and good at explaining a function input and output.
You will recieve a function input and output.
Sometimes user will give you llm input and ouptut in the same time if calling LLM inner the function.

# Your Job
Explain what function's input and output is with some words as less as you can. The answer length will
not exceed 400 tokens.

# Recieve data json schema
You will recieve two data. One is input another is output.
## Input
Input consists of `llm_inputs` and `func_inputs`. Previous is pass to llm and the later is pass to function.
## Output
Output consists of `llm_outputs` and `func_outputs`. Previous is llm response and the later is function's return value.

# Rules
Sometime the inputs and outputs are so long. So user will cut the previous part and make sure the length of input and output
doesn't exceed 40K words. 
1. It's forbidden to talk nonsense about something that doesn't exist.
2. If you find inputs and outputs are cut, first explain (Do your job), then tell user one of them are cut.
"""

class StepOverview(BaseModel):
    name: str
    """Step name"""

    status: Literal["success", "failed"]
    """Step is error or right"""

    reports: str
    """A summary of step inputs and outputs."""

    description: str | None = None
    """Step description since mwin0.1.6"""

    error_info: str | None = None
    """Step error information"""

    llm_model: str | None = None
    """LLM model name in the step calling."""

def _build_overview(overview: StepOverview):
    name = overview.name
    status = overview.status
    error_info = overview.error_info if overview.error_info else ""
    description = overview.description if overview.description else ""
    model = overview.llm_model

    if status == "failed":
        return f"""
        # {name}
        {description}
        # Execute status
        It is failed to execute. The error information is:
        ```
        {error_info}
        ```
        """
    else:
        result = f"""
        # {name}
        {description}
        ## Input and output report
        {overview["reports"]}\n
        """

        if model:
            result = result + f"## LLM Model used\n{model}"
        return result

def _step_overview(openai_client: OpenAI, step: Step, step_meta: StepMeta | None) -> str:

    status = "success" if step.error_info is None else "failed"
    overview = StepOverview(
        name=step.name, 
        status=status,
        error_info=step.error_info,
        llm_model=step.model,
    )
    
    if step_meta:
        if step_meta.meta["description"]:
            overview.description = step_meta.meta["description"]
    
    step_inputs = str(step.input) if step.input else None
    step_outputs = str(step.output) if step.output else None
    
    llm_model = "qwen/qwen3-4b:free"
    if step_inputs or step_outputs:
        # Model best context is about 40K.
        # Keep inputs and outputs are both less 20K tokens.
        step_inputs = step_inputs if len(step_inputs) < 20 * 1000 else step_inputs[-20*1000: ]
        step_outputs = step_outputs if len(step_outputs) < 20 * 1000 else step_outputs[-20*1000: ]
        cut = False
        if len(step_inputs) + len(step_outputs) >= 40 * 1000:
            cut = True
        usr_content = f"# Function inputs\n\n{step_inputs} \n\n# Function outputs\n\n{step_outputs}"
        if cut:
            usr_content = "Due to inputs and outputs are exceed 40K. I cut it.\n" + usr_content

        try:
            completion = openai_client.chat.completions.create(
                model=llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": usr_content}
                ]
            )
            overview.reports = completion.choices[0].message.content
        except Exception as e:
            overview.reports = "The inputs and outputs are both too long to analyze."
    
    return _build_overview(overview=overview)

def query_step(step_ids: List[str]) -> str:
    overview_step_info: List[str] = []
    openai_cli = OpenAI()
    try:
        for step_id in step_ids:
            with SessionLocal() as db:
                step_uuid = UUID(step_id)
                query_step_stmt = db.query(Step).where(Step.id == step_uuid)
                result = db.execute(query_step_stmt)
                step: Step | None = result.scalar_one_or_none()
                if step is None:
                    raise ValueError(f"{step_id}")
                step_meta: StepMeta | None = select_step_metadata(db=db, step_id=step_id)
                overview = _step_overview(openai_client=openai_cli, step=step, step_meta=step_meta)
                overview_step_info.append(overview)
            
        return "\n\n".join(overview_step_info)
    except ValueError as ve:
        # VE is step id here.
        overview_step_info.append(f"Step[{str(ve)}] doesn't exist in database. You pass an invalid step id.")
        return "\n\n".join(overview_step_info)
    

class QueryStepParams(BaseModel):
    step_ids: List[str] = Field(..., description="Step ids to query. It's invalid to pass an empty list.")
    
class QueryStep(Tool):
    func:Callable = query_step
    type:str = "search"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        QueryStepParams,
        name="query_step",
        description="""Query step information such as what the step does, its inputs and outputs.
        When you want to check the step information in overview you can call this tool.
        """
    )
