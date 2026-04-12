from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request
from redis.asyncio import Redis
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import _midnight_epoch
from app.core.security import hash_ip
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import AnalysisRequest, AnalysisResult, Article, AuditLog, ContentInteraction, ModelFeedback, User, UserNotification, UserPreferenceProfile
from app.schemas.schemas import (
    AnalysisRequestResponse, DataExportResponse, FeedbackHistoryItem,
    FeedbackHistoryResponse, FeedPreferencesResponse,
    FeedPreferencesUpdate, ForumTrustInfo, PaginatedAnalysisRequestResponse,
    QuotaResponse, SessionItem, SessionListResponse, UserStatsResponse,
)

router = APIRouter()


@router.get("/me/history", response_model=PaginatedAnalysisRequestResponse)
async def my_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * size

    total_result = await db.execute(
        select(func.count()).where(AnalysisRequest.user_id == current_user.id)
    )
    total = total_result.scalar_one()

    items_result = await db.execute(
        select(AnalysisRequest)
        .where(AnalysisRequest.user_id == current_user.id)
        .order_by(AnalysisRequest.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    raw_items = items_result.scalars().all()

    # Enrich each request with Article title + AnalysisResult status + source_url
    enriched = []
    for req in raw_items:
        item_data = AnalysisRequestResponse(
            id=req.id,
            analysis_type=req.analysis_type.value if hasattr(req.analysis_type, "value") else req.analysis_type,
            task_id=req.task_id,
            created_at=req.created_at,
        )
        if req.task_id:
            try:
                enrich_result = await db.execute(
                    select(
                        Article.title,
                        Article.metadata_info,
                        AnalysisResult.status,
                        AnalysisResult.confidence,
                        AnalysisResult.ai_comment,
                    )
                    .join(AnalysisResult, AnalysisResult.article_id == Article.id)
                    .where(Article.metadata_info.op("->>")(  "task_id") == req.task_id)
                    .limit(1)
                )
                row = enrich_result.first()
                if row:
                    item_data.title = row.title
                    item_data.prediction = row.status
                    item_data.confidence = row.confidence
                    item_data.ai_comment = row.ai_comment
                    item_data.source_url = (
                        row.metadata_info.get("source_url") if row.metadata_info else None
                    )
            except Exception:
                pass
        enriched.append(item_data)

    return PaginatedAnalysisRequestResponse(total=total, page=page, size=size, items=enriched)


@router.get("/me/quota", response_model=QuotaResponse)
async def my_quota(
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Kullanıcının bugünkü analiz kota kullanımını döndürür."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key   = f"rl:user:{current_user.id}:{today}"
    count = int(await redis.get(key) or 0)
    limit = settings.RATE_LIMIT_USER
    return QuotaResponse(
        used=count,
        limit=limit,
        remaining=max(0, limit - count),
        reset_at=_midnight_epoch(),
    )


@router.get("/me/stats", response_model=UserStatsResponse)
async def my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    all_result = await db.execute(
        select(AnalysisResult.status, func.count().label("cnt"))
        .join(Article, AnalysisResult.article_id == Article.id)
        .join(AnalysisRequest, Article.metadata_info["task_id"].astext == AnalysisRequest.task_id)
        .where(AnalysisRequest.user_id == current_user.id)
        .group_by(AnalysisResult.status)
    )
    rows = {r.status: r.cnt for r in all_result}
    total_fake      = rows.get("FAKE", 0)
    total_authentic = rows.get("AUTHENTIC", 0)
    total_analyzed  = total_fake + total_authentic

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_result = await db.execute(
        select(AnalysisResult.status, func.count().label("cnt"))
        .join(Article, AnalysisResult.article_id == Article.id)
        .join(AnalysisRequest, Article.metadata_info["task_id"].astext == AnalysisRequest.task_id)
        .where(
            AnalysisRequest.user_id == current_user.id,
            AnalysisRequest.created_at >= week_ago,
        )
        .group_by(AnalysisResult.status)
    )
    week_rows     = {r.status: r.cnt for r in week_result}
    week_fake     = week_rows.get("FAKE", 0)
    week_analyzed = week_fake + week_rows.get("AUTHENTIC", 0)

    hygiene_score = round(total_authentic / total_analyzed * 100) if total_analyzed > 0 else 0

    return UserStatsResponse(
        total_analyzed=total_analyzed,
        total_fake=total_fake,
        total_authentic=total_authentic,
        hygiene_score=hygiene_score,
        week_analyzed=week_analyzed,
        week_fake=week_fake,
    )


# ── Faz 5: Feed Tercihleri ────────────────────────────────────────────────────

@router.get("/me/feed-preferences", response_model=FeedPreferencesResponse)
async def get_feed_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
    )).scalar_one_or_none()
    if not profile:
        return FeedPreferencesResponse(blocked_sources=[], hidden_categories=[])
    return FeedPreferencesResponse(
        blocked_sources   = profile.blocked_sources   or [],
        hidden_categories = profile.hidden_categories or [],
    )


@router.patch("/me/feed-preferences", response_model=FeedPreferencesResponse)
async def update_feed_preferences(
    body: FeedPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
    )).scalar_one_or_none()
    if not profile:
        profile = UserPreferenceProfile(user_id=current_user.id)
        db.add(profile)

    blocked = list(profile.blocked_sources   or [])
    hidden  = list(profile.hidden_categories or [])

    if body.add_blocked_source and body.add_blocked_source not in blocked:
        blocked.append(body.add_blocked_source.lower().strip())
    if body.remove_blocked_source and body.remove_blocked_source.lower().strip() in blocked:
        blocked.remove(body.remove_blocked_source.lower().strip())
    if body.add_hidden_category and body.add_hidden_category not in hidden:
        hidden.append(body.add_hidden_category.lower().strip())
    if body.remove_hidden_category and body.remove_hidden_category.lower().strip() in hidden:
        hidden.remove(body.remove_hidden_category.lower().strip())

    profile.blocked_sources   = blocked
    profile.hidden_categories = hidden
    await db.commit()
    await db.refresh(profile)
    return FeedPreferencesResponse(blocked_sources=blocked, hidden_categories=hidden)


@router.get("/me/preference-profile")
async def my_preference_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının AI Lab için kategori ağırlıkları ve NLP tolerans profilini döndürür."""
    result = await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return {"category_weights": {}, "avg_nlp_tolerance": 0.5}
    return {
        "category_weights": profile.category_weights or {},
        "avg_nlp_tolerance": float(profile.avg_nlp_tolerance) if profile.avg_nlp_tolerance is not None else 0.5,
    }


@router.delete("/me/preference-profile", status_code=204)
async def reset_preference_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının tüm tercih profilini sıfırla (etkileşim verisi korunur)."""
    profile = (await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
    )).scalar_one_or_none()
    if profile:
        await db.delete(profile)
        await db.commit()


# ── Faz 5: KVKK / GDPR Data Export ──────────────────────────────────────────

@router.get("/me/data-export", response_model=DataExportResponse)
async def data_export(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının tüm kişisel verilerini JSON olarak döndür (KVKK/GDPR)."""
    profile = (await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
    )).scalar_one_or_none()

    interactions_raw = (await db.execute(
        select(ContentInteraction)
        .where(ContentInteraction.user_id == current_user.id)
        .order_by(ContentInteraction.created_at.desc())
        .limit(1000)
    )).scalars().all()

    notifs_raw = (await db.execute(
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(100)
    )).scalars().all()

    return DataExportResponse(
        user={
            "id":         str(current_user.id),
            "email":      current_user.email,
            "username":   current_user.username,
            "role":       current_user.role,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        preference_profile={
            "category_weights":   profile.category_weights   if profile else {},
            "preferred_sources":  profile.preferred_sources  if profile else [],
            "blocked_sources":    profile.blocked_sources    if profile else [],
            "hidden_categories":  profile.hidden_categories  if profile else [],
            "interaction_count":  profile.interaction_count  if profile else 0,
        } if profile else None,
        interactions=[
            {
                "content_id":        str(i.content_id) if i.content_id else None,
                "interaction_type":  i.interaction_type,
                "category":          i.category,
                "source_domain":     i.source_domain,
                "nlp_score_at_time": i.nlp_score_at_time,
                "created_at":        i.created_at.isoformat(),
            }
            for i in interactions_raw
        ],
        notifications=[
            {
                "title":      n.title,
                "body":       n.body,
                "is_read":    n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs_raw
        ],
        exported_at=datetime.now(timezone.utc),
    )


# ── Profile Hub: Oturum Geçmişi ───────────────────────────────────────────────

@router.get("/me/sessions", response_model=SessionListResponse)
async def my_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.user_id == current_user.id,
            AuditLog.event_name == "auth.login_success",
        )
        .order_by(AuditLog.created_at.desc())
        .limit(5)
    )
    logs = result.scalars().all()

    # Determine current IP identifier
    client_ip = request.client.host if request.client else None
    current_ip_hash = hash_ip(client_ip) if client_ip else None

    sessions = [
        SessionItem(
            ip_hash=log.ip_hash or "",
            created_at=log.created_at,
            is_current=(log.ip_hash == current_ip_hash),
            label="Bu cihaz" if log.ip_hash == current_ip_hash else "Başka cihaz",
        )
        for log in logs
    ]

    anomaly_result = await db.execute(
        select(func.count()).select_from(AuditLog).where(
            AuditLog.user_id == current_user.id,
            AuditLog.event_name == "security.geo_anomaly",
            AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(days=7),
        )
    )
    anomaly_detected = anomaly_result.scalar_one() > 0

    return SessionListResponse(sessions=sessions, anomaly_detected=anomaly_detected)


# ── Profile Hub: Geri Bildirimlerim ──────────────────────────────────────────

_LABEL_TR = {"FAKE": "Yanıltıcı", "AUTHENTIC": "Güvenilir"}


@router.get("/me/feedback", response_model=FeedbackHistoryResponse)
async def my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının gönderdiği model düzeltmelerini ve kabul durumlarını döndürür."""
    # Subquery: her article için en son AnalysisResult status'u
    latest_status_sq = (
        select(AnalysisResult.status)
        .where(AnalysisResult.article_id == Article.id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(1)
        .correlate(Article)
        .scalar_subquery()
    )

    result = await db.execute(
        select(ModelFeedback, Article.title, latest_status_sq.label("status"))
        .join(Article, ModelFeedback.article_id == Article.id)
        .where(ModelFeedback.user_id == current_user.id)
        .order_by(ModelFeedback.created_at.desc())
        .limit(50)
    )
    rows = result.all()

    # Gerçek toplam sayı (limit'ten bağımsız)
    total_count_result = await db.execute(
        select(func.count()).select_from(ModelFeedback).where(ModelFeedback.user_id == current_user.id)
    )
    true_total = total_count_result.scalar_one()

    if not rows:
        return FeedbackHistoryResponse(items=[], total_sent=0, total_accepted=0)

    # Tüm ilgili article_id'ler için consensus oyu say (filtersiz — tüm kullanıcılar)
    article_ids = [row[0].article_id for row in rows]
    threshold = settings.FEEDBACK_CONSENSUS_THRESHOLD

    vote_result = await db.execute(
        select(
            ModelFeedback.article_id,
            ModelFeedback.submitted_label,
            func.count().label("cnt"),
        )
        .where(ModelFeedback.article_id.in_(article_ids))
        .group_by(ModelFeedback.article_id, ModelFeedback.submitted_label)
    )
    # vote_map[article_id][label] = count
    vote_map: dict = {}
    for vr in vote_result.all():
        aid = str(vr.article_id)
        vote_map.setdefault(aid, {})[vr.submitted_label] = vr.cnt

    items = []
    total_accepted = 0

    for fb, title, status in rows:
        aid = str(fb.article_id)
        votes_for_article = vote_map.get(aid, {})
        # Consensus: bu article için kullanıcının oyu etkin çoğunluğa ulaştı mı?
        user_label_count = votes_for_article.get(fb.submitted_label, 0)
        total_votes = sum(votes_for_article.values())
        accepted = (
            user_label_count >= threshold
            and (total_votes == 0 or user_label_count / total_votes > 0.60)
        )
        if accepted:
            total_accepted += 1

        items.append(FeedbackHistoryItem(
            article_title=title,
            submitted_label=_LABEL_TR.get(fb.submitted_label, fb.submitted_label),
            model_status=_LABEL_TR.get(status) if status else None,
            accepted=accepted,
            created_at=fb.created_at,
        ))

    return FeedbackHistoryResponse(
        items=items,
        total_sent=true_total,
        total_accepted=total_accepted,
    )


@router.get("/me/trust", response_model=ForumTrustInfo)
async def my_trust_info(
    current_user: User = Depends(get_current_user),
):
    """Kullanıcının forum trust (itibar) bilgisini döner."""
    return ForumTrustInfo.from_user(current_user)
