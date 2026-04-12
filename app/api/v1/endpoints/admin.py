from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_admin
from app.core.audit import audit_log
from app.core.logging import get_logger
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import User, UserRole, ForumComment, ForumReport, ForumThread
from app.schemas.schemas import (
    AdminUpdateUserRequest, ModerationQueueItem, ModerationQueueResponse,
    PaginatedUserResponse, UserResponse,
)

router = APIRouter()
log    = get_logger(__name__)


@router.get("/users", response_model=PaginatedUserResponse)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * size

    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    items = (
        await db.execute(select(User).order_by(User.created_at.desc()).offset(offset).limit(size))
    ).scalars().all()

    return PaginatedUserResponse(total=total, page=page, size=size, items=items)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: AdminUpdateUserRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    # Kendi admin hesabını değiştirme koruması
    if user.id == admin.id and (
        body.role == UserRole.user or body.is_active is False
    ):
        raise HTTPException(status_code=400, detail="Kendi admin hesabınızı değiştiremezsiniz")

    if body.is_active is not None:
        if not body.is_active and user.role == UserRole.admin:
            other_admins = (
                await db.execute(
                    select(func.count()).where(
                        User.role == UserRole.admin,
                        User.is_active == True,
                        User.id != user_id,
                    )
                )
            ).scalar_one()
            if other_admins == 0:
                raise HTTPException(status_code=400, detail="Son aktif admin devre dışı bırakılamaz")
        user.is_active = body.is_active
        log.info(
            "user.deactivated" if not body.is_active else "user.activated",
            user_id=str(user_id), by_admin_id=str(admin.id)
        )

    if body.role is not None and body.role != user.role:
        old_role = user.role
        user.role = body.role
        log.info("user.role_changed", user_id=str(user_id),
                 old_role=old_role.value, new_role=body.role.value, by_admin_id=str(admin.id))

    await db.commit()
    await db.refresh(user)
    await audit_log(
        redis, "USER_ACTION", "admin.action",
        ip=request.client.host if request.client else "unknown",
        user_id=str(admin.id), severity="INFO",
        details={"action": "update_user", "target_user_id": str(user_id), "changes": body.model_dump(exclude_none=True)},
    )
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if user.role == UserRole.admin:
        other_admins = (
            await db.execute(
                select(func.count()).where(
                    User.role == UserRole.admin, User.is_active == True, User.id != user_id
                )
            )
        ).scalar_one()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Son admin silinemez")

    await db.delete(user)
    await db.commit()
    log.info("user.deleted", user_id=str(user_id), by_admin_id=str(admin.id))
    await audit_log(
        redis, "USER_ACTION", "admin.action",
        ip=request.client.host if request.client else "unknown",
        user_id=str(admin.id), severity="WARNING",
        details={"action": "delete_user", "target_user_id": str(user_id)},
    )


@router.get("/forum/queue", response_model=ModerationQueueResponse)
async def forum_moderation_queue(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Flaglenmiş yorumları sayfalı listeler."""
    offset = (page - 1) * size

    base_filter = ForumComment.moderation_status.in_(["flagged_ai", "flagged_user"])

    total = (await db.execute(
        select(func.count()).where(base_filter)
    )).scalar_one()

    rows = (await db.execute(
        select(ForumComment)
        .options(
            selectinload(ForumComment.user),
            selectinload(ForumComment.thread),
        )
        .where(base_filter)
        .order_by(desc(ForumComment.created_at))
        .offset(offset)
        .limit(size)
    )).scalars().all()

    # Her yorum için rapor sayısını toplu çek
    comment_ids = [c.id for c in rows]
    report_counts: dict = {}
    if comment_ids:
        count_rows = (await db.execute(
            select(ForumReport.comment_id, func.count().label("cnt"))
            .where(ForumReport.comment_id.in_(comment_ids))
            .group_by(ForumReport.comment_id)
        )).all()
        report_counts = {r.comment_id: r.cnt for r in count_rows}

    items = [
        ModerationQueueItem(
            id=c.id,
            body=c.body[:300],
            author=c.user.username if c.user else "?",
            thread_title=c.thread.title if c.thread else "?",
            thread_id=c.thread_id,
            flag_type=c.moderation_status,
            moderation_note=c.moderation_note,
            report_count=report_counts.get(c.id, 0),
            created_at=c.created_at,
        )
        for c in rows
    ]

    return ModerationQueueResponse(items=items, total=total, page=page, size=size)


@router.post("/forum/comments/{comment_id}/approve", status_code=status.HTTP_200_OK)
async def approve_comment(
    comment_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Yorumu temize çıkar; thread'i de active'e al."""
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")

    comment.moderation_status = "clean"
    comment.moderation_note   = None

    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == comment.thread_id)
    )).scalar_one_or_none()
    if thread and thread.status == "under_review":
        thread.status = "active"

    await db.commit()
    return {"message": "Yorum onaylandı."}


@router.post("/forum/comments/{comment_id}/remove", status_code=status.HTTP_200_OK)
async def remove_comment(
    comment_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Yorumu kaldır (soft delete — DB'de tutulur)."""
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")

    comment.moderation_status = "removed"
    await db.commit()
    return {"message": "Yorum kaldırıldı."}
