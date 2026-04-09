"""
app/api/v1/endpoints/interactions.py
=====================================
Kullanıcı davranış event'lerini kaydeden endpoint.
Fire-and-forget: 202 döner, hiçbir zaman isteği bloklamaz.
"""
import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.db.session import get_db
from app.models.models import ContentInteraction, User
from app.schemas.schemas import InteractionTrackRequest

router = APIRouter()


def _ip_hash(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


@router.post("/track", status_code=202)
async def track_interaction(
    request: Request,
    body:    InteractionTrackRequest,
    db:      AsyncSession = Depends(get_db),
    user:    User | None  = Depends(get_optional_user),
):
    """
    Kullanıcı davranışını kaydeder. Anonim kullanıcılar için ip_hash kullanılır.
    Her zaman 202 döner — istemci sonucu beklemez.
    """
    ip = request.headers.get("X-Forwarded-For", request.client.host or "unknown").split(",")[0].strip()

    content_uuid = None
    if body.content_id and body.interaction_type != "filter_used":
        try:
            content_uuid = uuid.UUID(body.content_id)
        except (ValueError, AttributeError):
            pass

    interaction = ContentInteraction(
        id               = uuid.uuid4(),
        user_id          = user.id if user else None,
        ip_hash          = _ip_hash(ip),
        content_id       = content_uuid,
        interaction_type = body.interaction_type,
        category         = body.category,
        source_domain    = body.source_domain,
        nlp_score_at_time= body.nlp_score_at_time,
        visibility_weight= body.visibility_weight,
        details          = body.details,
        created_at       = datetime.now(timezone.utc),
    )

    try:
        db.add(interaction)
        await db.commit()
    except Exception:
        await db.rollback()
        # Sessizce geç — tracking hatası kullanıcıyı etkilemez

    return {"accepted": True}
