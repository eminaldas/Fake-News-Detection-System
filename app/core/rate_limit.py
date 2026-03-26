"""
app/core/rate_limit.py
======================
Redis tabanlı rate limiter dependency'leri.

check_rate_limit  → analiz endpoint'leri için günlük limit
check_login_limit → login brute force koruması
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import hash_ip
from app.db.redis import get_redis

log = get_logger(__name__)


def _midnight_epoch() -> int:
    """UTC gece yarısının Unix timestamp'ini döndürür."""
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return int(midnight.timestamp())


async def check_rate_limit(
    request: Request,
    redis: Redis,
    current_user=None,
) -> None:
    """
    Analiz endpoint'lerine manuel çağrı ile bağlanır.
    Admin: sınırsız.
    Kayıtlı user: RATE_LIMIT_USER/gün.
    Anonim: RATE_LIMIT_ANON/gün (IP bazlı).
    """
    # Admin bypass
    if current_user is not None and getattr(current_user, "role", None) is not None:
        from app.models.models import UserRole
        if current_user.role == UserRole.admin:
            return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ip = request.client.host if request.client else "unknown"
    ip_hash = hash_ip(ip)

    if current_user is not None:
        key   = f"rl:user:{current_user.id}:{today}"
        limit = settings.RATE_LIMIT_USER
        key_type = "user"
    else:
        key   = f"rl:anon:{ip_hash}:{today}"
        limit = settings.RATE_LIMIT_ANON
        key_type = "anon"

    count = await redis.incr(key)
    if count == 1:
        await redis.expireat(key, _midnight_epoch())

    remaining = max(0, limit - count)

    log.info(
        "ratelimit.hit",
        key_type=key_type,
        count=count,
        limit=limit,
        remaining=remaining,
    )

    if count > limit:
        log.warning("ratelimit.exceeded", key_type=key_type, ip_hash=ip_hash)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Günlük analiz limitinize ulaştınız.",
            headers={
                "X-RateLimit-Limit":     str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset":     str(_midnight_epoch()),
                "Retry-After":           str(_midnight_epoch() - int(datetime.now(timezone.utc).timestamp())),
            },
        )

    # Kalan bilgisini request.state'e yaz — middleware header'a ekleyecek
    request.state.rate_limit_limit     = limit
    request.state.rate_limit_remaining = remaining
    request.state.rate_limit_reset     = _midnight_epoch()


async def check_login_limit(
    request: Request,
    redis: Redis = Depends(get_redis),
) -> None:
    """
    Login endpoint'ine bağlanır — brute force koruması.
    10 dakikada 10 başarısız deneme → 10 dakika kilit.
    """
    ip = request.client.host if request.client else "unknown"
    ip_hash = hash_ip(ip)
    key = f"login:anon:{ip_hash}"

    count_raw = await redis.get(key)
    count = int(count_raw) if count_raw else 0

    if count >= settings.LOGIN_BRUTE_FORCE_MAX:
        ttl = await redis.ttl(key)
        log.warning("ratelimit.login_locked", ip_hash=ip_hash, ttl_seconds=ttl)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Çok fazla başarısız giriş. {ttl} saniye sonra tekrar deneyin.",
        )


async def record_failed_login(ip: str, redis: Redis) -> None:
    """Başarısız login'de auth.py tarafından çağrılır."""
    ip_hash = hash_ip(ip)
    key = f"login:anon:{ip_hash}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, settings.LOGIN_BRUTE_FORCE_WINDOW_SECONDS)


async def clear_login_limit(ip: str, redis: Redis) -> None:
    """Başarılı login'de sayacı sıfırla."""
    ip_hash = hash_ip(ip)
    await redis.delete(f"login:anon:{ip_hash}")
