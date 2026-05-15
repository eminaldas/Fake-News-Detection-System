# workers/evidence_verdict_task.py
"""
Gemini ile kaynaklı forum yorumunun kanıt analizi.
Thread'in Öne Çıkan Kanıt yorumu eşiği aştığında tetiklenir.
"""
import asyncio
import logging

from celery import Celery
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

log = logging.getLogger(__name__)

celery_app = Celery("evidence_verdict", broker=settings.REDIS_URL)


def _make_session():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@celery_app.task(name="workers.evidence_verdict_task.analyze_evidence_comment")
def analyze_evidence_comment(
    thread_id: str,
    comment_body: str,
    evidence_urls: list,
    thread_title: str,
):
    asyncio.run(_async_analyze(thread_id, comment_body, evidence_urls, thread_title))


async def _async_analyze(thread_id, comment_body, evidence_urls, thread_title):
    if not settings.GEMINI_API_KEY:
        return

    prompt = f"""Aşağıdaki forum tartışmasında yüksek doğrulama skoru alan bir kaynaklı yorum var.

Haber/İddia Başlığı: {thread_title}

Kaynaklı Yorum: {comment_body[:1000]}

Kaynak URL'ler: {', '.join((evidence_urls or [])[:3])}

Görev: Bu kaynaklı yorum, başlıktaki iddiayı DESTEKLIYOR mu, ÇÜRÜTÜYOR mu, yoksa BELIRSIZ mi?
Kısa Türkçe özet yaz (1-2 cümle). Format:
KARAR: DESTEKLIYOR|ÇÜRÜTÜYOR|BELIRSIZ
ÖZET: [açıklama]"""

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        raw = response.text or ""
    except Exception as exc:
        log.warning("Gemini evidence analysis failed: %s", exc)
        return

    verdict = "BELIRSIZ"
    summary = raw.strip()[:500]
    for line in raw.splitlines():
        if line.startswith("KARAR:"):
            v = line.replace("KARAR:", "").strip()
            if v in ("DESTEKLIYOR", "ÇÜRÜTÜYOR", "BELIRSIZ"):
                verdict = v
        elif line.startswith("ÖZET:"):
            summary = line.replace("ÖZET:", "").strip()[:500]

    SessionLocal = _make_session()
    async with SessionLocal() as db:
        await db.execute(
            text(
                "UPDATE forum_threads "
                "SET ai_evidence_verdict = :v, ai_evidence_analysis = :a "
                "WHERE id = :id"
            ),
            {"v": verdict, "a": summary, "id": thread_id},
        )
        await db.commit()
    log.info("Evidence verdict saved for thread %s: %s", thread_id, verdict)
