# workers/image_analysis_task.py
"""
Celery Task — Görsel sahtelik analizi (Layer 3: Gemini multimodal).

Çağrı:
    analyze_image.delay(task_id, image_bytes_b64, phash_str, exif_flags_dict)

Sonuç (Celery backend'e yazılır):
    {
        "task_id": str,
        "verdict": "AI_GENERATED|MANIPULATED|AUTHENTIC|UNCERTAIN",
        "confidence": float,
        "explanation": str,
        "bounding_boxes": [{"coords": [y1,x1,y2,x2], "label": str}],
        "reverse_search_links": [{"title": str, "url": str, "context": str}]
    }
"""

import asyncio
import base64
import io
import json
import logging

from celery import Celery
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import ImageCache

logger = logging.getLogger(__name__)

celery_app = Celery(
    "image_worker",
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

# ─── Gemini lazy init ────────────────────────────────────────────────────────
_gemini_client = None

def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


# ─── Prompt ─────────────────────────────────────────────────────────────────
_FORENSICS_PROMPT = """Sen bir dijital medya adli bilişim uzmanısın. Verilen görseli aşağıdaki kriterlere göre incele:

1. **AI Üretimi:** Anatomik hatalar (yamuk parmaklar, asimetrik yüzler), fizik yasalarına aykırı gölgeler, erimiş dokular veya tekrar eden dokular var mı?
2. **Manipülasyon:** Işık uyumsuzlukları, klonlama/kopyalama izleri, renk geçiş anomalileri var mı?
3. **Tersine Görsel Arama:** Bu görsel daha önce başka bir bağlamda (farklı tarih, farklı ülke, farklı olay) kullanılmış mı? Google arama yeteneğini kullan.
4. **Şüpheli Bölgeler:** Şüpheli bölge varsa koordinatlarını belirt.

Yanıtı YALNIZCA şu JSON formatında döndür (başka hiçbir metin ekleme):
{
  "verdict": "AI_GENERATED veya MANIPULATED veya AUTHENTIC veya UNCERTAIN",
  "confidence": 0.0 ile 1.0 arasında ondalık sayı,
  "explanation": "Türkçe, 2-4 cümle açıklama",
  "bounding_boxes": [
    {"coords": [ymin, xmin, ymax, xmax], "label": "Türkçe açıklama"}
  ],
  "reverse_search_links": [
    {"title": "Sayfa başlığı", "url": "https://...", "context": "Bu görselin orada nasıl kullanıldığı"}
  ]
}

Koordinatlar 0-1000 ölçeğinde normalize edilmiş olmalıdır.
Şüpheli bölge yoksa bounding_boxes boş liste olsun.
Tersine arama sonucu bulunamazsa reverse_search_links boş liste olsun."""


# ─── DB yardımcı ─────────────────────────────────────────────────────────────
def _make_session():
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
    )
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False), engine


async def _save_to_db(phash: str, exif_flags: dict, gemini_result: dict):
    Session, engine = _make_session()
    async with Session() as session:
        cache_entry = ImageCache(
            phash=phash,
            exif_flags=exif_flags or {},
            gemini_result=gemini_result,
        )
        session.add(cache_entry)
        await session.commit()
    await engine.dispose()


# ─── Task ────────────────────────────────────────────────────────────────────
@celery_app.task(name="analyze_image", bind=True, max_retries=2)
def analyze_image(self, task_id: str, image_b64: str, phash: str, exif_flags: dict):
    """
    Görsel analizi Gemini 2.5 Flash ile yapar, sonucu image_cache'e kaydeder.
    """
    try:
        from google.genai import types
        from PIL import Image as PILImage

        image_bytes = base64.b64decode(image_b64)
        client = _get_gemini()

        # ─── MIME type tespiti ─────────────────────────────────────────────
        pil_img = PILImage.open(io.BytesIO(image_bytes))
        mime_map = {
            "JPEG": "image/jpeg",
            "PNG": "image/png",
            "WEBP": "image/webp",
            "GIF": "image/gif",
            "BMP": "image/bmp",
        }
        mime_type = mime_map.get(pil_img.format or "", "image/jpeg")

        # ─── Görsel 1024px'e küçült (Gemini token tasarrufu) ────────────
        max_side = 1024
        if max(pil_img.size) > max_side:
            pil_img.thumbnail((max_side, max_side))
            buf = io.BytesIO()
            save_format = pil_img.format or "JPEG"
            pil_img.save(buf, format=save_format)
            image_bytes = buf.getvalue()

        # ─── Gemini çağrısı ───────────────────────────────────────────────
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                _FORENSICS_PROMPT,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        raw_text = response.text or "{}"
        try:
            gemini_result = json.loads(raw_text)
        except json.JSONDecodeError:
            gemini_result = {
                "verdict": "UNCERTAIN",
                "confidence": 0.0,
                "explanation": "Analiz yanıtı ayrıştırılamadı.",
                "bounding_boxes": [],
                "reverse_search_links": [],
            }

        # ─── Zorunlu alanları doldur (eksikse) ───────────────────────────
        gemini_result.setdefault("verdict", "UNCERTAIN")
        gemini_result.setdefault("confidence", 0.0)
        gemini_result.setdefault("explanation", "")
        gemini_result.setdefault("bounding_boxes", [])
        gemini_result.setdefault("reverse_search_links", [])

        # ─── DB'ye kaydet ──────────────────────────────────────────────────
        asyncio.run(_save_to_db(phash, exif_flags, gemini_result))

        return {
            "task_id": task_id,
            **gemini_result,
        }

    except Exception as exc:
        logger.exception("analyze_image task hatası: %s", exc)
        raise self.retry(exc=exc, countdown=5)
