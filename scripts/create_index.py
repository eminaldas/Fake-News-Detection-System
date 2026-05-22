import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def create_indexes():
    async with AsyncSessionLocal() as session:

        steps = [
            # pgvector HNSW — kullanıcı analizi benzerlik araması
            (
                """CREATE INDEX IF NOT EXISTS article_embedding_idx
                   ON articles USING hnsw (embedding vector_cosine_ops);""",
                "HNSW index: articles.embedding",
            ),
            # pg_trgm extension — RSS dedup için başlık benzerliği
            (
                "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
                "pg_trgm extension",
            ),
            # Trigram index — news_articles başlık benzerlik araması
            (
                """CREATE INDEX IF NOT EXISTS news_articles_title_trgm_idx
                   ON news_articles USING gin (title gin_trgm_ops);""",
                "GIN trigram index: news_articles.title",
            ),
        ]

        for sql, label in steps:
            try:
                await session.execute(text(sql))
                await session.commit()
                print(f"OK: {label}")
            except Exception as e:
                print(f"FAIL: {label} — {e}")
                await session.rollback()

if __name__ == "__main__":
    asyncio.run(create_indexes())
