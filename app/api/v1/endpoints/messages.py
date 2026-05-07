"""
Direkt mesajlaşma — DM sistemi.
WebSocket kanalı: user:{user_id}:events  →  type: dm.new_message
"""
from datetime import datetime, timezone
from typing import Optional
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, and_, update, desc, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.pubsub import publish_async
from app.db.session import get_db
from app.models.models import DirectMessage, User

router = APIRouter()


# ── Şemalar ─────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    content:  str      = Field(..., min_length=1, max_length=2000)
    msg_type: str      = Field("text", pattern="^(text|gif|emoji)$")


class MessageOut(BaseModel):
    id:          str
    sender_id:   str
    receiver_id: str
    content:     str
    msg_type:    str
    is_read:     bool
    created_at:  datetime

    @classmethod
    def from_orm(cls, m: DirectMessage) -> "MessageOut":
        return cls(
            id=str(m.id),
            sender_id=str(m.sender_id),
            receiver_id=str(m.receiver_id),
            content=m.content,
            msg_type=m.msg_type,
            is_read=m.is_read,
            created_at=m.created_at,
        )


class ConversationOut(BaseModel):
    partner_id:    str
    partner_name:  str
    partner_avatar: Optional[str]
    last_message:  str
    last_msg_type: str
    last_at:       datetime
    unread_count:  int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Kullanıcının tüm konuşmaları — her kişiyle en son mesaj."""
    uid = current_user.id

    # En son mesajları group by partner
    subq = (
        select(
            func.case(
                (DirectMessage.sender_id == uid, DirectMessage.receiver_id),
                else_=DirectMessage.sender_id
            ).label("partner_id"),
            func.max(DirectMessage.created_at).label("last_at"),
        )
        .where(or_(DirectMessage.sender_id == uid, DirectMessage.receiver_id == uid))
        .group_by("partner_id")
        .subquery()
    )

    rows = (await db.execute(
        select(subq).order_by(desc(subq.c.last_at))
    )).all()

    result = []
    for row in rows:
        partner_id = row.partner_id
        partner = await db.get(User, partner_id)
        if not partner:
            continue

        # En son mesaj
        last_msg = (await db.execute(
            select(DirectMessage)
            .where(or_(
                and_(DirectMessage.sender_id == uid,   DirectMessage.receiver_id == partner_id),
                and_(DirectMessage.sender_id == partner_id, DirectMessage.receiver_id == uid),
            ))
            .order_by(desc(DirectMessage.created_at))
            .limit(1)
        )).scalar_one_or_none()

        if not last_msg:
            continue

        # Okunmamış sayısı
        unread = (await db.execute(
            select(func.count()).select_from(DirectMessage).where(
                DirectMessage.sender_id == partner_id,
                DirectMessage.receiver_id == uid,
                DirectMessage.is_read == False,
            )
        )).scalar_one()

        result.append(ConversationOut(
            partner_id=str(partner_id),
            partner_name=partner.username,
            partner_avatar=partner.avatar_url,
            last_message=last_msg.content,
            last_msg_type=last_msg.msg_type,
            last_at=last_msg.created_at,
            unread_count=unread,
        ))

    return {"conversations": [c.model_dump() for c in result]}


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    count = (await db.execute(
        select(func.count()).select_from(DirectMessage).where(
            DirectMessage.receiver_id == current_user.id,
            DirectMessage.is_read == False,
        )
    )).scalar_one()
    return {"count": count}


@router.get("/{user_id}")
async def get_conversation(
    user_id:      _uuid.UUID,
    page:         int  = Query(1, ge=1),
    size:         int  = Query(40, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """İki kullanıcı arasındaki mesajlar (sayfalı, yeniden eskiye)."""
    uid        = current_user.id
    partner_id = user_id

    partner = await db.get(User, partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    q = (
        select(DirectMessage)
        .where(or_(
            and_(DirectMessage.sender_id == uid,        DirectMessage.receiver_id == partner_id),
            and_(DirectMessage.sender_id == partner_id, DirectMessage.receiver_id == uid),
        ))
        .order_by(desc(DirectMessage.created_at))
    )
    total    = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    messages = (await db.execute(q.offset((page - 1) * size).limit(size))).scalars().all()

    # Gelen mesajları okundu işaretle
    await db.execute(
        update(DirectMessage)
        .where(
            DirectMessage.sender_id   == partner_id,
            DirectMessage.receiver_id == uid,
            DirectMessage.is_read     == False,
        )
        .values(is_read=True)
    )
    await db.commit()

    return {
        "messages": [MessageOut.from_orm(m).model_dump() for m in reversed(messages)],
        "total":    total,
        "page":     page,
        "partner":  {
            "id":         str(partner.id),
            "username":   partner.username,
            "avatar_url": partner.avatar_url,
        },
    }


@router.post("/{user_id}", status_code=201)
async def send_message(
    user_id:      _uuid.UUID,
    body:         SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Kullanıcıya mesaj gönder, WebSocket ile anlık ilet."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinize mesaj gönderemezsiniz")

    partner = await db.get(User, user_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=user_id,
        content=body.content.strip(),
        msg_type=body.msg_type,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # WebSocket ile alıcıya ilet
    await publish_async(
        channel=f"user:{user_id}:events",
        msg_type="dm.new_message",
        payload={
            "id":           str(msg.id),
            "sender_id":    str(current_user.id),
            "sender_name":  current_user.username,
            "sender_avatar": current_user.avatar_url,
            "content":      msg.content,
            "msg_type":     msg.msg_type,
            "created_at":   msg.created_at.isoformat(),
        },
    )

    return MessageOut.from_orm(msg).model_dump()
