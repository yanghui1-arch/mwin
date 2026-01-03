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

async def query_chat(
    db: AsyncSession,
    session_id: UUID | None = None,
    user_id: UUID | None = None,
    agent_name: str | None = None,
    limit: int | None = None,
    start_time_desc: bool = False,
) -> List[KubentChat]:
    """Query chat
    
    Args:
        db(AsyncSession): db connection.
        session_id(UUID | None): chat session id. Default to None.
        user_id(UUID | None): user uuid. Default to None.
        agent_name(str | None): agent name. Default to None.
        limit(int | None): limit search chats. Default to None.
        start_time_desc(bool): whether order by start_timestamp by desc. Default to False.
    
    Returns:
        A list of chats. 
    """
    
    conditions = []

    if session_id:
        conditions.append(KubentChat.session_uuid == session_id)
    if user_id:
        conditions.append(KubentChat.user_uuid == user_id)
    if agent_name:
        conditions.append(KubentChat.agent_name == agent_name)
    if not conditions and limit is None:
        raise ValueError("Query chat arguments are all none. Passing a select condition.")
    
    stmt = select(KubentChat).where(*conditions)
    if start_time_desc is True:
        stmt = stmt.order_by(KubentChat.start_timestamp.desc())

    if limit is not None:
        stmt = stmt.limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()