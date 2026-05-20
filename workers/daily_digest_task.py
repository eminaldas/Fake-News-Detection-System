# workers/daily_digest_task.py
"""
Günlük haber özeti — Gemini Flash ile günde 4 kez çalışır.
Bugünün top-25 haberi (source_count DESC) başlığını Gemini'ye gönderir,
genel gündem özeti + konu başlıkları alır, DailySummary tablosuna kaydeder.
"""
import asyncio
import json
import logging
from datetime import date, datetime, timezone

from celery import Celery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import DailySummary, NewsArticle

logger = logging.getLogger(__name__)

celery_app = Celery(
    "daily_digest_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

_gemini_client = None

def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _current_slot() -> str:
    """UTC saatine göre slot etiketini döner (Türkiye UTC+3)."""
    hour_tr = (datetime.now(timezone.utc).hour + 3) % 24
    if hour_tr < 11:
        return "09:00"
    elif hour_tr < 15:
        return "13:00"
    elif hour_tr < 19:
        return "17:00"
    else:
        return "21:00"


async def _generate():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        today = date.today()

        # Top-25 bugünün haberleri — kaynak sayısına göre
        rows = (await db.execute(
            select(NewsArticle.title, NewsArticle.source_count)
            .where(
                NewsArticle.pub_date >= datetime(today.year, today.month, today.day,
                                                  tzinfo=timezone.utc),
                NewsArticle.embedding.is_not(None),
                NewsArticle.id == NewsArticle.cluster_id,
            )
            .order_by(NewsArticle.source_count.desc())
            .limit(25)
        )).all()

    await engine.dispose()

    if not rows:
        logger.info("daily_digest: bugün haber yok, atlandı")
        return

    lines = "\n".join(
        f"{i+1}. {r.title} ({r.source_count or 1} kaynak)"
        for i, r in enumerate(rows)
    )

    prompt = f"""Aşağıdaki haber başlıkları bugün Türkiye gündeminde öne çıkan haberlerin listesidir.
Bunları tek tek özetleme. Bunun yerine: bugün genel gündem nasıldı, hangi konular öne çıktı,
ülkede neler yaşandı — bunu 3-4 cümleyle anlat. Sonra 4-5 konu başlığı çıkar.

Başlıklar:
{lines}

Sadece JSON formatında yanıt ver, başka hiçbir şey yazma:
{{"summary": "...", "topics": ["...", "..."]}}"""

    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        summary_text = data.get("summary", "").strip()
        topics = data.get("topics", [])
        if not summary_text:
            logger.warning("daily_digest: boş özet geldi")
            return
    except Exception as exc:
        logger.error("daily_digest: Gemini hatası: %s", exc)
        return

    engine2 = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    AsyncSessionLocal2 = sessionmaker(engine2, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal2() as db:
        slot = _current_slot()
        existing = (await db.execute(
            select(DailySummary).where(
                DailySummary.summary_date == today,
                DailySummary.slot == slot,
            )
        )).scalar_one_or_none()

        if existing:
            existing.summary_text  = summary_text
            existing.topics        = topics
            existing.article_count = len(rows)
            existing.generated_at  = datetime.now(timezone.utc)
        else:
            db.add(DailySummary(
                summary_date  = today,
                summary_text  = summary_text,
                topics        = topics,
                article_count = len(rows),
                slot          = slot,
            ))
        await db.commit()

    await engine2.dispose()
    logger.info("daily_digest: özet kaydedildi — slot=%s, %d haber", slot, len(rows))


@celery_app.task(name="workers.daily_digest_task.generate_daily_digest")
def generate_daily_digest():
    asyncio.run(_generate())
