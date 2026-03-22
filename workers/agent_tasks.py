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
from scrapers.rss_monitor import run_agent_cycle

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
