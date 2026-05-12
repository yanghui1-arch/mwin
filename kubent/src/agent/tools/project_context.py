import json
from typing import Callable

from mwin import StepType, track
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam
from pydantic import BaseModel, Field

from .toolkits import Tool
from ...repository import project, trace
from ...repository.db.conn import SessionLocal


@track(step_type=StepType.TOOL)
def load_project_context(project_name: str, trace_count: int = 3) -> str:
    with SessionLocal() as db:
        selected_project = project.query_project_by_name_sync(db=db, name=project_name)
        if not selected_project:
            return f"Invalid project name: {project_name}"

        latest_traces = trace.select_latest_traces_by_project_id_sync(
            db=db,
            project_id=selected_project.id,
            counts=trace_count,
        )

    lines = [
        f"project_id: {selected_project.id}",
        f"project_name: {selected_project.name}",
        f"project_description: {selected_project.description or 'Not provided'}",
        f"project_strategy: {selected_project.strategy or 'Not provided'}",
        f"project_avg_duration: {selected_project.avg_duration if selected_project.avg_duration is not None else 'Not provided'}",
        f"project_cost: {selected_project.cost if selected_project.cost is not None else 'Not provided'}",
        f"latest_trace_count: {len(latest_traces)}",
    ]

    for index, trace_item in enumerate(latest_traces, start=1):
        lines.append(f"trace_{index}_id: {trace_item.id}")
        lines.append(f"trace_{index}_name: {trace_item.name or 'Unknown'}")
        lines.append(f"trace_{index}_tags: {json.dumps(trace_item.tags, ensure_ascii=False, default=str) if trace_item.tags is not None else 'None'}")
        lines.append(f"trace_{index}_error_info: {trace_item.error_info or 'None'}")
        lines.append(f"trace_{index}_input: {json.dumps(trace_item.input, ensure_ascii=False, default=str) if trace_item.input is not None else 'None'}")
        lines.append(f"trace_{index}_output: {json.dumps(trace_item.output, ensure_ascii=False, default=str) if trace_item.output is not None else 'None'}")

    return "\n".join(lines)


class ProjectContextParams(BaseModel):
    project_name: str = Field(..., description="Project name in Kubent database.")
    trace_count: int = Field(default=3, ge=1, description="How many latest traces to load.")


class ProjectContext(Tool):
    func: Callable = load_project_context
    type: str = "query"
    json_schema: ChatCompletionFunctionToolParam = pydantic_function_tool(
        ProjectContextParams,
        name="load_project_context",
        description="Load real business data for a project, including project metadata and latest traces.",
    )
