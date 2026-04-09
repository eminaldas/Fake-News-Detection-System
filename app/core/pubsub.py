"""
app/core/pubsub.py
==================
Redis Pub/Sub publish yardımcısı.
Hem FastAPI (async context) hem Celery worker (asyncio.run içinde) tarafından çağrılır.
"""
import json
import logging

from app.db.redis import get_redis

logger = logging.getLogger(__name__)


async def publish_async(channel: str, msg_type: str, payload: dict) -> None:
    """
    Verilen kanala JSON mesaj yayınlar.
    get_redis() singleton'ını kullanır — aynı event loop içinde birden fazla
    çağrıda bağlantıyı yeniden kullanır.
    """
    try:
        r = await get_redis()
        await r.publish(channel, json.dumps({"type": msg_type, "payload": payload}))
    except Exception as exc:
        logger.warning("publish_async başarısız channel=%s type=%s: %s", channel, msg_type, exc)
