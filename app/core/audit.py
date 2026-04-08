"""
app/core/audit.py
=================
Non-blocking audit event producer ve güvenlik tespit yardımcıları.
Kullanım: await audit_log(redis, "SECURITY", "auth.login_failed", ip=ip, ...)
"""
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from redis.asyncio import Redis

from app.core.security import hash_ip

BUFFER_KEY  = "audit:buffer"
BUFFER_CAP  = 10_000
ALERTS_KEY  = "security_alerts"


def _midnight_epoch() -> int:
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int(midnight.timestamp())


async def audit_log(
    redis: Redis,
    event_type: str,
    event_name: str,
    ip: str = "unknown",
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    path: Optional[str] = None,
    http_method: Optional[str] = None,
    status_code: Optional[int] = None,
    process_time_ms: Optional[float] = None,
    severity: str = "INFO",
    details: Optional[dict] = None,
) -> None:
    """
    Redis buffer'a yazar. ~0.1ms. Asla exception fırlatmaz.
    CRITICAL eventler ayrıca security_alerts sorted set'e yazılır.
    """
    try:
        event = {
            "event_type":      event_type,
            "event_name":      event_name,
            "user_id":         str(user_id) if user_id else None,
            "ip_hash":         hash_ip(ip),
            "session_id":      session_id,
            "path":            path,
            "http_method":     http_method,
            "status_code":     status_code,
            "process_time_ms": process_time_ms,
            "severity":        severity,
            "details":         details or {},
            "created_at":      datetime.now(timezone.utc).isoformat(),
        }
        event_json = json.dumps(event, ensure_ascii=False)

        pipe = redis.pipeline(transaction=True)
        pipe.lpush(BUFFER_KEY, event_json)
        pipe.ltrim(BUFFER_KEY, 0, BUFFER_CAP - 1)

        if severity == "CRITICAL":
            pipe.zadd(ALERTS_KEY, {event_json: time.time()})
            pipe.zremrangebyrank(ALERTS_KEY, 0, -101)  # max 100 aktif alert

        await pipe.execute()
    except Exception:
        pass  # Log pipeline asla ana akışı bloklamaz


# ─────────────────────────────────────────────────────────────────────────────
# Güvenlik Tespit Yardımcıları
# ─────────────────────────────────────────────────────────────────────────────

async def check_credential_stuffing(redis: Redis, ip: str) -> bool:
    """
    Aynı /24 subnet'ten 10 dakika içinde >20 istek → True.
    """
    ip_prefix = ".".join(ip.split(".")[:3]) if "." in ip else ip[:8]
    window    = int(time.time()) // 600        # 10 dakikalık pencere
    key       = f"threat:subnet:{ip_prefix}:{window}"
    count     = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 600)
    return count > 20


async def check_abuse_pattern(redis: Redis, user_id: str) -> bool:
    """
    Aynı kullanıcı günde 3+ rate limit ihlali → True.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key   = f"abuse:{user_id}:{today}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expireat(key, _midnight_epoch())
    return count >= 3


async def update_ip_history(redis: Redis, user_id: str, ip: str) -> bool:
    """
    Bu IP hash daha önce bu kullanıcıyla görülmemişse True döner (geo anomaly).
    Son 10 IP hash tutulur.
    """
    ip_hash = hash_ip(ip)
    key     = f"user:ip_history:{user_id}"
    is_new  = not bool(await redis.sismember(key, ip_hash))
    await redis.sadd(key, ip_hash)
    await redis.expire(key, 30 * 86_400)  # 30 gün TTL
    members = await redis.smembers(key)
    if len(members) > 10:
        excess = list(members)[10:]
        await redis.srem(key, *excess)
    return is_new
