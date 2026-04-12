"""
app/api/v1/endpoints/notifications.py
========================================
GET  /api/v1/notifications          — kullanıcının bildirimlerini listele
PATCH /api/v1/notifications/{id}/read — okundu işaretle
GET  /api/v1/notifications/prefs    — bildirim tercihleri
PATCH /api/v1/notifications/prefs   — bildirim tercihlerini güncelle
"""

import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import User, UserNotification, UserNotificationPrefs
from app.schemas.schemas import (
    NotificationListResponse,
    NotificationPrefsResponse,
    NotificationPrefsUpdate,
    NotificationResponse,
)

router = APIRouter()


@router.get("/prefs", response_model=NotificationPrefsResponse)
async def get_notification_prefs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = (await db.execute(
        select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == current_user.id)
    )).scalar_one_or_none()
    if not prefs:
        return NotificationPrefsResponse(high_risk_alert=True, email_digest=False)
    return prefs


@router.patch("/prefs", response_model=NotificationPrefsResponse)
async def update_notification_prefs(
    body: NotificationPrefsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = (await db.execute(
        select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == current_user.id)
    )).scalar_one_or_none()

    if not prefs:
        prefs = UserNotificationPrefs(user_id=current_user.id)
        db.add(prefs)

    if body.high_risk_alert is not None:
        prefs.high_risk_alert = body.high_risk_alert
    if body.email_digest is not None:
        prefs.email_digest = body.email_digest

    await db.commit()
    await db.refresh(prefs)
    return prefs


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(30)
    )).scalars().all()

    unread = sum(1 for n in rows if not n.is_read)
    return NotificationListResponse(items=list(rows), unread_count=unread)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: _uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notif = (await db.execute(
        select(UserNotification).where(
            UserNotification.id == notification_id,
            UserNotification.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    if not notif:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif
