from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import StepMeta

def select_step_metadata(db: Session, step_id: UUID) -> StepMeta | None:
    """Select step metadata"""
    
    stmt = select(StepMeta).where(StepMeta.step_id == step_id)
    result = db.execute(stmt)
    return result.scalar_one_or_none()
