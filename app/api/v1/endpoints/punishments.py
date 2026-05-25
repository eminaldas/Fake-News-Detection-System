"""
app/api/v1/endpoints/punishments.py
=====================================
Kullanıcı uyarı ve ceza yönetimi.

Roller:
  - GET  /admin/users/{id}/warnings     → moderator+
  - POST /admin/users/{id}/punish       → superadmin
  - POST /admin/users/{id}/lift         → superadmin
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_moderator, require_superadmin
from app.core.audit import audit_log
from app.core.email import send_warning_mail, send_ban_lift_mail
from app.core.logging import get_logger
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import User, UserRole, UserWarning
from app.schemas.schemas import LiftRequest, PunishRequest, WarningResponse

router = APIRouter()
log    = get_logger(__name__)

_ADMIN_ROLES = {UserRole.admin, UserRole.superadmin}


def _is_protected(target: User, actor: User) -> bool:
    """Admin/superadmin'i başka birinin cezalandırmasını engelle."""
    return target.role in _ADMIN_ROLES and actor.id != target.id


async def _get_target(user_id: UUID, db: AsyncSession) -> User:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


# ── GET /admin/users/{user_id}/warnings ───────────────────────────────────

@router.get("/users/{user_id}/warnings", response_model=list[WarningResponse])
async def list_warnings(
    user_id: UUID,
    admin: User      = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(UserWarning)
            .where(UserWarning.user_id == user_id)
            .order_by(desc(UserWarning.created_at))
        )
    ).scalars().all()
    return rows


# ── POST /admin/users/{user_id}/punish ────────────────────────────────────

@router.post("/users/{user_id}/punish", status_code=200)
async def punish_user(
    user_id: UUID,
    body:    PunishRequest,
    admin:   User          = Depends(require_superadmin),
    db:      AsyncSession  = Depends(get_db),
    redis                  = Depends(get_redis),
):
    target = await _get_target(user_id, db)

    if _is_protected(target, admin):
        raise HTTPException(status_code=403, detail="Bu kullanıcıya işlem uygulanamaz")

    restr_dict = None

    match body.action:
        case "warn":
            pass  # sadece kayıt + mail

        case "restrict":
            if not body.restrictions:
                raise HTTPException(status_code=422, detail="restrict için restrictions alanı zorunlu")
            restr_dict = body.restrictions.model_dump()
            target.can_comment       = restr_dict["can_comment"]
            target.can_post_analysis = restr_dict["can_post_analysis"]
            target.can_create_thread = restr_dict["can_create_thread"]
            target.restriction_reason = body.reason

        case "shadow_ban":
            target.is_shadow_banned = True
            target.restriction_reason = body.reason

        case "ban":
            target.is_active = False
            target.restriction_reason = body.reason
            # Aktif oturumları Redis'ten geçersiz kıl
            await redis.set(f"blacklist:user:{str(user_id)}", "1", ex=60 * 60 * 24 * 365)

    # Uyarı kaydı
    warning = UserWarning(
        user_id=user_id,
        admin_id=admin.id,
        action=body.action,
        reason=body.reason,
        restrictions=restr_dict,
    )
    db.add(warning)
    await db.commit()

    # Mail gönder (arka planda — başarısız olsa bile işlem bozulmaz)
    try:
        await send_warning_mail(
            to_email=target.email,
            username=target.username,
            reason=body.reason,
            action=body.action,
            restrictions=restr_dict,
        )
    except Exception:
        pass

    await audit_log(
        redis,
        event_type="ADMIN",
        event_name="admin.action",
        user_id=str(admin.id),
        severity="WARNING",
        details={"action": body.action, "target_id": str(user_id), "reason": body.reason},
    )

    log.info("punish.applied", admin=str(admin.id), target=str(user_id), action=body.action)
    return {"ok": True, "action": body.action}


# ── POST /admin/users/{user_id}/lift ──────────────────────────────────────

@router.post("/users/{user_id}/lift", status_code=200)
async def lift_punishment(
    user_id: UUID,
    body:    LiftRequest,
    admin:   User          = Depends(require_superadmin),
    db:      AsyncSession  = Depends(get_db),
    redis                  = Depends(get_redis),
):
    target = await _get_target(user_id, db)

    lifted = False

    if body.lift_ban and not target.is_active:
        target.is_active = True
        await redis.delete(f"blacklist:user:{str(user_id)}")
        lifted = True

    if body.lift_shadow_ban and target.is_shadow_banned:
        target.is_shadow_banned = False
        lifted = True

    if body.lift_restrictions:
        target.can_comment       = True
        target.can_post_analysis = True
        target.can_create_thread = True
        target.restriction_reason = None
        lifted = True

    if not lifted:
        raise HTTPException(status_code=400, detail="Kaldırılacak kısıtlama bulunamadı")

    await db.commit()

    try:
        await send_ban_lift_mail(to_email=target.email, username=target.username)
    except Exception:
        pass

    await audit_log(
        redis,
        event_type="ADMIN",
        event_name="admin.action",
        user_id=str(admin.id),
        severity="INFO",
        details={"action": "lift", "target_id": str(user_id)},
    )

    return {"ok": True, "action": "lift"}
