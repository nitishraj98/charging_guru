"""Async database engines and session factories (primary + read replica)."""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

_primary_engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)
_replica_engine: AsyncEngine = create_async_engine(
    settings.replica_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionFactory = async_sessionmaker(_primary_engine, expire_on_commit=False)
ReplicaSessionFactory = async_sessionmaker(_replica_engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: a primary (read/write) session, committed at edge."""
    async with SessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_replica_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: a read-only replica session for heavy reads."""
    async with ReplicaSessionFactory() as session:
        yield session


async def dispose_engines() -> None:
    await _primary_engine.dispose()
    await _replica_engine.dispose()
