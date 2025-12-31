from typing import Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy import String, DateTime, Text, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from .base import Base

class KubentChat(Base):
    __tablename__ = "kubent_chat"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_uuid: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    user_uuid: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    start_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
