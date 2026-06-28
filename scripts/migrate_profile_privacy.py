"""
scripts/migrate_profile_privacy.py
==================================
users tablosuna is_private kolonunu ekler (gizli/takipçi-bazlı profil).
IF NOT EXISTS sözdizimi kullanılır — mevcut kolona dokunmaz.

Çalıştırma: docker compose exec app python scripts/migrate_profile_privacy.py
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
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE
    """,
]


async def main():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(sqlalchemy.text(stmt))
    await engine.dispose()
    print("Migration tamamlandı: users.is_private eklendi.")


if __name__ == "__main__":
    asyncio.run(main())
