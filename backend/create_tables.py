"""One-time script: create all tables from SQLAlchemy models (SQLite dev only).
Run: python create_tables.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
import app.models  # noqa: F401 — registers all models on Base.metadata
from app.models.base import Base
from app.core.config import settings


async def main() -> None:
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("\n✅ All tables created in", settings.database_url)


asyncio.run(main())
