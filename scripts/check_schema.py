import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.models.models import Base

DB_URL = "postgresql+asyncpg://postgres:b0975717de66b67d2effddd597989bb55f9945534f81ee1abff90deff06d2a41@db:5432/fnds"

async def check():
    engine = create_async_engine(DB_URL)
    async with engine.connect() as conn:
        for table_name, table in sorted(Base.metadata.tables.items()):
            q = "SELECT column_name FROM information_schema.columns WHERE table_name=:t AND table_schema='public'"
            result = await conn.execute(text(q), {"t": table_name})
            db_cols = {r[0] for r in result.fetchall()}
            model_cols = {c.name for c in table.columns}
            missing = model_cols - db_cols
            extra   = db_cols - model_cols
            if missing:
                print(f"MISSING  [{table_name}]: {sorted(missing)}")
            if extra:
                print(f"EXTRA    [{table_name}]: {sorted(extra)}")
    await engine.dispose()
    print("Done.")

asyncio.run(check())
