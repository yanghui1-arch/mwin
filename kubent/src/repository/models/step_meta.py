from typing import TypedDict
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from .base import Base

class MetaData(TypedDict):
    description: str | None

class StepMeta(Base):
    __tablename__ = "step_meta"
    step_id: Mapped[UUID] = mapped_column("id", PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    # metadata is the key attribute in Base.
    meta: Mapped[MetaData] = mapped_column("metadata", JSONB, nullable=False)
