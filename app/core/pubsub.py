"""
app/core/pubsub.py
==================
Redis Pub/Sub publish yardımcısı.
Hem FastAPI (async context) hem Celery worker (asyncio.run içinde) tarafından çağrılır.
"""
import json

from app.core.logging import get_logger
from app.db.redis import get_redis

log = get_logger(__name__)


async def publish_async(channel: str, msg_type: str, payload: dict) -> None:
    """
    Verilen kanala JSON mesaj yayınlar.
    get_redis() singleton'ını kullanır — aynı event loop içinde birden fazla
    çağrıda bağlantıyı yeniden kullanır.
    """
    try:
        r = await get_redis()
        await r.publish(channel, json.dumps({"type": msg_type, "payload": payload}, ensure_ascii=False))
    except Exception as exc:
        log.warning("publish_async.failed", channel=channel, msg_type=msg_type, error=str(exc))
