from uuid import UUID
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Numeric, Text, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from .base import Base

class Project(Base):
    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_uuid: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    avg_duration: Mapped[int] = mapped_column(Integer, default=0, server_default=text('0'), nullable=False)
    cost: Mapped[float] = mapped_column(Numeric, default=(0.00), server_default=text('0'), nullable=False)
    last_update_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    strategy: Mapped[str | None] = mapped_column(Text, nullable=True)