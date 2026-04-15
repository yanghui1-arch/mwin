from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Project


async def query_project(
    db: AsyncSession,
    user_id: UUID,
    name: str,
) -> Project | None:
    
    stmt = select(Project).where(
        Project.user_uuid == user_id,
        Project.name == name,
    )
    
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def query_project_by_id(
    db: AsyncSession,
    project_id: int,
) -> Project | None:
    
    stmt = select(Project).where(
        Project.id == project_id
    )
    
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

def query_project_sync(
    db: Session,
    user_id: UUID,
    name: str,
) -> Project | None:
    stmt = select(Project).where(
        Project.user_uuid == user_id,
        Project.name == name,
    )
    
    result = db.execute(stmt)
    return result.scalar_one_or_none()