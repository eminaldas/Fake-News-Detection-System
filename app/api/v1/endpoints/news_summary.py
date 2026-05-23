"""
POST /api/v1/news/{article_id}/summarize
Haberi analiz etmeden Gemini ile özetler.
AnalysisResult'a kayıt yapmaz → günün analizlerinde görünmez.
Redis cache: 1 saat (key: news_sum:{article_id})
"""
import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import NewsArticle

router = APIRouter()
logger = logging.getLogger(__name__)


class SummaryResponse(BaseModel):
    summary: str


_SUMMARY_PROMPT = """\
Aşağıda bir haber başlığı ve içeriği verilmiştir.

Görevin: Bu haberde ne anlatıldığını, okuyucuya sade ve anlaşılır Türkçeyle özetle.
- Haberde geçen temel olayları, kişileri ve yeri belirt.
- Haberde öne çıkan önemli detayları ver.
- Kendi yorumunu veya değerlendirmeni ekleme; sadece haberde ne söylendiğini aktar.
- 3-5 cümle yeterli; çok kısa ya da çok uzun olmasın.
- Sade, akıcı cümleler kur; teknik jargon kullanma.

BAŞLIK: {title}

İÇERİK:
{content}

Yalnızca özet metnini yaz, başka hiçbir şey ekleme.
"""

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _call_gemini_summary(title: str, content: str) -> str | None:
    """Senkron Gemini çağrısı — asyncio.to_thread ile sarılır."""
    if not settings.GEMINI_API_KEY:
        logger.warning("summarize: GEMINI_API_KEY ayarlanmamış")
        return None
    try:
        client = _get_gemini_client()
        prompt = _SUMMARY_PROMPT.format(
            title=title,
            content=content[:3000],  # token limiti için kısalt
        )
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        text = (response.text or "").strip()
        return text if text else None
    except Exception as exc:
        logger.warning("summarize gemini error: %s", exc)
        return None


@router.post("/{article_id}/summarize", response_model=SummaryResponse)
async def summarize_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"news_sum:{article_id}"
    cached = await redis.get(cache_key)
    if cached:
        return {"summary": cached}

    article = await db.get(NewsArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Haber bulunamadı.")

    title   = article.title or ""
    content = article.content or ""
    if not title and not content:
        raise HTTPException(status_code=422, detail="Haber içeriği yok.")

    summary = await asyncio.to_thread(_call_gemini_summary, title, content)
    if not summary:
        raise HTTPException(status_code=503, detail="Özet oluşturulamadı, lütfen tekrar dene.")

    await redis.setex(cache_key, 3600, summary)
    return {"summary": summary}
