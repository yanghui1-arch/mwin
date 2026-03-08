from uuid import UUID
from typing import List
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from .models import KubentChatSession

async def create_new_chat_session(
    db: AsyncSession,
    user_uuid: UUID,
    title: str | None,
    total_tokens: int | None,
) -> KubentChatSession:
    session = KubentChatSession(
        user_uuid=user_uuid,
        title=title,
        total_tokens=total_tokens,
    )
    db.add(session)
    await db.flush()
    return session

async def select_chat_session_by_id(
    db: AsyncSession,
    session_id: UUID,
) -> KubentChatSession | None:
    stmt = select(KubentChatSession).where(
        KubentChatSession.id == session_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def select_chat_session_by_user_id(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 20,
    desc: bool = True,
) -> List[KubentChatSession]:
    """Select all chat sessions with Kubent by user uuid.
    
    Args:
        db(AsyncSession): db connection
        user_id(UUID): user id
        limit(int): search limits. Default to `50`
        desc(bool): use desc with last update
    Return:
        List[KubentChatSession]: a list of chat session with Kubent.
    """
    stmt = select(KubentChatSession).where(
        KubentChatSession.user_uuid == user_id
    ).limit(limit=limit)
    if desc:
        stmt = stmt.order_by(KubentChatSession.last_update_timestamp.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def delete_chat_session(db: AsyncSession, session_id: UUID) -> UUID:
    stmt = delete(KubentChatSession).where(KubentChatSession.id == session_id).returning(KubentChatSession.id)
    result = await db.execute(stmt)
    await db.flush()
    return result.scalar_one()

async def update_chat_session_title(db: AsyncSession, session_id: UUID, title: str) -> bool:
    """Update chat session title
    
    Args:
        db(AsyncSession): db conn
        session_id(UUID): session id
        title(str): title to update
    
    Retunrs:
        True is success and False is failed.
    """
    
    stmt = (
        update(KubentChatSession)
        .where(KubentChatSession.id == session_id)
        .values(title=title)
        .returning(KubentChatSession.id)
    )

    result = await db.execute(stmt)
    update_id = result.scalar_one_or_none()
    if update_id is None:
        return False
    await db.flush()
    return True
