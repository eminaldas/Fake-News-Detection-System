"""
workers/agent_tasks.py
=======================
Celery Beat entegrasyonu — her 60 saniyede bir RSS taraması tetikler.

Çalıştırma:
  celery -A workers.agent_tasks beat   --loglevel=info  [zamanlayıcı]
  celery -A workers.agent_tasks worker --loglevel=info  [işçi]

docker-compose'da 'beat' servisi bu iki komutu ayrı konteynerler olarak çalıştırır.
"""

import asyncio
import logging

from celery import Celery

from app.core.config import settings
from scrapers.rss_monitor import run_agent_cycle, get_vectorizer
from scripts.scrape_rss_bulk import ingest_rss_sources
from workers.audit_flush_task import flush_audit_buffer

logger = logging.getLogger("NewsAgent.Beat")

# ─────────────────────────────────────────────────────────────────────────────
# Celery Uygulama
# ─────────────────────────────────────────────────────────────────────────────
celery_app = Celery(
    "agent",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Istanbul",
    enable_utc=True,
    worker_prefetch_multiplier=1,   # Her worker bir görev alır, OOM önlemi
    task_acks_late=True,            # Görev tamamlanana kadar onaylama
)

# ─────────────────────────────────────────────────────────────────────────────
# Beat Zamanlaması
# ─────────────────────────────────────────────────────────────────────────────
celery_app.conf.beat_schedule = {
    "scan-turkish-news-every-60s": {
        "task": "workers.agent_tasks.run_news_scan",
        "schedule": settings.NEWS_AGENT_INTERVAL,  # varsayılan: 60 saniye
    },
    "ingest-trusted-rss-daily": {
        "task": "workers.agent_tasks.ingest_trusted_rss",
        "schedule": 86400,  # 24 saat (saniye cinsinden)
    },
    "flush-audit-buffer-every-5s": {
        "task": "workers.agent_tasks.run_audit_flush",
        "schedule": 5,
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Celery Task
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(name="workers.agent_tasks.run_news_scan", bind=True, max_retries=3)
def run_news_scan(self):
    """
    Her 60 saniyede bir tetiklenen ana görev.
    RSS taraması → Radar → Gemini → DB kayıt pipeline'ını çalıştırır.
    """
    logger.info("▶ Haber taraması başlatılıyor...")
    try:
        results = asyncio.run(run_agent_cycle(dry_run=False))
        logger.info("✔ Tarama tamamlandı. İşlenen yeni haber: %d", len(results))
        return {
            "processed": len(results),
            "headlines": [r.get("title", "")[:80] for r in results],
        }
    except Exception as exc:
        logger.exception("Haber taraması başarısız: %s", exc)
        raise self.retry(exc=exc, countdown=15)  # 15s sonra tekrar dene


async def _push_recommendations_updated_to_all() -> None:
    """
    Preference profili olan tüm kullanıcılara recommendations_updated WS push'u gönderir.
    Yeni haber ingest'i sonrası çağrılır; her kullanıcının feed'i güncel olsun.
    Celery asyncio.run() bağlamında çalışır — transient Redis bağlantısı kullanılır.
    """
    import json as _json
    from redis.asyncio import from_url as _redis_from_url
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import NullPool
    from sqlalchemy import select
    from app.models.models import UserPreferenceProfile

    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with Session() as db:
            user_ids = (await db.execute(
                select(UserPreferenceProfile.user_id)
            )).scalars().all()

        if not user_ids:
            return

        _r = await _redis_from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        try:
            msg = _json.dumps({"type": "recommendations_updated", "payload": {}}, ensure_ascii=False)
            for uid in user_ids:
                await _r.publish(f"user:{uid}:events", msg)
        finally:
            await _r.aclose()
    except Exception as exc:
        logger.warning("ingest WS push hatası: %s", exc)
    finally:
        await engine.dispose()


@celery_app.task(name="workers.agent_tasks.ingest_trusted_rss", bind=True, max_retries=2)
def ingest_trusted_rss(self):
    """
    Her 24 saatte bir tetiklenir.
    Güvenilir RSS feed'lerinden yeni haberleri Doğru etiketiyle ingest eder.
    get_vectorizer() singleton kullanılır — OOM riskini azaltır.
    Dedup kontrolü sayesinde idempotent çalışır.
    """
    logger.info("▶ Güvenilir RSS ingest başlatılıyor...")
    try:
        vect = get_vectorizer()
        count = asyncio.run(ingest_rss_sources(dry_run=False, vectorizer=vect))
        logger.info("✔ RSS ingest tamamlandı. Eklenen: %d", count)
        if count > 0:
            asyncio.run(_push_recommendations_updated_to_all())
        return {"added": count}
    except Exception as exc:
        logger.exception("RSS ingest başarısız: %s", exc)
        raise self.retry(exc=exc, countdown=300)  # 5dk sonra tekrar dene


@celery_app.task(name="workers.agent_tasks.run_audit_flush")
def run_audit_flush() -> None:
    """Redis audit buffer'ını PostgreSQL'e flush eder."""
    flush_audit_buffer()
