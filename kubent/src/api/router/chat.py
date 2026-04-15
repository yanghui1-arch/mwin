import asyncio
import threading
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from celery import states as celery_task_states
from celery.result import AsyncResult
from openai.types.chat import ChatCompletionMessageParam
from mwin import start_trace
from src.repository import (
    trace,
    project,
    kubent_chat,
    kubent_chat_session,
)
from src.repository.models import (
    Project,
    KubentChatSession,
    KubentChat,
)
from src.repository.db.conn import get_db, AsyncSession
from src.repository.redis.conn import get_redis_client
from src.api.schemas import ChatRequest, ChatSessionResponse, ChatSessionTitleRequest, DeleteChatSessionRequest, ResponseModel
from src.api.jwt import verify_at_token
from src.service import chat
from src.agent.runner import run_with_callback, add_chat, AgentEventType, SSEEvent
from src.agent.kubent import Kubent
from src.agent.runtime import execution_scope
from src.api.guard import AgentCapacityGuard

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
    "/delete_session",
    description="Delete a chat session and its messages.",
)
async def delete_chat_session(
    req: DeleteChatSessionRequest,
    user_id: UUID = Depends(verify_at_token),
    db: AsyncSession = Depends(get_db),
):
    try:
        session_id = UUID(req.session_id)
        chat_session: KubentChatSession | None = await kubent_chat_session.select_chat_session_by_id(db=db, session_id=session_id)
        if not chat_session:
            return ResponseModel.error(message="Not existing session id.")
        if chat_session.user_uuid != user_id:
            return ResponseModel.error(message=f"No authentication to access {session_id}")
        await kubent_chat.delete_chats_by_session_id(db=db, session_id=session_id)
        await kubent_chat_session.delete_chat_session(db=db, session_id=session_id)
        await db.commit()
        return ResponseModel.success(data=None)
    except ValueError:
        return ResponseModel.error(message="Failed to parse session id.")

@chat_router.post(
    "/optimize/stream",
    description="Chat with Kubent to optimize the agent system. Streams progress via SSE.",
)
async def optimize_agent_system_stream(
    req: ChatRequest,
    request: Request,
    user_id: UUID = Depends(verify_at_token),
    db: AsyncSession = Depends(get_db),
):
    guard: AgentCapacityGuard = request.app.state.agent_guard
    if not await guard.acquire():
        return ResponseModel.error(message="Server is at capacity. Please try again later.")

    message: str = req.message
    chat_hist: List[ChatCompletionMessageParam] | None = None
    project_name: str = ""

    if not req.session_id:
        chat_session: KubentChatSession = await kubent_chat_session.create_new_chat_session(
            db=db,
            user_uuid=user_id,
            title=None,
            total_tokens=None,
        )
        session_id = chat_session.id
    else:
        session_id = UUID(req.session_id)
        chats: List[KubentChat] = await kubent_chat.select_chat(db=db, session_id=session_id)
        chat_hist = [c.payload for c in chats]

    if req.project_id:
        redis_client = get_redis_client()
        target_trace_id: List[str] = redis_client.lrange(f"optimize-trace-{str(user_id)}", 0, -1)
        if len(target_trace_id) != 0:
            traces_id: List[UUID] = [UUID(trace_id) for trace_id in target_trace_id]
        else:
            traces_id: List[UUID] = await trace.select_latest_traces_id_by_project_id(db=db, project_id=req.project_id)
            if len(traces_id):
                redis_client.rpush(f"optimize-trace-{str(user_id)}", *[str(t_id) for t_id in traces_id])
                redis_client.expire(f"optimize-trace-{str(user_id)}", 600)

        selected_project: Project | None = await project.query_project_by_id(db=db, project_id=req.project_id)

        if not selected_project:
            return ResponseModel.error(message=f"Invalid project id: {req.project_id}")

        project_name = selected_project.name

    # Commit before holding the connection open for streaming.
    await db.commit()

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    cancel = threading.Event()

    def on_progress(event: SSEEvent):
        # Guard: stop filling the queue once the client has disconnected.
        if not cancel.is_set():
            asyncio.run_coroutine_threadsafe(queue.put(event), loop)

    def run_agent():
        try:
            with execution_scope(session_id=session_id, user_id=user_id, project_name=project_name, agent_name="kubent"), start_trace():
                kubent_agent = Kubent()

                result = run_with_callback(
                    on_progress=on_progress,
                    cancel=cancel,
                    kubent=kubent_agent,
                    question=message,
                )
                add_chat(session_id=session_id, user_id=user_id, messages=result.chats, agent_name="kubent")
                on_progress(SSEEvent(type=AgentEventType.DONE, answer=result.answer))
        except Exception as e:
            on_progress(SSEEvent(type=AgentEventType.ERROR, detail=str(e)))

    loop.run_in_executor(request.app.state.agent_executor, run_agent)

    async def event_generator():
        try:
            while True:
                event: SSEEvent = await queue.get()
                yield f"data: {event.model_dump_json()}\n\n"
                if event.type in (AgentEventType.DONE, AgentEventType.ERROR):
                    break
        finally:
            # Signals the agent thread to stop at the next step boundary 
            # and prevents the queue from growing unboundedly.
            cancel.set()
            await guard.release()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
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