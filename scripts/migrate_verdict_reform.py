# scripts/migrate_verdict_reform.py
"""
Verdict Reform 2.0 migration.
"""
import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

# asyncpg multi-statement execute desteklemediği için her DDL ayrı çalıştırılır
STATEMENTS = [
    # ForumVote: trust ağırlığı + şüpheli işaret
    """ALTER TABLE forum_votes
        ADD COLUMN IF NOT EXISTS vote_weight    FLOAT   NOT NULL DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS is_suspicious  BOOLEAN NOT NULL DEFAULT FALSE""",

    # ForumThread: weighted sayaçlar
    """ALTER TABLE forum_threads
        ADD COLUMN IF NOT EXISTS vote_suspicious_weighted  FLOAT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS vote_authentic_weighted   FLOAT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS vote_investigate_weighted FLOAT NOT NULL DEFAULT 0""",

    # ForumThread: featured evidence + AI + post_type
    """ALTER TABLE forum_threads
        ADD COLUMN IF NOT EXISTS featured_comment_id       UUID  REFERENCES forum_comments(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS ai_evidence_analysis      TEXT,
        ADD COLUMN IF NOT EXISTS ai_evidence_verdict       VARCHAR(20),
        ADD COLUMN IF NOT EXISTS ai_evidence_triggered     BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS post_type                 VARCHAR(20) NOT NULL DEFAULT 'iddia'""",

    # ForumComment: kaynak doğrulama
    """ALTER TABLE forum_comments
        ADD COLUMN IF NOT EXISTS verified_count       INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_featured_evidence BOOLEAN NOT NULL DEFAULT FALSE""",

    # Yeni tablo: kaynak doğrulama reaksiyonları
    """CREATE TABLE IF NOT EXISTS forum_comment_verifications (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID        NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
        user_id    UUID        NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (comment_id, user_id)
    )""",

    # Index
    """CREATE INDEX IF NOT EXISTS idx_forum_comment_verif_comment
        ON forum_comment_verifications(comment_id)""",
]


async def main():
    async with AsyncSessionLocal() as db:
        for i, stmt in enumerate(STATEMENTS, 1):
            print(f"[{i}/{len(STATEMENTS)}] Executing...")
            await db.execute(text(stmt))
        await db.commit()
    print("Migration OK")


if __name__ == "__main__":
    asyncio.run(main())
