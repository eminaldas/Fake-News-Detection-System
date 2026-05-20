import hashlib
from io import BytesIO
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from PIL import Image
from redis.asyncio import Redis

from app.db.redis import get_raw_redis

router = APIRouter()

ALLOWED_DOMAINS = frozenset({
    "image.cnnturk.com",
    "images.haberler.com",
    "i.sabah.com.tr",
    "i.hurriyettv.com",
    "cdn.ntv.com.tr",
    "im.haberturk.com",
    "upload.wikimedia.org",
    "medya.aa.com.tr",
    "image.aa.com.tr",
    "img.a-haber.com",
    "i.posta.com.tr",
    "i.sozcu.com.tr",
    "iavm.cnnturk.com",
})

_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _cache_key(url: str, width: int) -> str:
    h = hashlib.sha256(url.encode()).hexdigest()
    return f"imgproxy:{h}:{width}"


@router.get("/image")
async def proxy_image(
    url: str = Query(..., description="Proxied image URL"),
    w:   int = Query(400, ge=50, le=1200, description="Output width px"),
    redis: Redis = Depends(get_raw_redis),
) -> Response:
    domain = urlparse(url).hostname or ""
    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(status_code=403, detail="Domain not allowed")

    key = _cache_key(url, w)
    cached = await redis.get(key)
    if cached:
        return Response(
            content=cached,
            media_type="image/webp",
            headers={"Cache-Control": "public, max-age=3600"},
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, follow_redirects=True)
    except httpx.TimeoutException:
        raise HTTPException(status_code=502, detail="Source image timed out")

    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail="Source image unavailable")

    if len(r.content) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="Source image too large")

    img = Image.open(BytesIO(r.content)).convert("RGB")
    new_h = int(img.height * w / img.width)
    img = img.resize((w, new_h), Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="WEBP", quality=80)
    webp = buf.getvalue()

    await redis.setex(key, 3600, webp)

    return Response(
        content=webp,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=3600"},
    )
