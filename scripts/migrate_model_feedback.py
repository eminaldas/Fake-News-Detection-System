"""scripts/migrate_model_feedback.py
Yeni tabloları canlı DB'ye ekler — CREATE TABLE IF NOT EXISTS ile idempotent.
Çalıştır: python scripts/migrate_model_feedback.py
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine


async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS model_feedback (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
                user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                submitted_label VARCHAR(20) NOT NULL
                    CHECK (submitted_label IN ('FAKE', 'AUTHENTIC')),
                created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
                CONSTRAINT uq_model_feedback_article_user UNIQUE (article_id, user_id)
            )
        """))

        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_mf_article_id
            ON model_feedback (article_id)
        """))

        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_mf_user_id
            ON model_feedback (user_id)
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS model_training_runs (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                triggered_at   TIMESTAMP WITH TIME ZONE DEFAULT now(),
                sample_count   INTEGER,
                feedback_count INTEGER,
                accuracy       FLOAT,
                prev_accuracy  FLOAT,
                status         VARCHAR(20) NOT NULL
                    CHECK (status IN ('success', 'skipped', 'failed')),
                notes          TEXT,
                created_at     TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        """))

    print("Migration tamamlandı: model_feedback + model_training_runs")


if __name__ == "__main__":
    asyncio.run(migrate())
