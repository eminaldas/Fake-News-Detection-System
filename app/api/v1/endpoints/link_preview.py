"""
app/api/v1/endpoints/link_preview.py
=====================================
GET /api/v1/link-preview?url=<url>

Open Graph / YouTube oEmbed önizlemesi.
SSRF guard: app.api.v1.endpoints.proxy._is_safe_url kullanılır.
Redis cache: 24 saat, key = link_preview:{sha256(url)}.
"""
import hashlib
import json
import re
from urllib.parse import urljoin, urlencode

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis

from app.api.deps import get_current_user
from app.api.v1.endpoints.proxy import _is_safe_url
from app.db.redis import get_redis
from app.models.models import User

router = APIRouter()

_YT_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)

_EMPTY = {
    "type": "basic",
    "title": None,
    "description": None,
    "image": None,
    "site": None,
}


def _check_redirect(request, response):
    if response.is_redirect:
        loc = response.headers.get("location", "")
        if loc and not _is_safe_url(loc):
            raise httpx.RequestError("Redirect to unsafe URL blocked")


def parse_og(html: str, base_url: str) -> dict:
    """
    BeautifulSoup + lxml ile Open Graph meta etiketlerini çözer.
    twitter:* etiketlerini og:* yedeği olarak kullanır.
    Göreli og:image URL'lerini base_url ile mutlaklaştırır.
    Yalnızca og:title yoksa <title> tag'ini kullanır.
    """
    soup = BeautifulSoup(html, "lxml")

    def _og(prop: str) -> str | None:
        tag = soup.find("meta", property=f"og:{prop}")
        if tag and tag.get("content"):
            return tag["content"].strip() or None
        return None

    def _twitter(name: str) -> str | None:
        tag = soup.find("meta", attrs={"name": f"twitter:{name}"})
        if tag and tag.get("content"):
            return tag["content"].strip() or None
        return None

    title = _og("title") or _twitter("title")
    if not title:
        t = soup.find("title")
        if t and t.string:
            title = t.string.strip() or None

    description = _og("description") or _twitter("description")

    image = _og("image") or _twitter("image")
    if image:
        image = urljoin(base_url, image)

    site = _og("site_name") or _twitter("site")

    return {
        "title": title,
        "description": description,
        "image": image,
        "site": site,
    }


def youtube_id(url: str) -> str | None:
    """youtube.com/watch?v=, youtu.be/, /shorts/ URL'lerinden video ID çıkarır."""
    m = _YT_RE.search(url)
    return m.group(1) if m else None


def _cache_key(url: str) -> str:
    h = hashlib.sha256(url.encode()).hexdigest()
    return f"link_preview:{h}"


@router.get("/link-preview")
async def get_link_preview(
    url: str = Query(..., description="Önizlenecek URL"),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Verilen URL'nin Open Graph / YouTube oEmbed önizlemesini döndürür.
    Sonuç 24 saat Redis'te cache'lenir.
    Herhangi bir ağ/parse hatası sessizce yakalanır — asla 5xx dönmez.
    """
    if not _is_safe_url(url):
        raise HTTPException(status_code=400, detail="URL güvenli değil")

    key = _cache_key(url)
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)

    result: dict = {**_EMPTY, "url": url}

    try:
        yt = youtube_id(url)
        if yt:
            oembed_url = "https://www.youtube.com/oembed?" + urlencode({"url": url, "format": "json"})
            async with httpx.AsyncClient(timeout=5.0, event_hooks={"response": [_check_redirect]}) as client:
                r = await client.get(oembed_url, follow_redirects=True)
            if r.status_code == 200:
                data = r.json()
                result = {
                    "type": "video",
                    "title": data.get("title"),
                    "description": None,
                    "image": data.get("thumbnail_url"),
                    "site": f"YouTube · {data.get('author_name', '')}".rstrip(" ·"),
                    "url": url,
                }
        else:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, event_hooks={"response": [_check_redirect]}) as client:
                async with client.stream("GET", url) as r:
                    chunks, size = [], 0
                    async for chunk in r.aiter_bytes(chunk_size=65536):
                        size += len(chunk)
                        if size > 512 * 1024:
                            break
                        chunks.append(chunk)
                    final_url = str(r.url)
            body = b"".join(chunks).decode("utf-8", errors="replace")
            og = parse_og(body, final_url)
            img_type = "image" if og.get("image") else "basic"
            result = {
                "type": img_type,
                "title": og.get("title"),
                "description": og.get("description"),
                "image": og.get("image"),
                "site": og.get("site"),
                "url": url,
            }
    except Exception:
        result = {**_EMPTY, "url": url}

    try:
        await redis.setex(key, 86400, json.dumps(result))
    except Exception:
        pass  # cache yazımı kritik değil
    return result
