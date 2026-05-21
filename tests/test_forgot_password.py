import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.redis import get_redis
from app.db.session import get_db


def _mock_redis(data: dict = None):
    """In-memory Redis mock."""
    store = dict(data or {})
    r = AsyncMock()
    r.get = AsyncMock(side_effect=lambda k: store.get(k))
    r.setex = AsyncMock(side_effect=lambda k, ttl, v: store.update({k: v}))
    r.delete = AsyncMock(side_effect=lambda k: store.pop(k, None))
    r._store = store
    return r


def _mock_db_with_user(user=None):
    """DB session mock; returns given user on execute."""
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=user)
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


def _build_app():
    from app.api.v1.endpoints.auth import router
    app = FastAPI()
    app.include_router(router, prefix="/auth")
    return app


def test_forgot_password_unknown_email_returns_200():
    """Email enumeration koruması: bilinmeyen email de 200 döner."""
    mock_r = _mock_redis()
    mock_d = _mock_db_with_user(None)
    app = _build_app()
    app.dependency_overrides[get_redis] = lambda: mock_r
    app.dependency_overrides[get_db]    = lambda: mock_d
    with TestClient(app) as c:
        r = c.post("/auth/forgot-password", json={"email": "yok@ornek.com"})
    assert r.status_code == 200
    assert "message" in r.json()
    assert len(mock_r._store) == 0
    app.dependency_overrides.clear()


def test_forgot_password_known_email_saves_token_to_redis():
    """Geçerli email ile çağrıldığında Redis'e pwd_reset: token yazılır."""
    from app.models.models import User
    import uuid
    fake_user = MagicMock(spec=User)
    fake_user.id    = uuid.uuid4()
    fake_user.email = "mevcut@ornek.com"
    fake_user.username = "testuser"

    mock_r = _mock_redis()
    mock_d = _mock_db_with_user(fake_user)
    app = _build_app()
    app.dependency_overrides[get_redis] = lambda: mock_r
    app.dependency_overrides[get_db]    = lambda: mock_d
    with patch("app.api.v1.endpoints.auth._send_reset_email"):
        with TestClient(app) as c:
            r = c.post("/auth/forgot-password", json={"email": "mevcut@ornek.com"})
    assert r.status_code == 200
    reset_keys = [k for k in mock_r._store if k.startswith("pwd_reset:")]
    assert len(reset_keys) == 1
    app.dependency_overrides.clear()


def test_forgot_password_invalid_email_returns_422():
    app = _build_app()
    app.dependency_overrides[get_redis] = lambda: _mock_redis()
    app.dependency_overrides[get_db]    = lambda: _mock_db_with_user(None)
    with TestClient(app) as c:
        r = c.post("/auth/forgot-password", json={"email": "not-an-email"})
    assert r.status_code == 422
    app.dependency_overrides.clear()


def test_reset_password_invalid_token_returns_400():
    """Token Redis'te yoksa 400 döner."""
    mock_r = _mock_redis()
    mock_d = _mock_db_with_user(None)
    app = _build_app()
    app.dependency_overrides[get_redis] = lambda: mock_r
    app.dependency_overrides[get_db]    = lambda: mock_d
    with TestClient(app) as c:
        r = c.post("/auth/reset-password", json={
            "token": "gecersiztoken123456",
            "new_password": "YeniSifre1",
        })
    assert r.status_code == 400
    app.dependency_overrides.clear()


def test_reset_password_valid_token_updates_password():
    """Geçerli token ile şifre güncellenir, token silinir."""
    import uuid
    from app.models.models import User
    user_id = str(uuid.uuid4())
    fake_user = MagicMock(spec=User)
    fake_user.id = uuid.UUID(user_id)
    fake_user.hashed_password = "old_hash"

    token = "gecerlitoken12345678901234567890123"
    mock_r = _mock_redis({f"pwd_reset:{token}": user_id})
    mock_d = _mock_db_with_user(fake_user)
    app = _build_app()
    app.dependency_overrides[get_redis] = lambda: mock_r
    app.dependency_overrides[get_db]    = lambda: mock_d
    with TestClient(app) as c:
        r = c.post("/auth/reset-password", json={
            "token": token,
            "new_password": "YeniGuvenliSifre1",
        })
    assert r.status_code == 200
    assert f"pwd_reset:{token}" not in mock_r._store
    assert fake_user.hashed_password != "old_hash"
    app.dependency_overrides.clear()


def test_reset_password_weak_password_returns_422():
    app = _build_app()
    app.dependency_overrides[get_redis] = lambda: _mock_redis()
    app.dependency_overrides[get_db]    = lambda: _mock_db_with_user(None)
    with TestClient(app) as c:
        r = c.post("/auth/reset-password", json={
            "token": "sometoken12345",
            "new_password": "short",
        })
    assert r.status_code == 422
    app.dependency_overrides.clear()
