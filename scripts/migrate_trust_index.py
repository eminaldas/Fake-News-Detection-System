"""
scripts/migrate_trust_index.py
===============================
users tablosuna forum_trust_* kolonlarını ekler.
IF NOT EXISTS sözdizimi kullanılır — mevcut kolona dokunmaz.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlalchemy
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

STATEMENTS = [
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS forum_trust_score    FLOAT       NOT NULL DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS forum_trust_tier     VARCHAR(20) NOT NULL DEFAULT 'yeni_uye',
      ADD COLUMN IF NOT EXISTS forum_trust_category VARCHAR(50) DEFAULT NULL
    """,
]


async def main():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(sqlalchemy.text(stmt))
    await engine.dispose()
    print("Migration tamamlandı.")


if __name__ == "__main__":
    asyncio.run(main())
