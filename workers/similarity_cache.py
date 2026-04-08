"""
workers/similarity_cache.py
==============================
Günde bir kez çalışır (03:00).
Son 7 günün NewsArticle'ları için pgvector top-10 benzer içeriği hesaplar,
content_similarity_cache'e yazar.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import NewsArticle, ContentSimilarityCache

logger = logging.getLogger(__name__)
BATCH_SIZE = 50


async def _build_cache_async() -> None:
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with Session() as db:
            since = datetime.now(timezone.utc) - timedelta(days=7)

            articles = (await db.execute(
                select(NewsArticle.id, NewsArticle.embedding)
                .where(
                    NewsArticle.created_at >= since,
                    NewsArticle.embedding.isnot(None),
                )
                .limit(500)
            )).all()

            logger.info("similarity_cache: %d makale işlenecek", len(articles))

            for article_id, embedding in articles:
                if embedding is None:
                    continue

                result = await db.execute(
                    text("""
                        SELECT id::text
                        FROM news_articles
                        WHERE id != :article_id
                          AND embedding IS NOT NULL
                        ORDER BY embedding <=> CAST(:emb AS vector)
                        LIMIT 10
                    """),
                    {"article_id": str(article_id), "emb": str([float(x) for x in embedding])},
                )
                similar_ids = [row[0] for row in result.all()]

                existing = (await db.execute(
                    select(ContentSimilarityCache).where(
                        ContentSimilarityCache.content_id == article_id
                    )
                )).scalar_one_or_none()

                if existing:
                    existing.similar_ids = similar_ids
                    existing.computed_at = datetime.now(timezone.utc)
                else:
                    db.add(ContentSimilarityCache(
                        content_id  = article_id,
                        similar_ids = similar_ids,
                        computed_at = datetime.now(timezone.utc),
                    ))

            await db.commit()
            logger.info("similarity_cache güncellendi: %d kayıt", len(articles))

    except Exception as e:
        logger.error("similarity_cache_builder hata: %s", e)
    finally:
        await engine.dispose()


def build_similarity_cache() -> None:
    asyncio.run(_build_cache_async())
