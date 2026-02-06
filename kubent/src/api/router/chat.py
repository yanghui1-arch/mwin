from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from celery import states as celery_task_states
from celery.result import AsyncResult
from openai.types.chat import ChatCompletionMessageParam
from src.repository import (
    step,
    trace,
    project,
    kubent_chat,
    kubent_chat_session,
)
from src.repository.models import (
    Step,
    Project,
    KubentChatSession,
    KubentChat,
)
from src.repository.db.conn import get_db, AsyncSession
from src.api.schemas import ChatRequest, ChatResponse, ChatSessionResponse, ChatSessionTitleRequest, ChatTaskResponse, ResponseModel
from src.api.jwt import verify_at_token
from src.service import chat
from src.utils import mermaid
from src.kubent_celery.celery_app import celery_app
from src.kubent_celery.tasks import kubent_run, KubentRequestArgs, KubentResponse, TaskProgress

chat_router = APIRouter(prefix="/chat", tags=["Chat"])

@chat_router.post(
    "/create_chat_session",
    description="Create a new chat session.",
    response_model=ResponseModel[ChatSessionResponse],
)
async def create_new_chat_session(
    user_id: UUID = Depends(verify_at_token),
    db:AsyncSession = Depends(get_db)
):
    chat_session:KubentChatSession = await kubent_chat_session.create_new_chat_session(
        db=db, 
        user_uuid=user_id,
        title=None, 
        total_tokens=None
    )
    await db.commit()
    return ResponseModel.success(data=ChatSessionResponse(id=chat_session.id, user_uuid=user_id, title=chat_session.title, last_update_timestamp=chat_session.last_update_timestamp))

@chat_router.post(
    "/optimize", 
    description="Chat with Kubent to optimize the agent system.", 
    response_model=ResponseModel[ChatResponse],
)
async def optimize_agent_system(
    req:ChatRequest,
    user_id: UUID = Depends(verify_at_token),
    db:AsyncSession = Depends(get_db)
):
    message:str = req.message
    chat_hist:List[ChatCompletionMessageParam]|None = None
    if not req.session_id:
        chat_session:KubentChatSession = await kubent_chat_session.create_new_chat_session(
            db=db, 
            user_uuid=user_id,
            title=None, 
            total_tokens=None
        )
        session_id = chat_session.id
    else:
        session_id = UUID(req.session_id)
        chats:List[KubentChat] = await kubent_chat.select_chat(db=db, session_id=session_id)
        chat_hist = [chat.payload for chat in chats]

    if req.project_id:
        # Get some project's traces and then push them to kubent to analyze.
        traces_id: List[UUID] = await trace.select_latest_traces_id_by_project_id(db=db, project_id=req.project_id)
        steps_in_traces: List[List[Step]] = [await step.select_steps_by_trace_id(db=db, trace_id=trace_id) for trace_id in traces_id]
        exec_graphs: List[str] = [str(mermaid.steps_to_mermaid(steps=steps)) for steps in steps_in_traces]
        selected_project: Project | None = await project.query_project_by_id(db=db, project_id=req.project_id)

        if not selected_project:
            return ResponseModel.error(message=f"Invalid project id: {req.project_id}")

    task_id = kubent_run.delay(
        KubentRequestArgs(
            question=message,
            chat_hist=chat_hist,
            agent_workflows=exec_graphs,
            session_id=str(session_id),
            user_id=str(user_id),
            project_name=selected_project.name
        )
    )
    
    # In the last commit db to ensure atomicity.
    await db.commit()
    return ResponseModel.success(data=ChatResponse(task_id=str(task_id)))

@chat_router.post(
    "/query_optimize_result",
    description="Get the Kubent optimized suggestions.", 
    response_model=ResponseModel[ChatTaskResponse],
)
async def query_optimize_task_result(
    task_id: str,
    # verify
    user_id: UUID = Depends(verify_at_token),
):
    res = AsyncResult(task_id, app=celery_app)
    task_return_value = None
    exception_traceback = None
    progress_info = None
    if res.state == celery_task_states.SUCCESS:
        result: KubentResponse = res.result
        task_return_value = result["message"]
        
    elif res.state == "PROGRESS":
        progress_info:TaskProgress = res.info

    elif res.state == celery_task_states.FAILURE:
        exception_traceback = res.traceback
    
    status = res.state
    return ResponseModel[ChatTaskResponse].success(
        data=ChatTaskResponse(
            status=status,
            content=task_return_value,
            exception_traceback=exception_traceback,
            progress_info=progress_info,
        )
    )

    
@chat_router.post(
    "/title", 
    description="Set title for this chat session", 
    response_model=ResponseModel[str],
)
async def summary_title(
    req: ChatSessionTitleRequest,
    user_id: UUID = Depends(verify_at_token),
    db:AsyncSession = Depends(get_db)
):
    try:
        session_id = UUID(req.session_id)
        chat_session: KubentChatSession | None = await kubent_chat_session.select_chat_session_by_id(db=db, session_id=session_id)
        if not chat_session:
            return ResponseModel.error(message="Not existing session id.")
        if chat_session.user_uuid != user_id:
            return ResponseModel.error(message=f"No authentication to access {session_id}")
        if chat_session.title is None:
            title: str = chat.title(message=req.message)
            success: bool = await kubent_chat_session.update_chat_session_title(db=db, session_id=session_id, title=title)
            if not success:
                raise Exception("Fail to get chat session title.")
            await db.commit()
        return ResponseModel.success(data=chat_session.title)
    except ValueError as ve:
        return ResponseModel.error(message="Failed to parse session id.")
    except Exception as exce:
        return ResponseModel.error(message=exce)