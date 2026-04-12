"""
scripts/migrate_forum_moderation.py
=====================================
forum_comments tablosuna moderation_status + moderation_note kolonları ekler.
forum_reports tablosunu oluşturur.
IF NOT EXISTS ile idempotent çalışır.
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
    ALTER TABLE forum_comments
      ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'clean',
      ADD COLUMN IF NOT EXISTS moderation_note   TEXT DEFAULT NULL
    """,
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_forum_comment_moderation_status'
      ) THEN
        ALTER TABLE forum_comments
          ADD CONSTRAINT ck_forum_comment_moderation_status
          CHECK (moderation_status IN ('clean','flagged_ai','flagged_user','removed'));
      END IF;
    END $$
    """,
    """
    CREATE TABLE IF NOT EXISTS forum_reports (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id  UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason      VARCHAR(20) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_forum_report_comment_reporter UNIQUE (comment_id, reporter_id),
        CONSTRAINT ck_forum_report_reason
          CHECK (reason IN ('spam','hate_speech','misinformation','off_topic'))
    )
    """,
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_forum_report_comment'
      ) THEN
        CREATE INDEX idx_forum_report_comment ON forum_reports(comment_id);
      END IF;
    END $$
    """,
]


async def main():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            for i, stmt in enumerate(STATEMENTS, 1):
                await conn.execute(sqlalchemy.text(stmt))
                print(f"  [{i}/{len(STATEMENTS)}] OK")
    finally:
        await engine.dispose()
    print("Migration tamamlandı.")


if __name__ == "__main__":
    asyncio.run(main())
