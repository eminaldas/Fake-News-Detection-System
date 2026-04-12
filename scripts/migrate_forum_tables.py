"""
scripts/migrate_forum_tables.py
================================
Forum tablolarını ve sistem etiketlerini oluşturur.
Mevcut tablolara dokunmaz (IF NOT EXISTS).
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
    CREATE TABLE IF NOT EXISTS forum_threads (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id       UUID REFERENCES articles(id) ON DELETE SET NULL,
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title            VARCHAR(300) NOT NULL,
        body             TEXT NOT NULL,
        category         VARCHAR(50),
        status           VARCHAR(20) NOT NULL DEFAULT 'active',
        vote_suspicious  INTEGER NOT NULL DEFAULT 0,
        vote_authentic   INTEGER NOT NULL DEFAULT 0,
        vote_investigate INTEGER NOT NULL DEFAULT 0,
        comment_count    INTEGER NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT ck_forum_thread_status CHECK (status IN ('active','under_review','resolved'))
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_forum_thread_article ON forum_threads (article_id)",
    "CREATE INDEX IF NOT EXISTS idx_forum_thread_user ON forum_threads (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_forum_thread_category_created ON forum_threads (category, created_at DESC)",
    """
    CREATE TABLE IF NOT EXISTS forum_comments (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id     UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        parent_id     UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body          TEXT NOT NULL,
        evidence_urls JSONB NOT NULL DEFAULT '[]',
        helpful_count INTEGER NOT NULL DEFAULT 0,
        depth         INTEGER NOT NULL DEFAULT 0,
        is_highlighted BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT ck_forum_comment_depth CHECK (depth >= 0 AND depth <= 3)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_forum_comment_thread ON forum_comments (thread_id, created_at ASC)",
    """
    CREATE TABLE IF NOT EXISTS forum_votes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id  UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote_type  VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_forum_vote_thread_user UNIQUE (thread_id, user_id),
        CONSTRAINT ck_forum_vote_type CHECK (vote_type IN ('suspicious','authentic','investigate'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS forum_comment_votes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_forum_comment_vote_user UNIQUE (comment_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tags (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL,
        is_system   BOOLEAN NOT NULL DEFAULT false,
        category    VARCHAR(50),
        usage_count INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_tag_name UNIQUE (name)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS thread_tags (
        thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (thread_id, tag_id)
    )
    """,
]

SYSTEM_TAGS = [
    "#doğrulandı",
    "#kaynak-yok",
    "#çelişki",
    "#yanıltıcı-başlık",
    "#bağlam-eksik",
    "#eski-haber",
    "#sahte-alıntı",
]


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=True, poolclass=NullPool)
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(sqlalchemy.text(stmt))

        # Seed system tags — ON CONFLICT DO NOTHING to be idempotent
        for tag_name in SYSTEM_TAGS:
            await conn.execute(
                sqlalchemy.text(
                    "INSERT INTO tags (name, is_system) VALUES (:name, true) "
                    "ON CONFLICT (name) DO NOTHING"
                ),
                {"name": tag_name},
            )

    await engine.dispose()
    print("Forum tabloları ve sistem etiketleri oluşturuldu.")


if __name__ == "__main__":
    asyncio.run(main())
