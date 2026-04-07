# Görsel Analiz & Kota Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home sayfasına "Görsel" sekmesi ekle (3 katmanlı escalation: pHash → EXIF → Gemini multimodal) ve profil sayfasındaki günlük kota gösterimini Redis'teki gerçek değerle düzelt.

**Architecture:** Mevcut `analyze_article` / `analyze_article_url` pattern'ına paralel olarak `analyze_image` Celery task'ı eklenir. Layer 1 (pHash DB lookup) ve Layer 2 (EXIF) senkron/anlık çalışır; sadece Layer 3 (Gemini) kotadan düşer ve Celery kuyruğuna girer. Frontend mevcut polling hook'uyla aynı mantığı izler.

**Tech Stack:** `imagehash`, `Pillow`, `exifread`, `google-genai` (zaten mevcut), SQLAlchemy async, Celery, React 19, Tailwind CSS 4

---

## Dosya Haritası

```
Değiştirilen:
  app/models/models.py                     ImageCache modeli + AnalysisType.image
  app/schemas/schemas.py                   QuotaResponse + ImageAnalysisResponse
  app/api/v1/endpoints/analysis.py         POST /analyze/image endpoint
  app/api/v1/endpoints/users.py            GET /me/quota endpoint
  requirements.txt                         imagehash, Pillow, exifread
  frontend/src/features/analysis/AnalysisForm.jsx   Görsel sekmesi
  frontend/src/services/auth.service.js    getQuota() metodu
  frontend/src/pages/Profile.jsx           Kota fix

Yeni:
  workers/image_analysis_task.py           analyze_image Celery task
  scripts/create_image_cache_table.py      DB migration
  frontend/src/features/analysis/ImageDropZone.jsx
  frontend/src/features/analysis/ImageResultCard.jsx
  frontend/src/hooks/useImageAnalysis.js
```

---

## Task 1: DB Modeli ve Migration

**Files:**
- Modify: `app/models/models.py`
- Create: `scripts/create_image_cache_table.py`

- [ ] **Step 1: AnalysisType enum'a `image` ekle**

`app/models/models.py` dosyasında `AnalysisType` class'ını bul (şu an satır 20-22):

```python
class AnalysisType(str, enum.Enum):
    text  = "text"
    url   = "url"
    image = "image"   # YENİ
```

- [ ] **Step 2: ImageCache modelini ekle**

Aynı dosyada `NewsArticle` class'ından önce ekle:

```python
class ImageCache(Base):
    __tablename__ = "image_cache"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phash         = Column(String(64), nullable=False, index=True)
    exif_flags    = Column(JSONB, nullable=True)
    gemini_result = Column(JSONB, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Migration scripti oluştur**

`scripts/create_image_cache_table.py` dosyasını oluştur:

```python
"""
scripts/create_image_cache_table.py
====================================
image_cache tablosunu oluşturur ve AnalysisType enum'u günceller.
Çalıştırma: python scripts/create_image_cache_table.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

CREATE_SQL = """
-- image_cache tablosu
CREATE TABLE IF NOT EXISTS image_cache (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phash       VARCHAR(64) NOT NULL,
    exif_flags  JSONB,
    gemini_result JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_image_cache_phash ON image_cache(phash);

-- AnalysisType enum'a image ekle (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'image'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysistype')
    ) THEN
        ALTER TYPE analysistype ADD VALUE 'image';
    END IF;
END$$;
"""

async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        for stmt in CREATE_SQL.strip().split(";\n\n"):
            stmt = stmt.strip()
            if stmt:
                await conn.execute(text(stmt + ";"))
    await engine.dispose()
    print("✅ image_cache tablosu ve enum güncellendi.")

if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 4: Migration çalıştır**

```bash
python scripts/create_image_cache_table.py
```

Beklenen çıktı: `✅ image_cache tablosu ve enum güncellendi.`

- [ ] **Step 5: Commit**

```bash
git add app/models/models.py scripts/create_image_cache_table.py
git commit -m "feat(db): ImageCache modeli ve image enum değeri ekle"
```

---

## Task 2: Kota Endpoint ve Frontend Fix

**Files:**
- Modify: `app/api/v1/endpoints/users.py`
- Modify: `app/schemas/schemas.py`
- Modify: `frontend/src/services/auth.service.js`
- Modify: `frontend/src/pages/Profile.jsx`

- [ ] **Step 1: QuotaResponse schema ekle**

`app/schemas/schemas.py` dosyasına, `PaginatedAnalysisRequestResponse` class'ından sonra ekle:

```python
class QuotaResponse(BaseModel):
    used:      int
    limit:     int
    remaining: int
    reset_at:  int   # Unix timestamp (UTC midnight)
```

- [ ] **Step 2: GET /me/quota endpoint ekle**

`app/api/v1/endpoints/users.py` dosyasında import'lara ekle:

```python
from datetime import datetime, timezone
from redis.asyncio import Redis
from app.core.rate_limit import _midnight_epoch
from app.db.redis import get_redis
from app.schemas.schemas import QuotaResponse
```

Ardından `my_history` fonksiyonundan sonra ekle:

```python
@router.get("/me/quota", response_model=QuotaResponse)
async def my_quota(
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Kullanıcının bugünkü analiz kota kullanımını döndürür."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key   = f"rl:user:{current_user.id}:{today}"
    count = int(await redis.get(key) or 0)
    limit = settings.RATE_LIMIT_USER
    return QuotaResponse(
        used=count,
        limit=limit,
        remaining=max(0, limit - count),
        reset_at=_midnight_epoch(),
    )
```

Eksik import'ları da ekle (`settings` zaten import edilmişse atla):

```python
from app.core.config import settings
```

- [ ] **Step 3: Swagger UI'da test et**

Backend çalışırken `http://localhost:8000/docs` açarak `GET /users/me/quota` endpoint'ini çalıştır. Beklenen yanıt:
```json
{ "used": 0, "limit": 20, "remaining": 20, "reset_at": 1234567890 }
```

- [ ] **Step 4: auth.service.js'e getQuota ekle**

`frontend/src/services/auth.service.js` dosyasında `getHistory` metodundan sonra ekle:

```js
static async getQuota() {
    const response = await axiosInstance.get('/users/me/quota');
    return response.data;
}
```

- [ ] **Step 5: Profile.jsx kota fix**

`frontend/src/pages/Profile.jsx` dosyasında:

Mevcut state tanımlarının yanına ekle (satır ~48 civarı, diğer `useState`'lerin altına):

```jsx
const [quota, setQuota] = useState(null);
```

İlk `useEffect`'ten sonra yeni bir `useEffect` ekle:

```jsx
useEffect(() => {
    AuthService.getQuota()
        .then(setQuota)
        .catch(() => {});
}, []);
```

Ardından hatalı kota gösterimini bul ve değiştir. Mevcut (satır ~181):
```jsx
<p className="text-[10px] text-muted">Günlük kota: {Math.min(historyTotal, 20)}/20</p>
```

Yeni:
```jsx
<p className="text-[10px] text-muted">
    Günlük kota: {quota ? `${quota.used}/${quota.limit}` : '…'}
</p>
```

Ve kota progress bar'ını güncelle (satır ~176-179):
```jsx
<div className="w-full h-1 rounded-full overflow-hidden bg-surface-solid">
    <div className="h-full rounded-full transition-all duration-700"
         style={{
             width: `${quota ? Math.min((quota.used / quota.limit) * 100, 100) : 0}%`,
             background: 'var(--color-brand-primary)',
         }} />
</div>
```

- [ ] **Step 6: Profil sayfasını tarayıcıda kontrol et**

`http://localhost:5173/profile` açarak "Günlük kota" satırının gerçek kullanımı gösterdiğini doğrula.

- [ ] **Step 7: Commit**

```bash
git add app/schemas/schemas.py app/api/v1/endpoints/users.py \
        frontend/src/services/auth.service.js frontend/src/pages/Profile.jsx
git commit -m "fix(quota): profil sayfasında günlük kotayı Redis'ten oku"
```

---

## Task 3: Bağımlılıklar

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Kütüphaneleri ekle**

`requirements.txt` dosyasında `# AI — Gemini` bölümünden önce yeni bölüm ekle:

```
# Görsel analiz
Pillow>=10.0.0
imagehash>=4.3.1
exifread>=3.0.0
```

- [ ] **Step 2: Kur**

```bash
pip install Pillow>=10.0.0 imagehash>=4.3.1 exifread>=3.0.0
```

- [ ] **Step 3: Doğrula**

```bash
python -c "import imagehash; import PIL; import exifread; print('OK')"
```

Beklenen çıktı: `OK`

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "deps: Pillow, imagehash, exifread ekle (görsel analiz)"
```

---

## Task 4: analyze_image Celery Task

**Files:**
- Create: `workers/image_analysis_task.py`

- [ ] **Step 1: Dosyayı oluştur**

`workers/image_analysis_task.py`:

```python
"""
workers/image_analysis_task.py
================================
Celery task — Görsel sahtelik analizi (Layer 3: Gemini multimodal).

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
Tersine arama sonucu bulunamazsa reverse_search_links boş liste olsun.
"""


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

        image_bytes = base64.b64decode(image_b64)
        client = _get_gemini()

        # ─── MIME type tespiti ─────────────────────────────────────────────
        from PIL import Image as PILImage
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
            pil_img.save(buf, format=pil_img.format or "JPEG")
            image_bytes = buf.getvalue()

        # ─── Gemini çağrısı ───────────────────────────────────────────────
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                types.Part.from_text(_FORENSICS_PROMPT),
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
            # JSON parse hatası — UNCERTAIN olarak işaretle
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
```

- [ ] **Step 2: Manuel test (Celery worker çalışıyorsa)**

```bash
python -c "
from workers.image_analysis_task import analyze_image
print('Task registered:', analyze_image.name)
"
```

Beklenen çıktı: `Task registered: analyze_image`

- [ ] **Step 3: Commit**

```bash
git add workers/image_analysis_task.py
git commit -m "feat(worker): analyze_image Celery task (Gemini multimodal)"
```

---

## Task 5: POST /analyze/image Endpoint

**Files:**
- Modify: `app/api/v1/endpoints/analysis.py`
- Modify: `app/schemas/schemas.py`

- [ ] **Step 1: ImageAnalysisResponse schema ekle**

`app/schemas/schemas.py` dosyasında `AnalysisResponse` class'ından sonra ekle:

```python
class ImageAnalysisResponse(BaseModel):
    task_id:        str
    message:        str
    is_direct_match: bool = False
    exif_flags:     Optional[dict] = None
    direct_match_data: Optional[dict] = None
```

- [ ] **Step 2: Endpoint'e gerekli import'ları ekle**

`app/api/v1/endpoints/analysis.py` dosyasında mevcut import bloğuna ekle:

```python
import base64
import io

import imagehash
from PIL import Image, UnidentifiedImageError
from fastapi import File, UploadFile
from sqlalchemy import select as sa_select

from app.models.models import ImageCache
from app.schemas.schemas import ImageAnalysisResponse
from workers.image_analysis_task import analyze_image as celery_analyze_image
```

**Not:** `AnalysisRequest` ve `AnalysisType` zaten dosyanın üstünde import edilmiş, tekrar ekleme.

- [ ] **Step 3: pHash yardımcı fonksiyonlarını ekle**

`app/api/v1/endpoints/analysis.py` dosyasında `router = APIRouter()` satırından sonra ekle:

```python
_MAX_IMAGE_BYTES = 25 * 1024 * 1024  # 25 MB
_PHASH_MATCH_THRESHOLD = 10           # Hamming distance ≤ 10 → eşleşme
_AI_KEYWORDS = [
    "midjourney", "stable diffusion", "dall-e", "dall·e",
    "firefly", "adobe photoshop", "runway", "imagen",
    "bing image", "nightcafe", "leonardo.ai",
]


def _compute_phash(image: Image.Image) -> str:
    return str(imagehash.phash(image))


def _phash_distance(h1: str, h2: str) -> int:
    return imagehash.hex_to_hash(h1) - imagehash.hex_to_hash(h2)


def _extract_exif_flags(image: Image.Image) -> dict:
    """Pillow ile EXIF okur, AI yazılım izlerini döndürür."""
    flags = {}
    try:
        exif_raw = image._getexif()  # JPEG için; diğerlerinde None dönebilir
        if not exif_raw:
            return flags
        from PIL.ExifTags import TAGS
        for tag_id, value in exif_raw.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            if tag_name in ("Software", "Make", "Model", "Artist", "Copyright"):
                flags[tag_name] = str(value)
    except Exception:
        pass
    return flags


def _detect_ai_software(exif_flags: dict) -> Optional[str]:
    """Varsa AI yazılım adını döndürür, yoksa None."""
    for val in exif_flags.values():
        for kw in _AI_KEYWORDS:
            if kw in val.lower():
                return val
    return None
```

- [ ] **Step 4: Endpoint fonksiyonunu ekle**

Aynı dosyada `analyze_url` fonksiyonundan sonra ekle:

```python
@router.post(
    "/analyze/image",
    response_model=ImageAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_image_endpoint(
    http_request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Görsel sahtelik analizi — 3 katmanlı escalation.
    Layer 1 (pHash) ve Layer 2 (EXIF) kotadan düşmez.
    Layer 3 (Gemini) kotadan düşer ve Celery kuyruğuna girer.
    """
    log = get_logger(__name__)
    ip = http_request.client.host if http_request.client else "unknown"
    content_id = str(uuid.uuid4())

    # ── Boyut kontrolü ────────────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > _MAX_IMAGE_BYTES:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Görsel 25 MB'dan büyük olamaz.",
        )

    # ── Görsel aç ─────────────────────────────────────────────────────────
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()   # dosya gerçekten okunabilir mi?
    except (UnidentifiedImageError, IOError, SyntaxError):
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu format desteklenmiyor, lütfen farklı bir görsel deneyin.",
        )

    # ── Layer 1: pHash lookup ──────────────────────────────────────────────
    phash_str = _compute_phash(image)
    cache_rows_result = await db.execute(sa_select(ImageCache))
    cache_rows = cache_rows_result.scalars().all()

    for row in cache_rows:
        try:
            dist = _phash_distance(phash_str, row.phash)
        except Exception:
            continue
        if dist <= _PHASH_MATCH_THRESHOLD and row.gemini_result:
            log.info("image.cache_hit", phash=phash_str, distance=dist)
            return ImageAnalysisResponse(
                task_id=content_id,
                message="Bu görsel daha önce analiz edildi.",
                is_direct_match=True,
                direct_match_data={
                    "layer": 1,
                    "hamming_distance": dist,
                    **row.gemini_result,
                },
            )

    # ── Layer 2: EXIF metadata ─────────────────────────────────────────────
    exif_flags = _extract_exif_flags(image)
    ai_software = _detect_ai_software(exif_flags)
    if ai_software:
        log.info("image.exif_ai_detected", software=ai_software)

    # ── Layer 3: Gemini — kota burada düşer ───────────────────────────────
    await check_rate_limit(http_request, redis, current_user)

    image_b64 = base64.b64encode(contents).decode("utf-8")
    task = celery_analyze_image.delay(content_id, image_b64, phash_str, exif_flags)

    # ── Analiz isteğini logla ──────────────────────────────────────────────
    ar = AnalysisRequest(
        user_id=current_user.id if current_user else None,
        ip_hash=hash_ip(ip),
        analysis_type=AnalysisType.image,
        task_id=content_id,
    )
    db.add(ar)
    await db.commit()

    log.info(
        "image_analysis.requested",
        user_id=str(current_user.id) if current_user else None,
        task_id=task.id,
        exif_ai=ai_software,
    )

    return ImageAnalysisResponse(
        task_id=task.id,
        message="Görsel analiz kuyruğa alındı.",
        exif_flags=exif_flags if exif_flags else None,
    )
```

- [ ] **Step 5: Swagger UI'da test et**

`http://localhost:8000/docs` → `POST /analyze/image` → bir PNG veya JPEG yükle.

Beklenen yanıt (202):
```json
{
  "task_id": "...",
  "message": "Görsel analiz kuyruğa alındı.",
  "is_direct_match": false,
  "exif_flags": null
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/endpoints/analysis.py app/schemas/schemas.py
git commit -m "feat(api): POST /analyze/image endpoint (3-katmanlı görsel analiz)"
```

---

## Task 6: ImageDropZone.jsx

**Files:**
- Create: `frontend/src/features/analysis/ImageDropZone.jsx`

- [ ] **Step 1: Bileşeni oluştur**

```jsx
// frontend/src/features/analysis/ImageDropZone.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ImageDropZone = ({ onFileSelect, disabled }) => {
    const inputRef      = useRef(null);
    const [preview, setPreview]   = useState(null);   // object URL
    const [fileName, setFileName] = useState('');
    const [error, setError]       = useState('');
    const [dragging, setDragging] = useState(false);

    // Bellek sızıntısını önle: component unmount'ta URL'yi serbest bırak
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    // Global paste listener
    useEffect(() => {
        const handlePaste = (e) => {
            if (disabled) return;
            const items = Array.from(e.clipboardData?.items || []);
            const imageItem = items.find(i => i.type.startsWith('image/'));
            if (imageItem) _processFile(imageItem.getAsFile());
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [disabled]);

    const _processFile = (file) => {
        if (!file) return;
        setError('');
        if (file.size > MAX_BYTES) {
            setError('Görsel 25 MB\'dan büyük olamaz.');
            return;
        }
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        setFileName(file.name || 'pano görselî');
        onFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) _processFile(file);
    };

    const clearFile = (e) => {
        e.stopPropagation();
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setFileName('');
        setError('');
        onFileSelect(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="flex-grow flex flex-col justify-center px-4 md:px-6 py-4 gap-3">
            {/* Drop alanı */}
            <div
                onClick={() => !disabled && !preview && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`
                    relative flex flex-col items-center justify-center
                    rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                    min-h-[140px] gap-3 p-4
                    ${dragging
                        ? 'border-brand bg-brand/5'
                        : 'border-brutal-border dark:border-surface-solid hover:border-tx-secondary'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${preview ? 'cursor-default' : ''}
                `}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Önizleme"
                            className="max-h-32 max-w-full rounded-lg object-contain"
                        />
                        <span className="text-xs text-tx-secondary truncate max-w-full">{fileName}</span>
                        {!disabled && (
                            <button
                                onClick={clearFile}
                                className="absolute top-2 right-2 p-1 rounded-full bg-surface-solid hover:bg-brutal-border transition-colors"
                                title="Görseli kaldır"
                            >
                                <X className="w-3.5 h-3.5 text-tx-secondary" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                             style={{ background: 'var(--color-bg-surface-solid)' }}>
                            <ImageIcon className="w-6 h-6 text-tx-secondary" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-tx-primary">
                                Görsel yapıştır <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-solid border border-brutal-border">Ctrl+V</kbd>
                            </p>
                            <p className="text-xs text-tx-secondary mt-1">
                                veya tıklayarak seç · Sürükle & bırak · Maks 25 MB
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Hata mesajı */}
            {error && (
                <p className="text-xs text-es-error text-center">{error}</p>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => _processFile(e.target.files?.[0])}
                disabled={disabled}
            />
        </div>
    );
};

export default ImageDropZone;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/analysis/ImageDropZone.jsx
git commit -m "feat(ui): ImageDropZone bileşeni (paste + drag&drop + file select)"
```

---

## Task 7: useImageAnalysis.js Hook

**Files:**
- Create: `frontend/src/hooks/useImageAnalysis.js`

- [ ] **Step 1: Hook oluştur**

```js
// frontend/src/hooks/useImageAnalysis.js
import { useState, useRef, useCallback } from 'react';
import axiosInstance from '../api/axios';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 90000;

export function useImageAnalysis() {
    const [loading, setLoading]       = useState(false);
    const [isPolling, setIsPolling]   = useState(false);
    const [result, setResult]         = useState(null);
    const [exifFlags, setExifFlags]   = useState(null);
    const [error, setError]           = useState(null);

    const pollTimerRef  = useRef(null);
    const pollStartRef  = useRef(null);

    const _stopPolling = () => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const _pollStatus = useCallback(async (taskId) => {
        const elapsed = Date.now() - pollStartRef.current;
        if (elapsed > POLL_MAX_MS) {
            _stopPolling();
            setIsPolling(false);
            setLoading(false);
            setError('Analiz zaman aşımına uğradı. Lütfen tekrar deneyin.');
            return;
        }

        try {
            const res = await axiosInstance.get(`/analysis/status/${taskId}`);
            const data = res.data;

            if (data.status === 'SUCCESS' && data.result) {
                _stopPolling();
                setIsPolling(false);
                setLoading(false);
                setResult(data.result);
            } else if (data.status === 'FAILED') {
                _stopPolling();
                setIsPolling(false);
                setLoading(false);
                setError('Analiz başarısız oldu. Lütfen tekrar deneyin.');
            } else {
                pollTimerRef.current = setTimeout(() => _pollStatus(taskId), POLL_INTERVAL_MS);
            }
        } catch {
            _stopPolling();
            setIsPolling(false);
            setLoading(false);
            setError('Sunucuya bağlanılamadı.');
        }
    }, []);

    const submitImage = useCallback(async (file) => {
        if (!file) return;

        _stopPolling();
        setLoading(true);
        setIsPolling(false);
        setResult(null);
        setExifFlags(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axiosInstance.post('/analysis/analyze/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data;

            // Layer 2 bulgusunu hemen kaydet — polling boyunca gösterilir
            if (data.exif_flags && Object.keys(data.exif_flags).length > 0) {
                setExifFlags(data.exif_flags);
            }

            // Layer 1 direkt eşleşme
            if (data.is_direct_match && data.direct_match_data) {
                setLoading(false);
                setResult(data.direct_match_data);
                return;
            }

            // Layer 3 — polling başlat
            pollStartRef.current = Date.now();
            setIsPolling(true);
            await _pollStatus(data.task_id);
        } catch (err) {
            setLoading(false);
            const detail = err.response?.data?.detail;
            if (err.response?.status === 429) {
                setError('Günlük görsel analiz limitinize ulaştınız.');
            } else if (err.response?.status === 400 || err.response?.status === 413) {
                setError(detail || 'Görsel yüklenemedi.');
            } else {
                setError(detail || 'Bir hata oluştu.');
            }
        }
    }, [_pollStatus]);

    const reset = useCallback(() => {
        _stopPolling();
        setLoading(false);
        setIsPolling(false);
        setResult(null);
        setExifFlags(null);
        setError(null);
    }, []);

    return { loading, isPolling, result, exifFlags, error, submitImage, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useImageAnalysis.js
git commit -m "feat(hook): useImageAnalysis — görsel analiz polling hook"
```

---

## Task 8: ImageResultCard.jsx

**Files:**
- Create: `frontend/src/features/analysis/ImageResultCard.jsx`

- [ ] **Step 1: Bileşeni oluştur**

```jsx
// frontend/src/features/analysis/ImageResultCard.jsx
import React, { useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Shield, ExternalLink } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Verdict config ───────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
    AI_GENERATED: {
        label: 'AI Üretimi',
        icon: <AlertTriangle className="w-5 h-5" />,
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.25)',
    },
    MANIPULATED: {
        label: 'Manipüle Edilmiş',
        icon: <AlertTriangle className="w-5 h-5" />,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
    },
    AUTHENTIC: {
        label: 'Özgün Görsel',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.08)',
        border: 'rgba(34,197,94,0.25)',
    },
    UNCERTAIN: {
        label: 'Belirsiz',
        icon: <HelpCircle className="w-5 h-5" />,
        color: '#a1a1aa',
        bg: 'rgba(161,161,170,0.08)',
        border: 'rgba(161,161,170,0.25)',
    },
};

// ─── Bounding box canvas overlay ──────────────────────────────────────────────
const BoundingBoxOverlay = ({ boxes, imgRef }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas || !boxes?.length) return;

        const draw = () => {
            canvas.width  = img.offsetWidth;
            canvas.height = img.offsetHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            boxes.forEach(({ coords, label }) => {
                const [ymin, xmin, ymax, xmax] = coords;
                // Koordinatlar 0-1000 ölçeğinde → piksel dönüşümü
                const x = (xmin / 1000) * canvas.width;
                const y = (ymin / 1000) * canvas.height;
                const w = ((xmax - xmin) / 1000) * canvas.width;
                const h = ((ymax - ymin) / 1000) * canvas.height;

                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth   = 2;
                ctx.strokeRect(x, y, w, h);

                // Label arka planı
                ctx.fillStyle = 'rgba(239,68,68,0.75)';
                const labelW = ctx.measureText(label).width + 8;
                ctx.fillRect(x, y - 18, labelW, 18);

                ctx.fillStyle = '#fff';
                ctx.font = '11px Inter, sans-serif';
                ctx.fillText(label, x + 4, y - 5);
            });
        };

        if (img.complete) draw();
        else img.addEventListener('load', draw);
        return () => img.removeEventListener('load', draw);
    }, [boxes, imgRef]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
const ImageResultCard = ({ result, exifFlags, previewUrl, isPolling }) => {
    const { isDarkMode } = useTheme();
    const imgRef = useRef(null);

    const cardBorder = { borderColor: isDarkMode ? 'rgba(63,255,139,0.2)' : 'rgba(24,24,27,0.18)' };

    if (!result && !isPolling && !exifFlags) return null;

    const cfg = VERDICT_CONFIG[result?.verdict] || VERDICT_CONFIG.UNCERTAIN;
    const hasBoundingBoxes = result?.bounding_boxes?.length > 0;
    const hasLinks = result?.reverse_search_links?.length > 0;

    return (
        <div className="glass rounded-2xl overflow-hidden animate-fade-up border" style={cardBorder}>

            {/* Üst renk şeridi */}
            {result && (
                <div className="h-1 w-full" style={{ background: cfg.color }} />
            )}

            <div className="p-6 space-y-5">

                {/* ── KATMAN 1: Veritabanı Eşleşmesi ────────────────────── */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">
                        Katman 1 — Veritabanı
                    </p>
                    {result?.layer === 1 ? (
                        <p className="text-sm text-amber-400 font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Bu görsel daha önce analiz edildi — önbellekten yüklendi.
                        </p>
                    ) : (
                        <p className="text-sm text-tx-secondary flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                            Veritabanında eşleşme bulunamadı, yeni görsel.
                        </p>
                    )}
                </div>

                {/* ── KATMAN 2: EXIF Metadata ────────────────────────────── */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">
                        Katman 2 — EXIF Metadata
                    </p>
                    {exifFlags && Object.keys(exifFlags).length > 0 ? (
                        <div className="space-y-1">
                            {Object.entries(exifFlags).map(([k, v]) => (
                                <p key={k} className="text-sm text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-medium">{k}:</span>
                                    <span className="text-tx-secondary truncate">{v}</span>
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-tx-secondary flex items-center gap-2">
                            <Shield className="w-4 h-4 shrink-0 text-green-400" />
                            Metadata şüpheli yazılım izi içermiyor.
                        </p>
                    )}
                </div>

                {/* ── KATMAN 3: Gemini Analizi ───────────────────────────── */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">
                        Katman 3 — Gemini AI Analizi
                    </p>

                    {isPolling && !result && (
                        <div className="flex items-center gap-3 text-sm text-tx-secondary">
                            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                            Gemini görseli analiz ediyor...
                        </div>
                    )}

                    {result && result.layer !== 1 && (
                        <div className="space-y-4">

                            {/* Karar + güven */}
                            <div className="flex items-center gap-3 p-3 rounded-xl"
                                 style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                <div>
                                    <p className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
                                    <p className="text-xs text-tx-secondary">
                                        %{Math.round((result.confidence || 0) * 100)} güven
                                    </p>
                                </div>
                            </div>

                            {/* Görsel + overlay */}
                            {previewUrl && (
                                <div className="relative rounded-xl overflow-hidden">
                                    <img
                                        ref={imgRef}
                                        src={previewUrl}
                                        alt="Analiz edilen görsel"
                                        className="w-full max-h-72 object-contain rounded-xl"
                                        style={{ background: 'var(--color-bg-surface-solid)' }}
                                    />
                                    {hasBoundingBoxes && (
                                        <BoundingBoxOverlay boxes={result.bounding_boxes} imgRef={imgRef} />
                                    )}
                                </div>
                            )}

                            {/* Açıklama */}
                            {result.explanation && (
                                <p className="text-sm text-tx-secondary leading-relaxed"
                                   style={{ borderLeft: `3px solid ${cfg.color}`, paddingLeft: '12px' }}>
                                    {result.explanation}
                                </p>
                            )}

                            {/* Tersine arama sonuçları */}
                            {hasLinks && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">
                                        Tersine Arama Kaynakları
                                    </p>
                                    <div className="space-y-2">
                                        {result.reverse_search_links.map((link, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                                                 style={{ background: 'var(--color-bg-surface-solid)' }}>
                                                <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted" />
                                                <div className="min-w-0">
                                                    <a href={link.url}
                                                       target="_blank"
                                                       rel="noopener noreferrer"
                                                       className="text-xs font-medium text-brand hover:underline truncate block">
                                                        {link.title}
                                                    </a>
                                                    {link.context && (
                                                        <p className="text-[11px] text-tx-secondary mt-0.5">{link.context}</p>
                                                    )}
                                                    <p className="text-[10px] text-amber-500 mt-0.5">
                                                        ⚠️ Bağlantıyı kendiniz doğrulayın
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageResultCard;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/analysis/ImageResultCard.jsx
git commit -m "feat(ui): ImageResultCard — 3 katmanlı görsel analiz sonuç kartı"
```

---

## Task 9: AnalysisForm.jsx Entegrasyonu

**Files:**
- Modify: `frontend/src/features/analysis/AnalysisForm.jsx`
- Modify: `frontend/src/pages/Home.jsx`

- [ ] **Step 1: Home.jsx'i oku**

```bash
cat frontend/src/pages/Home.jsx
```

`AnalysisForm`'un nasıl kullanıldığını ve `useAnalysis` hook'unun nasıl bağlandığını anla. `onAnalyze` ve `onAnalyzeUrl` prop'larının nereden geldiğine bak.

- [ ] **Step 2: AnalysisForm.jsx'e Görsel sekmesi ekle**

Mevcut dosyayı tamamen şu hale getir:

```jsx
import React, { useState } from "react";
import { Search, Loader2, Link2, FileText, Image as ImageIcon } from "lucide-react";
import ImageDropZone from "./ImageDropZone";

const AnalysisForm = ({ onAnalyze, onAnalyzeUrl, onAnalyzeImage, loading, isPolling }) => {
  const [mode, setMode]   = useState("text"); // 'text' | 'url' | 'image'
  const [text, setText]   = useState("");
  const [url, setUrl]     = useState("");
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = () => {
    if (mode === "text")  onAnalyze(text);
    if (mode === "url")   onAnalyzeUrl(url);
    if (mode === "image") onAnalyzeImage(imageFile);
  };

  const isDisabled = loading || (
    mode === "text"  ? text.length === 0 :
    mode === "url"   ? url.length === 0  :
    imageFile === null
  );

  const TABS = [
    { key: "text",  label: "Metin", icon: <FileText  className="w-4 h-4" /> },
    { key: "url",   label: "Link",  icon: <Link2     className="w-4 h-4" /> },
    { key: "image", label: "Görsel",icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-surface shadow-sm rounded-2xl flex flex-col min-h-[280px] md:min-h-[300px] overflow-hidden border border-brutal-border dark:border-surface-solid transition-shadow duration-300">

      {/* Tab Switcher */}
      <div className="flex border-b border-brutal-border/30 dark:border-surface-solid">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 md:px-5 py-3.5 md:py-3 text-sm font-bold transition-colors duration-200 disabled:opacity-50
              ${mode === key
                ? "text-tx-primary border-b-2 border-tx-primary -mb-px"
                : "text-tx-secondary hover:text-tx-primary"}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Input Alanı */}
      <div key={mode} className="p-1 flex-grow flex flex-col animate-fade-in">
        {mode === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            placeholder="Şüpheli haberi buraya yapıştırın..."
            style={{ color: 'var(--color-text-primary)' }}
            className="w-full grow min-h-35 md:min-h-40 p-4 md:p-6 bg-transparent border-0 focus:ring-0 resize-none text-base md:text-lg lg:text-xl font-medium outline-none placeholder:text-tx-secondary disabled:opacity-50 transition-colors"
          />
        )}

        {mode === "url" && (
          <div className="flex-grow flex flex-col justify-center px-4 md:px-6 py-6 md:py-8 gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-tx-primary">
              Haber URL'si
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-brutal-border dark:border-surface-solid bg-surface-solid px-3 md:px-4 py-3 focus-within:border-tx-primary transition-colors">
              <Link2 className="w-5 h-5 text-tx-secondary shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleSubmit()}
                disabled={loading}
                placeholder="https://ornek-haber.com/makale"
                style={{ color: 'var(--color-text-primary)' }}
                className="grow bg-transparent border-0 focus:ring-0 outline-none font-medium text-sm md:text-base placeholder:text-tx-secondary disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-tx-secondary opacity-70">
              Makale scrape edilip BERT ve stilometrik analiz uygulanacaktır.
            </p>
          </div>
        )}

        {mode === "image" && (
          <ImageDropZone
            onFileSelect={setImageFile}
            disabled={loading}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center border-t border-brutal-border/30 dark:border-surface-solid transition-colors duration-300">
        <span className="text-xs font-semibold text-tx-secondary">
          {mode === "text" ? `${text.length} karakter` : "—"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="flex items-center gap-2 bg-tx-primary dark:bg-surface-solid hover:bg-brand-dark dark:hover:bg-neutral-border text-white dark:text-tx-primary border border-brutal-border dark:border-surface-solid px-6 md:px-8 py-2.5 md:py-2 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading && !isPolling ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading ? (isPolling ? "Analiz ediliyor..." : "Gönderiliyor...") : "Analiz"}
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;
```

- [ ] **Step 3: Home.jsx'e useImageAnalysis ekle**

`Home.jsx` dosyasını oku, ardından:

1. Import ekle:
```jsx
import { useImageAnalysis } from '../hooks/useImageAnalysis';
import ImageResultCard from '../features/analysis/ImageResultCard';
```

2. Hook'u bağla (mevcut `useAnalysis` hook çağrısından sonra):
```jsx
const {
    loading: imgLoading,
    isPolling: imgPolling,
    result: imgResult,
    exifFlags,
    error: imgError,
    submitImage,
    reset: resetImage,
} = useImageAnalysis();
```

3. `AnalysisForm`'a `onAnalyzeImage` prop'unu geç:
```jsx
<AnalysisForm
  onAnalyze={handleAnalyze}
  onAnalyzeUrl={handleAnalyzeUrl}
  onAnalyzeImage={submitImage}
  loading={loading || imgLoading}
  isPolling={isPolling || imgPolling}
/>
```

4. `ImageResultCard`'ı mevcut analiz sonuç kartının yanına/altına ekle:
```jsx
{(imgResult || imgPolling || exifFlags) && (
    <ImageResultCard
        result={imgResult}
        exifFlags={exifFlags}
        previewUrl={null}  /* DropZone'dan preview URL'i buraya taşı — opsiyonel */
        isPolling={imgPolling}
    />
)}
{imgError && (
    <p className="text-sm text-es-error text-center py-2">{imgError}</p>
)}
```

> **Not:** `previewUrl` için `ImageDropZone`'daki preview URL'ini Home.jsx'e taşımak gerekirse, `onFileSelect` callback'ine `{ file, previewUrl }` nesnesi döndürmek daha temiz olur. Bunu görmek için `ImageDropZone.jsx`'te `onFileSelect(file)` yerine `onFileSelect({ file, preview: URL.createObjectURL(file) })` kullan ve Home.jsx'te buna göre ayarla.

- [ ] **Step 4: Frontend lint çalıştır**

```bash
cd frontend && npm run lint
```

Beklenen çıktı: Hata yok (uyarılar kabul edilebilir).

- [ ] **Step 5: Frontend'i tarayıcıda test et**

`http://localhost:5173` → "Görsel" sekmesine tıkla:
- Dosya yükleme çalışıyor mu?
- Ctrl+V ile paste çalışıyor mu?
- "Analiz" butonuna tıklayınca istek gidiyor mu?

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/analysis/AnalysisForm.jsx frontend/src/pages/Home.jsx
git commit -m "feat(ui): Görsel analiz sekmesi entegrasyonu (AnalysisForm + Home)"
```

---

## Task 10: Celery Worker Kaydı Doğrulama

**Files:**
- Modify: `workers/tasks.py` (tek satır ekleme)

- [ ] **Step 1: analyze_image task'ını workers/tasks.py'e import et**

`workers/tasks.py` dosyasının en altına ekle (diğer importların altına):

```python
# Görsel analiz task'ını kaydet — worker startup'ta keşfedilsin
from workers.image_analysis_task import analyze_image as _analyze_image_task  # noqa: F401
```

Bu sayede `celery -A workers.tasks worker` komutuyla başlatılan worker `analyze_image` task'ını da çalıştırabilir.

- [ ] **Step 2: Worker'ı yeniden başlat ve task listesini kontrol et**

```bash
celery -A workers.tasks inspect registered
```

Çıktıda `analyze_image` görünmeli.

- [ ] **Step 3: Uçtan uca test**

1. Swagger UI'dan `POST /analyze/image` ile bir JPEG yükle
2. Dönen `task_id` ile `GET /analysis/status/{task_id}` çağır
3. `status: SUCCESS` ve `result.verdict` alanları dolu olmalı

- [ ] **Step 4: Son commit**

```bash
git add workers/tasks.py
git commit -m "feat(worker): analyze_image task kaydını workers.tasks'a ekle"
```
