from uuid import UUID
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from ..jwt import verify_at_token
from ..schemas.response import ResponseModel
from ..schemas.query import QueryKubentChatSession, QueryKubentChat
from ...repository import kubent_chat_session, kubent_chat
from ...repository.db.conn import get_db
from ...repository.models.kubent_chat_session import KubentChatSession
from ...repository.models.kubent_chat import KubentChat

query_router = APIRouter(prefix="/query")

@query_router.get("/session")
async def query_session(
    user_id: UUID = Depends(verify_at_token),
    db:AsyncSession = Depends(get_db)
):
    """Get query that user chat session with Kubent"""
    try:
        chat_sessions:List[KubentChatSession] = await kubent_chat_session.select_chat_session_by_user_id(db=db, user_id=user_id)
        query_chat_sessions:List[QueryKubentChatSession] = [
            QueryKubentChatSession(
                id=session.id,
                user_uuid=session.user_uuid,
                title=session.title,
                last_update_timestamp=session.last_update_timestamp
            ) for session in chat_sessions
        ]
        return ResponseModel.success(data=query_chat_sessions)
    except Exception as exce:
        return ResponseModel.error(str(exce))
    
@query_router.get("/chats")
async def query_chats(
    session_id: str,
    user_id: UUID = Depends(verify_at_token),
    db:AsyncSession = Depends(get_db)
):
    try:
        session_id: UUID = UUID(session_id)
        kubent_chats:List[KubentChat] = await kubent_chat.select_chat(db=db, session_id=session_id)
        # Now just support return user and assistant message.
        query_chats:List[QueryKubentChat] = [
            QueryKubentChat(
                role=chat.role, 
                content=chat.payload.get("content", ""), 
                start_timestamp=chat.start_timestamp
            )
            for chat in kubent_chats if chat.role == "user" or (chat.role == "assistant" and chat.payload.get("tool_calls", None) is None)
        ]
        return ResponseModel.success(data=query_chats)
    except TypeError | ValueError as session_id_type_error:
        return ResponseModel.error(f"Invalid session id. Refuse to get chats.")
    except Exception as exce:
        return ResponseModel.error(exce)