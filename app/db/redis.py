"""
app/db/redis.py
===============
Async Redis bağlantı dependency'si.
Her endpoint: redis: Redis = Depends(get_redis)
Binary data için: redis: Redis = Depends(get_raw_redis)
"""
from redis.asyncio import Redis, from_url
from app.core.config import settings

_redis_client: Redis | None = None
_raw_redis_client: Redis | None = None


async def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = await from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def get_raw_redis() -> Redis:
    """Binary-safe Redis client (decode_responses=False). Image proxy için."""
    global _raw_redis_client
    if _raw_redis_client is None:
        _raw_redis_client = await from_url(
            settings.REDIS_URL,
            decode_responses=False,
        )
    return _raw_redis_client


async def close_redis() -> None:
    global _redis_client, _raw_redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
    if _raw_redis_client is not None:
        await _raw_redis_client.aclose()
        _raw_redis_client = None
