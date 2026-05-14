"""Forum thread'lerine verdict kolonları ekler."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

SQL = """
ALTER TABLE forum_threads
    ADD COLUMN IF NOT EXISTS verdict        VARCHAR(20),
    ADD COLUMN IF NOT EXISTS verdict_reason TEXT,
    ADD COLUMN IF NOT EXISTS verdict_by     VARCHAR(20),
    ADD COLUMN IF NOT EXISTS verdict_at     TIMESTAMPTZ;
"""

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text(SQL))
    print("Migration tamamlandı.")

asyncio.run(main())
