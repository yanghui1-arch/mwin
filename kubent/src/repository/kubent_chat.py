from typing import Dict, List, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import KubentChat

async def create_new_chat(
    db: AsyncSession,
    session_id:UUID,
    user_id:UUID,
    role:str,
    payload:Dict[str, Any],
    agent_name: str,
):
    chat = KubentChat(session_uuid=session_id, user_uuid=user_id, role=role, payload=payload, agent_name=agent_name)
    db.add(chat)
    await db.flush()
    return chat

async def select_chat(db: AsyncSession, session_id: UUID) -> List[KubentChat]:
    stmt = select(KubentChat).where(
        KubentChat.session_uuid == session_id
    )
    result = await db.execute(stmt)
    return result.scalars().all()
