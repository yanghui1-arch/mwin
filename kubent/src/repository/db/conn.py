from collections.abc import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

# Async Session
DATABASE_URL = (
    "postgresql+asyncpg://postgres:123456@localhost:5432/aitrace"
)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    echo=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

# Sync session. (temp)
DATABASE_URL_SYNC = "postgresql://postgres:123456@localhost:5432/aitrace"
engine_sync = create_engine(
    DATABASE_URL_SYNC,
    pool_size=10,
    max_overflow=20,
    echo=True,
)

SessionLocal = sessionmaker(
    bind=engine_sync,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)