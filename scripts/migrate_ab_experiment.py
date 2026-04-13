"""
scripts/migrate_ab_experiment.py
=================================
ab_experiments ve ab_variant_assignments tablolarını oluşturur.
İlk denemi seed eder: rec_weights_v1, status=active, min_clicks=100.
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
            CREATE TABLE IF NOT EXISTS ab_experiments (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name           VARCHAR(100) NOT NULL UNIQUE,
                status         VARCHAR(20)  NOT NULL DEFAULT 'active',
                min_clicks     INTEGER      NOT NULL DEFAULT 100,
                winner_variant INTEGER      NULL,
                created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
                concluded_at   TIMESTAMPTZ  NULL,
                CONSTRAINT ck_ab_experiment_status  CHECK (status IN ('active','paused','concluded')),
                CONSTRAINT ck_ab_experiment_winner  CHECK (winner_variant IN (0,1,2) OR winner_variant IS NULL)
            );
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ab_variant_assignments (
                user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
                variant       INTEGER NOT NULL CHECK (variant IN (0,1,2)),
                assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (user_id, experiment_id)
            );
        """))

        # İlk deneyi seed et (idempotent)
        await conn.execute(text("""
            INSERT INTO ab_experiments (name, status, min_clicks)
            SELECT 'rec_weights_v1', 'active', 100
            WHERE NOT EXISTS (
                SELECT 1 FROM ab_experiments WHERE name = 'rec_weights_v1'
            );
        """))

    await engine.dispose()
    print("✔ ab_experiments ve ab_variant_assignments tabloları oluşturuldu.")
    print("✔ rec_weights_v1 deneyini seed edildi (veya zaten vardı).")


if __name__ == "__main__":
    asyncio.run(run())
