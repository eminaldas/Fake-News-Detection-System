"""
scripts/create_news_articles_table.py
======================================
news_articles tablosunu ve gerekli indexleri oluşturur.
Mevcut tabloya dokunmaz (IF NOT EXISTS).
"""

import asyncio
import os
import sys

import sqlalchemy

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS news_articles (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        TEXT NOT NULL,
        content      TEXT,
        embedding    vector(768),
        category     VARCHAR(50),
        subcategory  VARCHAR(50),
        image_url    TEXT,
        source_name  VARCHAR(100),
        source_url   TEXT,
        trust_score  FLOAT,
        pub_date     TIMESTAMPTZ,
        cluster_id   UUID,
        source_count INTEGER NOT NULL DEFAULT 1,
        label        VARCHAR(20),
        label_source VARCHAR(50),
        created_at   TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS news_articles_embedding_idx
        ON news_articles USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """,
    """
    CREATE INDEX IF NOT EXISTS news_articles_category_pub_date_idx
        ON news_articles (category, pub_date DESC)
    """,
    """
    CREATE INDEX IF NOT EXISTS news_articles_cluster_id_idx
        ON news_articles (cluster_id)
    """,
]


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=True, poolclass=NullPool)
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(sqlalchemy.text(stmt))
    await engine.dispose()
    print("news_articles tablosu ve indexler oluşturuldu.")


if __name__ == "__main__":
    asyncio.run(main())
