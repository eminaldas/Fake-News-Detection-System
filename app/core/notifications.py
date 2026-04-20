"""
app/core/notifications.py
==========================
Forum bildirim yardımcı modülü.
Notification kaydı oluşturur ve Redis pub/sub üzerinden yayınlar.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pubsub import publish_async
from app.models.models import Notification


async def send_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    notif_type: str,
    payload: dict,
) -> None:
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        payload=payload,
    )
    db.add(notif)
    await db.flush()

    await publish_async(
        channel=f"user:{user_id}:events",
        msg_type="notification.new",
        payload={
            "id":      str(notif.id),
            "type":    notif_type,
            "payload": payload,
        },
    )
