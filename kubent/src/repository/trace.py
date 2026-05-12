from typing import List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from .models import Trace


async def select_latest_traces_id_by_project_id(db: AsyncSession, project_id: int, counts: int = 1) -> List[UUID]:
    """Select latest traces id by project id.
    Default to search one trace.

    Args:
        db(AsyncSession): db conn
        project_id(int): project id
        counts(int): search counts
    
    Returns:
        A list of trace uuid
    """
    
    stmt = select(Trace.id).where(Trace.project_id == project_id).order_by(Trace.last_update_timestamp.desc()).limit(counts)
    result = await db.execute(stmt)
    return result.scalars().all()


async def select_latest_traces_by_project_id(db: AsyncSession, project_id: int, counts: int = 1) -> List[Trace]:
    stmt = (
        select(Trace)
        .where(Trace.project_id == project_id)
        .order_by(Trace.last_update_timestamp.desc())
        .limit(counts)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


def select_latest_traces_by_project_id_sync(db: Session, project_id: int, counts: int = 1) -> List[Trace]:
    stmt = (
        select(Trace)
        .where(Trace.project_id == project_id)
        .order_by(Trace.last_update_timestamp.desc())
        .limit(counts)
    )
    result = db.execute(stmt)
    return result.scalars().all()
