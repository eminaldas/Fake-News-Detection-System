import hashlib
import ipaddress
import socket
from io import BytesIO
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from PIL import Image
from redis.asyncio import Redis

from app.db.redis import get_raw_redis

router = APIRouter()

_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

_BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname == "localhost":
            return False
        try:
            ip = ipaddress.ip_address(hostname)
            return not any(ip in net for net in _BLOCKED_NETWORKS)
        except ValueError:
            pass  # hostname, sayısal IP değil — DNS ile devam et
        try:
            resolved = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(resolved)
            return not any(ip in net for net in _BLOCKED_NETWORKS)
        except OSError:
            return False
    except Exception:
        return False


def _cache_key(url: str, width: int) -> str:
    h = hashlib.sha256(url.encode()).hexdigest()
    return f"imgproxy:{h}:{width}"


@router.get("/image")
async def proxy_image(
    url: str = Query(..., description="Proxied image URL"),
    w:   int = Query(400, ge=50, le=1200, description="Output width px"),
    redis: Redis = Depends(get_raw_redis),
) -> Response:
    if not _is_safe_url(url):
        raise HTTPException(status_code=403, detail="URL not allowed")

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

    try:
        img = Image.open(BytesIO(r.content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")

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
