"""
workers/category_tasks.py
=========================
İçerik-bazlı kategori atama: ingest sonrası async sınıflandırma + periyodik süpürme.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import NewsArticle
from app.services.category_classifier import classify_category
from app.services.category_embedding import load_category_protos, refresh_stale_prototypes

logger = logging.getLogger(__name__)

celery_app = Celery("category_tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json", result_serializer="json", accept_content=["json"],
    timezone="Europe/Istanbul", enable_utc=True, result_expires=3600,
)

engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

_vectorizer = None


def _get_vectorizer():
    global _vectorizer
    if _vectorizer is None:
        from ml_engine.vectorizer import TurkishVectorizer
        _vectorizer = TurkishVectorizer()
    return _vectorizer


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(minute="*/30"),
        sweep_unclassified.s(),
        name="category-sweep-30m",
    )


async def _classify_ids(ids: list[str]) -> int:
    async with AsyncSessionLocal() as db:
        await refresh_stale_prototypes(db)
        protos = await load_category_protos(db)
        if not protos:
            logger.info("category.no_protos skip ids=%d", len(ids))
            return 0

        rows = await db.execute(select(NewsArticle).where(NewsArticle.id.in_(ids)))
        articles = rows.scalars().all()
        vectorizer = _get_vectorizer()

        cluster_best: dict = {}  # cluster_id -> (confidence, category, subcategory)
        done = 0
        for art in articles:
            try:
                text_in = (art.title or "") + " " + (art.content or "")[:500]
                emb = vectorizer.get_embedding(text_in)
                res = classify_category(
                    embedding=list(emb) if emb else None,
                    categories=protos,
                    feed_category=art.category or "gündem",
                    feed_subcategory=art.subcategory,
                    main_threshold=settings.CATEGORY_MAIN_THRESHOLD,
                    sub_threshold=settings.CATEGORY_SUB_THRESHOLD,
                )
                art.category = res.category
                art.subcategory = res.subcategory
                art.category_confidence = res.confidence
                done += 1

                # Cluster tutarlılığı: en yüksek güvenli üyeyi sakla
                cid = art.cluster_id
                conf = res.confidence or 0.0
                if cid and (cid not in cluster_best or conf > cluster_best[cid][0]):
                    cluster_best[cid] = (conf, res.category, res.subcategory)
            except Exception as exc:
                logger.warning("category.classify_skip id=%s err=%s", art.id, exc)
                continue

        await db.commit()

        # Kümedeki tüm üyelere en güvenli kategoriyi yay
        for cid, (_, cat, sub) in cluster_best.items():
            await db.execute(
                text("UPDATE news_articles SET category=:cat, subcategory=:sub "
                     "WHERE cluster_id=:cid"),
                {"cat": cat, "sub": sub, "cid": cid},
            )
        await db.commit()
        return done


@celery_app.task(name="workers.category_tasks.classify_articles_batch",
                 queue=settings.CATEGORY_CLASSIFY_QUEUE)
def classify_articles_batch(ids: list[str]):
    logger.info("category.batch_start n=%d", len(ids))
    done = asyncio.run(_classify_ids(ids))
    logger.info("category.batch_done classified=%d", done)


async def _sweep() -> list[str]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.CATEGORY_SWEEP_MAX_AGE_H)
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(NewsArticle.id).where(
                NewsArticle.category_confidence.is_(None),
                NewsArticle.created_at < cutoff,
            ).limit(200)
        )
        return [str(r[0]) for r in rows.all()]


@celery_app.task(name="workers.category_tasks.sweep_unclassified",
                 queue=settings.CATEGORY_CLASSIFY_QUEUE)
def sweep_unclassified():
    ids = asyncio.run(_sweep())
    if not ids:
        return
    for i in range(0, len(ids), settings.CATEGORY_CLASSIFY_BATCH):
        classify_articles_batch.delay(ids[i:i + settings.CATEGORY_CLASSIFY_BATCH])
    logger.info("category.sweep_enqueued total=%d", len(ids))
