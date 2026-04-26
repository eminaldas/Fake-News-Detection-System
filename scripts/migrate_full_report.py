"""
scripts/migrate_full_report.py
==============================
analysis_results tablosuna full_report (JSONB) kolonu ekler.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS full_report JSONB;
        """))

    await engine.dispose()
    print("✔ analysis_results tablosuna full_report kolonu eklendi.")


if __name__ == "__main__":
    asyncio.run(run())
