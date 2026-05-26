"""
Direkt mesajlaşma — DM sistemi.
WebSocket kanalı: user:{user_id}:events  →  type: dm.new_message
"""
from datetime import datetime, timezone
from typing import Optional
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, and_, update, desc, text, case, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.pubsub import publish_async
from app.db.session import get_db
from app.models.models import DirectMessage, User

router = APIRouter()


# ── Şemalar ─────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    content:     str            = Field(..., min_length=1, max_length=2000)
    msg_type:    str            = Field("text", pattern="^(text|gif|emoji)$")
    reply_to_id: Optional[str] = None


class ReplyPreview(BaseModel):
    id:        str
    content:   str
    msg_type:  str
    sender_id: str


class MessageOut(BaseModel):
    id:          str
    sender_id:   str
    receiver_id: str
    content:     str
    msg_type:    str
    is_read:     bool
    reply_to_id: Optional[str]
    reply_to:    Optional[ReplyPreview]
    created_at:  datetime

    @classmethod
    def from_orm(cls, m: DirectMessage) -> "MessageOut":
        reply_preview = None
        if m.reply_to:
            reply_preview = ReplyPreview(
                id=str(m.reply_to.id),
                content=m.reply_to.content,
                msg_type=m.reply_to.msg_type,
                sender_id=str(m.reply_to.sender_id),
            )
        return cls(
            id=str(m.id),
            sender_id=str(m.sender_id),
            receiver_id=str(m.receiver_id),
            content=m.content,
            msg_type=m.msg_type,
            is_read=m.is_read,
            reply_to_id=str(m.reply_to_id) if m.reply_to_id else None,
            reply_to=reply_preview,
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

    subq = (
        select(
            case(
                (DirectMessage.sender_id == uid, DirectMessage.receiver_id),
                else_=DirectMessage.sender_id
            ).label("partner_id"),
            func.max(DirectMessage.created_at).label("last_at"),
        )
        .where(or_(DirectMessage.sender_id == uid, DirectMessage.receiver_id == uid))
        .group_by(text("partner_id"))
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
        .options(selectinload(DirectMessage.reply_to))
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

    partner_trust = getattr(partner, 'trust_tier', None)
    partner_label = getattr(partner, 'trust_label', None)

    return {
        "messages": [MessageOut.from_orm(m).model_dump() for m in reversed(messages)],
        "total":    total,
        "page":     page,
        "partner":  {
            "id":          str(partner.id),
            "username":    partner.username,
            "avatar_url":  partner.avatar_url,
            "trust_tier":  partner_trust,
            "trust_label": partner_label,
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

    reply_to_id = None
    reply_preview_data = None
    if body.reply_to_id:
        try:
            reply_uuid = _uuid.UUID(body.reply_to_id)
            replied = await db.get(DirectMessage, reply_uuid)
            if replied:
                reply_to_id = reply_uuid
                reply_preview_data = {
                    "id":        str(replied.id),
                    "content":   replied.content,
                    "msg_type":  replied.msg_type,
                    "sender_id": str(replied.sender_id),
                }
        except ValueError:
            pass

    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=user_id,
        content=body.content.strip(),
        msg_type=body.msg_type,
        reply_to_id=reply_to_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

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
            "reply_to_id":  str(reply_to_id) if reply_to_id else None,
            "reply_to":     reply_preview_data,
            "created_at":   msg.created_at.isoformat(),
        },
    )

    out = MessageOut.from_orm(msg)
    # reply_to ilişkisi henüz yüklenmediyse manuel ekle
    if reply_to_id and not out.reply_to and reply_preview_data:
        out = out.model_copy(update={"reply_to": ReplyPreview(**reply_preview_data)})
    return out.model_dump()


@router.delete("/{message_id}", status_code=204)
async def delete_message(
    message_id:   _uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Mesajı sil — sadece gönderen silebilir."""
    msg = await db.get(DirectMessage, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu mesajı silemezsiniz")

    await db.delete(msg)
    await db.commit()
