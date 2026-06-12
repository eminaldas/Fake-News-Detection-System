from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy import cast, String, select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.api.deps import get_current_user, require_admin
from app.core.audit import audit_log
from app.core.logging import get_logger
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import AnalysisRequest, Article, AnalysisResult, User, UserRole, ForumComment, ForumReport, ForumThread
from app.schemas.schemas import (
    AdminUpdateUserRequest, AdminUserResponse, ModerationQueueItem, ModerationQueueResponse,
    PaginatedAdminUserResponse, PaginatedUserResponse, ShadowBanRequest, UserResponse,
    XPDeltaRequest, ArticleResponse,
)

router = APIRouter()
log    = get_logger(__name__)


@router.get("/users", response_model=PaginatedAdminUserResponse)
async def list_users(
    page: int           = Query(1, ge=1),
    size: int           = Query(20, ge=1, le=100),
    q:    str           = Query(None, description="username veya email ara"),
    admin: User         = Depends(require_admin),
    db: AsyncSession    = Depends(get_db),
):
    offset  = (page - 1) * size
    filters = []
    if q:
        like = f"%{q}%"
        from sqlalchemy import or_
        filters.append(or_(User.username.ilike(like), User.email.ilike(like)))

    base = select(User)
    if filters:
        base = base.where(*filters)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    items = (
        await db.execute(base.order_by(User.created_at.desc()).offset(offset).limit(size))
    ).scalars().all()

    return PaginatedAdminUserResponse(total=total, page=page, size=size, items=items)


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


@router.post("/users/{user_id}/restore", response_model=UserResponse)
async def restore_user(
    user_id: UUID,
    request: Request,
    admin:   User         = Depends(require_admin),
    db:      AsyncSession = Depends(get_db),
    redis    = Depends(get_redis),
):
    """Soft-delete edilmiş hesabı geri yükle."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.deleted_at is None:
        raise HTTPException(status_code=400, detail="Bu hesap silinmiş değil")

    user.deleted_at = None
    user.is_active  = True
    await db.commit()
    await db.refresh(user)
    log.info("user.restored", user_id=str(user_id), by_admin_id=str(admin.id))
    await audit_log(
        redis, "USER_ACTION", "admin.action",
        ip=request.client.host if request.client else "unknown",
        user_id=str(admin.id), severity="INFO",
        details={"action": "restore_user", "target_user_id": str(user_id)},
    )
    return user


@router.patch("/users/{user_id}/shadow-ban", response_model=AdminUserResponse)
async def toggle_shadow_ban(
    user_id: UUID,
    body:    ShadowBanRequest,
    request: Request,
    admin:   User         = Depends(require_admin),
    db:      AsyncSession = Depends(get_db),
    redis    = Depends(get_redis),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınıza shadow ban uygulayamazsınız")

    user.is_shadow_banned = body.ban
    await db.commit()
    await db.refresh(user)
    log.info("user.shadow_ban_toggled", user_id=str(user_id), ban=body.ban, by_admin_id=str(admin.id))
    await audit_log(
        redis, "USER_ACTION", "admin.shadow_ban",
        ip=request.client.host if request.client else "unknown",
        user_id=str(admin.id), severity="WARNING",
        details={"action": "shadow_ban", "target_user_id": str(user_id), "ban": body.ban},
    )
    return user


@router.post("/users/{user_id}/sessions/terminate", status_code=status.HTTP_200_OK)
async def terminate_sessions(
    user_id: UUID,
    request: Request,
    admin:   User         = Depends(require_admin),
    db:      AsyncSession = Depends(get_db),
    redis    = Depends(get_redis),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi oturumlarınızı bu yolla sonlandıramazsınız")

    await redis.setex(f"blacklist:user:{user_id}", 1800, "1")

    log.info("user.sessions_terminated", user_id=str(user_id), by_admin_id=str(admin.id))
    await audit_log(
        redis, "USER_ACTION", "admin.force_logout",
        ip=request.client.host if request.client else "unknown",
        user_id=str(admin.id), severity="WARNING",
        details={"action": "terminate_sessions", "target_user_id": str(user_id)},
    )
    return {"message": "Tüm oturumlar sonlandırıldı."}


@router.patch("/users/{user_id}/xp", response_model=AdminUserResponse)
async def adjust_xp(
    user_id: UUID,
    body:    XPDeltaRequest,
    request: Request,
    admin:   User         = Depends(require_admin),
    db:      AsyncSession = Depends(get_db),
    redis    = Depends(get_redis),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    old_xp        = user.total_xp
    user.total_xp = max(0, user.total_xp + body.delta)
    await db.commit()
    await db.refresh(user)
    log.info("user.xp_adjusted", user_id=str(user_id), delta=body.delta, new_xp=user.total_xp, by_admin_id=str(admin.id))
    await audit_log(
        redis, "USER_ACTION", "admin.adjust_xp",
        ip=request.client.host if request.client else "unknown",
        user_id=str(admin.id), severity="INFO",
        details={"action": "adjust_xp", "target_user_id": str(user_id), "delta": body.delta, "old_xp": old_xp, "new_xp": user.total_xp},
    )
    return user


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



@router.get("/forum/posts")
async def list_forum_posts(
    type:   str           = Query("thread", description="thread | comment"),
    page:   int           = Query(1, ge=1),
    size:   int           = Query(20, ge=1, le=100),
    q:      Optional[str] = Query(None),
    admin:  User          = Depends(require_admin),
    db:     AsyncSession  = Depends(get_db),
):
    """Admin: tüm thread veya yorumları listele (silinmemiş)."""
    offset = (page - 1) * size

    if type == "thread":
        base = (
            select(ForumThread)
            .options(selectinload(ForumThread.user))
            .where(ForumThread.status != "removed")
        )
        if q:
            base = base.where(ForumThread.title.ilike(f"%{q}%"))
        total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
        rows  = (await db.execute(base.order_by(desc(ForumThread.created_at)).offset(offset).limit(size))).scalars().all()
        items = [
            {
                "id":         str(t.id),
                "type":       "thread",
                "author":     t.user.username if t.user else "?",
                "author_id":  str(t.user_id),
                "title":      t.title,
                "body":       t.body[:300],
                "category":   t.category,
                "status":     t.status,
                "comment_count": t.comment_count,
                "created_at": t.created_at.isoformat(),
            }
            for t in rows
        ]
    else:
        base = (
            select(ForumComment)
            .options(selectinload(ForumComment.user), selectinload(ForumComment.thread))
            .where(ForumComment.moderation_status != "removed")
        )
        if q:
            base = base.where(ForumComment.body.ilike(f"%{q}%"))
        total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
        rows  = (await db.execute(base.order_by(desc(ForumComment.created_at)).offset(offset).limit(size))).scalars().all()
        items = [
            {
                "id":           str(c.id),
                "type":         "comment",
                "author":       c.user.username if c.user else "?",
                "author_id":    str(c.user_id),
                "title":        c.thread.title if c.thread else "?",
                "thread_id":    str(c.thread_id),
                "body":         c.body[:300],
                "status":       c.moderation_status,
                "created_at":   c.created_at.isoformat(),
            }
            for c in rows
        ]

    return {"total": total, "page": page, "size": size, "items": items}


@router.delete("/forum/threads/{thread_id}", status_code=200)
async def remove_thread(
    thread_id: UUID,
    admin:     User         = Depends(require_admin),
    db:        AsyncSession = Depends(get_db),
):
    """Thread'i sil (soft delete — status=removed)."""
    thread = (await db.execute(select(ForumThread).where(ForumThread.id == thread_id))).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı")
    thread.status = "removed" if hasattr(thread, "removed") else "resolved"
    await db.delete(thread)
    await db.commit()
    return {"message": "Thread silindi."}


@router.get("/articles")
async def list_articles(
    page:   int           = Query(1, ge=1),
    size:   int           = Query(20, ge=1, le=100),
    status:         Optional[str] = Query(None),
    exclude_status: Optional[str] = Query(None),
    q:              Optional[str] = Query(None),
    admin:  User          = Depends(require_admin),
    db:     AsyncSession  = Depends(get_db),
):
    """Admin: makale listesi (sayfalı, filtreli)."""
    filters = []
    if status:
        filters.append(Article.status == status)
    if exclude_status:
        filters.append(Article.status != exclude_status)
    if q:
        filters.append(Article.title.ilike(f"%{q}%"))

    count_q = select(func.count()).select_from(Article)
    rows_q  = (
        select(Article, AnalysisResult.status.label("ai_verdict"), AnalysisResult.confidence)
        .outerjoin(AnalysisResult, AnalysisResult.article_id == Article.id)
    )
    if filters:
        count_q = count_q.where(*filters)
        rows_q  = rows_q.where(*filters)

    total = (await db.execute(count_q)).scalar_one()
    rows  = (await db.execute(
        rows_q.order_by(Article.created_at.desc()).offset((page - 1) * size).limit(size)
    )).all()

    return {
        "total": total, "page": page, "size": size,
        "items": [
            {
                "id":         str(r.Article.id),
                "title":      r.Article.title,
                "status":     r.Article.status,
                "ai_verdict": r.ai_verdict,
                "confidence": round(r.confidence, 2) if r.confidence else None,
                "created_at": r.Article.created_at.isoformat() if r.Article.created_at else None,
            }
            for r in rows
        ],
    }


@router.get("/analysis-results")
async def list_analysis_results(
    page:    int           = Query(1, ge=1),
    size:    int           = Query(20, ge=1, le=100),
    verdict: Optional[str] = Query(None, description="FAKE | AUTHENTIC"),
    admin:   User          = Depends(require_admin),
    db:      AsyncSession  = Depends(get_db),
):
    """Admin: AI analiz sonuçlarını listele — kim yaptı, AI ne dedi, override."""
    Requester = aliased(User)

    ar_filters = [AnalysisResult.status.isnot(None)]
    if verdict:
        ar_filters.append(AnalysisResult.status == verdict.upper())

    total = (await db.execute(
        select(func.count())
        .select_from(AnalysisResult)
        .join(Article, Article.id == AnalysisResult.article_id)
        .where(*ar_filters)
    )).scalar_one()

    rows = (await db.execute(
        select(
            AnalysisResult.id,
            AnalysisResult.article_id,
            AnalysisResult.status.label("ai_verdict"),
            AnalysisResult.confidence,
            AnalysisResult.created_at,
            Article.title,
            Article.status.label("article_status"),
            AnalysisRequest.user_id.label("requester_id"),
            AnalysisRequest.analysis_type,
            AnalysisRequest.created_at.label("requested_at"),
            Requester.username.label("requester_username"),
        )
        .join(Article, Article.id == AnalysisResult.article_id)
        .outerjoin(
            AnalysisRequest,
            AnalysisRequest.task_id == cast(AnalysisResult.article_id, String)
        )
        .outerjoin(Requester, Requester.id == AnalysisRequest.user_id)
        .where(*ar_filters)
        .order_by(AnalysisResult.created_at.desc())
        .offset((page - 1) * size).limit(size)
    )).all()

    return {
        "total": total, "page": page, "size": size,
        "items": [
            {
                "id":                 str(r.id),
                "article_id":         str(r.article_id),
                "title":              r.title,
                "article_status":     r.article_status,
                "ai_verdict":         r.ai_verdict,
                "confidence":         round(r.confidence, 2) if r.confidence else None,
                "requester_username": r.requester_username,
                "analysis_type":      r.analysis_type.value if r.analysis_type else None,
                "requested_at":       (r.requested_at or r.created_at).isoformat(),
            }
            for r in rows
        ],
    }


@router.patch("/articles/{article_id}/classify", response_model=ArticleResponse)
async def classify_article(
    article_id: UUID,
    status: str = Body(..., embed=True),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    normalized = status.upper()
    if normalized not in ("AUTHENTIC", "FAKE"):
        raise HTTPException(status_code=422, detail="Geçerli değerler: AUTHENTIC, FAKE")

    article = (await db.execute(
        select(Article).where(Article.id == article_id)
    )).scalar_one_or_none()

    if article is None:
        raise HTTPException(status_code=404, detail="Makale bulunamadı.")

    article.status = normalized
    await db.commit()
    await db.refresh(article)
    return article


@router.delete("/forum/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_thread(
    thread_id: UUID,
    admin:     User         = Depends(require_admin),
    db:        AsyncSession = Depends(get_db),
):
    thread = (await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )).scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Başlık bulunamadı")
    await db.delete(thread)
    await db.commit()


@router.post("/forum/comments/{comment_id}/remove", status_code=status.HTTP_204_NO_CONTENT)
async def admin_remove_comment(
    comment_id: UUID,
    admin:      User         = Depends(require_admin),
    db:         AsyncSession = Depends(get_db),
):
    comment = (await db.execute(
        select(ForumComment).where(ForumComment.id == comment_id)
    )).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    await db.delete(comment)
    await db.commit()
