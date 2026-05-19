"""
scripts/fix_user_levels.py
==========================
Mevcut kullanıcıların level değerlerini total_xp'den yeniden hesaplar.
award_xp artık level'ı gerçek zamanlı güncellediğinden bu script
tek seferlik bir düzeltme olarak çalıştırılmalıdır.

Kullanım:
    python scripts/fix_user_levels.py
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings


def _level_from_xp(total_xp: int) -> int:
    def xp_for(lvl: int) -> int:
        if lvl <= 1:  return 0
        if lvl <= 10: return sum(100 * i for i in range(1, lvl))
        if lvl <= 20: return 4500 + (lvl - 10) * 500
        if lvl <= 30: return 9500 + (lvl - 20) * 1000
        return 19500 + (lvl - 30) * 1500

    lvl = 1
    while total_xp >= xp_for(lvl + 1):
        lvl += 1
        if lvl >= 200:
            return 200
    return lvl


async def main():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            rows = await conn.execute(text("SELECT id, total_xp, level FROM users"))
            users = rows.fetchall()

        updates = [
            {"uid": str(u.id), "level": _level_from_xp(u.total_xp or 0)}
            for u in users
            if (u.level or 1) != _level_from_xp(u.total_xp or 0)
        ]

        if not updates:
            print("Tüm kullanıcı level'ları zaten doğru.")
            return

        async with engine.begin() as conn:
            for u in updates:
                await conn.execute(
                    text("UPDATE users SET level = :level WHERE id = :uid"),
                    {"level": u["level"], "uid": u["uid"]},
                )
        print(f"{len(updates)} kullanıcının level'ı güncellendi.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
