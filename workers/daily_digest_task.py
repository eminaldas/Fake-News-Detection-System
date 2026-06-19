"""
Günlük haber özeti — Gemini Flash ile günde 4 kez çalışır.
Bugünün top-25 haberi (source_count DESC) başlığını Gemini'ye gönderir,
genel gündem özeti + konu başlıkları alır, DailySummary tablosuna kaydeder.
"""
import asyncio
import json
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import DailySummary, NewsArticle
from workers.tasks import celery_app

logger = logging.getLogger(__name__)

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

        rows = (await db.execute(
            select(NewsArticle.title, NewsArticle.source_count)
            .where(
                NewsArticle.created_at >= datetime(today.year, today.month, today.day,
                                                    tzinfo=timezone.utc),
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
Bu haberleri kategorilere bölerek Türkçe bir gündem özeti oluştur. BBC, Reuters ve TRT Haber tarzında
profesyonel, bilgilendirici ve dengeli bir sunum yap.

Kurallar:
- Haberleri kategori başlıklarına göre grupla (örn: Siyaset, Ekonomi, Dünya, Spor, Toplum, Teknoloji...)
- Sadece haberlerde gerçekten bulunan kategorileri kullan — yoksa ekleme
- Spor veya tek bir alan aşırı baskın olsa bile diğer kategorileri öne çıkar; dengeyi koru
- Her kategori için 2-4 cümlelik, o günün haberlerini somut şekilde anlatan bir metin yaz
- Genel bir intro özeti de yaz (tüm günü 2-3 cümleyle özetler)
- Kuru liste yapma; akıcı, gazetecilik diliyle yaz

Başlıklar:
{lines}

Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{{
  "summary": "Günün genel özeti 2-3 cümle",
  "sections": [
    {{"title": "Kategori Başlığı", "text": "Bu kategorinin 2-4 cümlelik özeti"}},
    {{"title": "Kategori Başlığı", "text": "Bu kategorinin 2-4 cümlelik özeti"}}
  ],
  "topics": ["Konu etiketi 1", "Konu etiketi 2", "Konu etiketi 3", "Konu etiketi 4"]
}}"""

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
        sections = data.get("sections", [])
        topics = data.get("topics", [])
        if not sections and summary_text:
            sections = []
        if not summary_text and not sections:
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

        structured = json.dumps(
            {"summary": summary_text, "sections": sections},
            ensure_ascii=False,
        )
        if existing:
            existing.summary_text  = structured
            existing.topics        = topics
            existing.article_count = len(rows)
            existing.generated_at  = datetime.now(timezone.utc)
        else:
            db.add(DailySummary(
                summary_date  = today,
                summary_text  = structured,
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
