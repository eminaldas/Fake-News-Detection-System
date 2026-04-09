"""
app/api/v1/endpoints/ws.py
===========================
WebSocket endpoint — JWT auth, Redis Pub/Sub mesajlarını browser'a iletir.

Bağlantı: ws://localhost:8000/api/v1/ws?token=<jwt>
"""
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.logging import get_logger
from app.core.security import verify_token
from app.db.redis import get_redis

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    # ── Auth ───────────────────────────────────────────────────────────────
    try:
        token_data = verify_token(token)
    except Exception:
        await ws.close(code=4003)
        return

    await ws.accept()
    logger.info("WS bağlantı kuruldu user_id=%s", token_data.user_id)

    # ── Redis Pub/Sub ──────────────────────────────────────────────────────
    r = await get_redis()
    pubsub = r.pubsub()

    channels = [f"user:{token_data.user_id}:events"]
    if token_data.role == "admin":
        channels.append("admin:events")

    await pubsub.subscribe(*channels)
    logger.debug("WS subscribe kanallar=%s", channels)

    # ── İki concurrent görev ───────────────────────────────────────────────
    # redis_task : Redis mesajı gelince WebSocket'e ilet (sonsuz döngü)
    # closer_task: İstemci bağlantıyı koparınca döngüyü sonlandır
    async def _redis_to_ws():
        try:
            async for msg in pubsub.listen():
                if msg.get("type") == "message":
                    await ws.send_text(msg["data"])
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("WS redis_to_ws hatası user_id=%s hata=%s", token_data.user_id, exc)

    async def _wait_disconnect():
        try:
            while True:
                await ws.receive()   # receive() accepts any frame type (text or binary)
        except WebSocketDisconnect:
            pass
        except Exception as exc:
            logger.warning("WS closer_task beklenmedik hata user_id=%s hata=%s", token_data.user_id, exc)

    redis_task  = asyncio.create_task(_redis_to_ws())
    closer_task = asyncio.create_task(_wait_disconnect())

    try:
        _done, pending = await asyncio.wait(
            {redis_task, closer_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for t in pending:
            t.cancel()
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass
    finally:
        await pubsub.aclose()
        # Don't close r — it's the shared singleton
        logger.info("WS bağlantı kapandı user_id=%s", token_data.user_id)
