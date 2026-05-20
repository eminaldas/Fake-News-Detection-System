import pytest
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.db.redis import get_raw_redis


def _make_png(w=120, h=80) -> bytes:
    img = Image.new("RGB", (w, h), color=(80, 120, 200))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _mock_redis(cached=None):
    r = AsyncMock()
    r.get = AsyncMock(return_value=cached)
    r.setex = AsyncMock(return_value=True)
    return r


def _mock_http(status=200, content=None):
    resp = MagicMock()
    resp.status_code = status
    resp.content = content or _make_png()
    client = AsyncMock()
    client.get = AsyncMock(return_value=resp)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    return client


def _build_app():
    from app.api.v1.endpoints.proxy import router
    app = FastAPI()
    app.include_router(router, prefix="/proxy")
    return app


# ── Pure function tests (no mocking needed) ────────────────────────────────

def test_cache_key_is_deterministic():
    from app.api.v1.endpoints.proxy import _cache_key
    assert _cache_key("https://image.cnnturk.com/x.jpg", 400) == \
           _cache_key("https://image.cnnturk.com/x.jpg", 400)


def test_cache_key_differs_by_width():
    from app.api.v1.endpoints.proxy import _cache_key
    assert _cache_key("https://image.cnnturk.com/x.jpg", 400) != \
           _cache_key("https://image.cnnturk.com/x.jpg", 200)


def test_cache_key_differs_by_url():
    from app.api.v1.endpoints.proxy import _cache_key
    assert _cache_key("https://image.cnnturk.com/a.jpg", 400) != \
           _cache_key("https://image.cnnturk.com/b.jpg", 400)


# ── Endpoint tests ─────────────────────────────────────────────────────────

def test_blocked_domain_returns_403():
    app = _build_app()
    app.dependency_overrides[get_raw_redis] = lambda: _mock_redis()
    with TestClient(app) as c:
        r = c.get("/proxy/image?url=https://evil.example.com/img.jpg")
    assert r.status_code == 403
    app.dependency_overrides.clear()


def test_cache_hit_returns_webp_without_http_call():
    fake_webp = b"RIFF\x00\x00\x00\x00WEBPVP8 fake"
    mock_r = _mock_redis(cached=fake_webp)
    app = _build_app()
    app.dependency_overrides[get_raw_redis] = lambda: mock_r
    with TestClient(app) as c:
        r = c.get("/proxy/image?url=https://image.cnnturk.com/foo.jpg")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/webp"
    assert r.content == fake_webp
    mock_r.setex.assert_not_called()
    app.dependency_overrides.clear()


def test_cache_miss_resizes_and_caches():
    mock_r = _mock_redis()
    app = _build_app()
    app.dependency_overrides[get_raw_redis] = lambda: mock_r
    with patch("app.api.v1.endpoints.proxy.httpx.AsyncClient") as cls:
        cls.return_value = _mock_http(content=_make_png(720, 490))
        with TestClient(app) as c:
            r = c.get("/proxy/image?url=https://image.cnnturk.com/foo.jpg&w=200")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/webp"
    assert "max-age=3600" in r.headers["cache-control"]
    mock_r.setex.assert_called_once()
    cached_key = mock_r.setex.call_args[0][0]
    assert ":200" in cached_key
    app.dependency_overrides.clear()


def test_source_4xx_returns_502():
    mock_r = _mock_redis()
    app = _build_app()
    app.dependency_overrides[get_raw_redis] = lambda: mock_r
    with patch("app.api.v1.endpoints.proxy.httpx.AsyncClient") as cls:
        cls.return_value = _mock_http(status=404, content=b"")
        with TestClient(app) as c:
            r = c.get("/proxy/image?url=https://image.cnnturk.com/gone.jpg")
    assert r.status_code == 502
    app.dependency_overrides.clear()


def test_oversized_source_returns_400():
    mock_r = _mock_redis()
    app = _build_app()
    app.dependency_overrides[get_raw_redis] = lambda: mock_r
    big_content = b"x" * (5 * 1024 * 1024 + 1)
    with patch("app.api.v1.endpoints.proxy.httpx.AsyncClient") as cls:
        cls.return_value = _mock_http(content=big_content)
        with TestClient(app) as c:
            r = c.get("/proxy/image?url=https://image.cnnturk.com/huge.jpg")
    assert r.status_code == 400
    app.dependency_overrides.clear()


def test_width_clamp_rejects_out_of_range():
    app = _build_app()
    app.dependency_overrides[get_raw_redis] = lambda: _mock_redis()
    with TestClient(app) as c:
        r = c.get("/proxy/image?url=https://image.cnnturk.com/x.jpg&w=10")
    assert r.status_code == 422
    with TestClient(app) as c:
        r = c.get("/proxy/image?url=https://image.cnnturk.com/x.jpg&w=9999")
    assert r.status_code == 422
    app.dependency_overrides.clear()
