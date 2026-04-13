"""
app/api/v1/endpoints/recommendations.py
=========================================
Kullanıcı moduna göre (soğuk/ısınma/kişisel) haber önerir.
context=feed           → Gündem "Sizin için" feed
context=post_analysis  → Analiz sonrası ilgili haberler
"""
import uuid as _uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.db.session import get_db
from app.models.models import (
    NewsArticle, UserPreferenceProfile, ContentSimilarityCache,
    ContentInteraction, User, AbExperiment, AbVariantAssignment,
)

router = APIRouter()

COLD_START_THRESHOLD = 5
WARM_THRESHOLD       = 20

VARIANT_WEIGHTS = {
    0: {"cat": 0.40, "rec": 0.35, "safety": 0.25},   # kontrol
    1: {"cat": 0.25, "rec": 0.55, "safety": 0.20},   # recency-heavy
    2: {"cat": 0.60, "rec": 0.20, "safety": 0.20},   # category-heavy
}

VARIANT_WEIGHTS_PERSONAL = {
    0: {"cat": 0.25, "safety": 0.10},
    1: {"cat": 0.20, "safety": 0.10},
    2: {"cat": 0.45, "safety": 0.15},
}


async def _get_or_assign_variant(user_id, experiment: AbExperiment, db: AsyncSession) -> int:
    """
    Kullanıcıya deney varyantı atar (yoksa) ve döner.
    user_id % 3 ile deterministik atama — aynı kullanıcı her zaman aynı varyantı görür.
    """
    import uuid as _uuid_mod
    existing = (await db.execute(
        select(AbVariantAssignment).where(
            AbVariantAssignment.user_id == user_id,
            AbVariantAssignment.experiment_id == experiment.id,
        )
    )).scalar_one_or_none()

    if existing:
        return existing.variant

    variant = int(_uuid_mod.UUID(str(user_id)).int % 3)
    db.add(AbVariantAssignment(
        user_id=user_id,
        experiment_id=experiment.id,
        variant=variant,
    ))
    await db.commit()
    return variant


async def _cold_start(db: AsyncSession, declared: dict, limit: int) -> list:
    """Trending + declared interests + düşük nlp skoru."""
    since = datetime.now(timezone.utc) - timedelta(days=3)
    rows = (await db.execute(
        select(NewsArticle)
        .where(
            NewsArticle.created_at >= since,
            NewsArticle.nlp_score.isnot(None),
        )
        .order_by(NewsArticle.nlp_score.asc(), NewsArticle.created_at.desc())
        .limit(limit * 3)
    )).scalars().all()

    def score(a: NewsArticle) -> float:
        cat_match = declared.get(a.category or "", 0.0) * 0.50
        recency   = max(0, 1 - (datetime.now(timezone.utc) - a.created_at).total_seconds() / 259200) * 0.30
        safety    = (1 - (a.nlp_score or 0.5)) * 0.20
        return cat_match + recency + safety

    return sorted(rows, key=score, reverse=True)[:limit]


async def _warm_mode(db: AsyncSession, user_id, profile: UserPreferenceProfile, limit: int, weights: dict = None) -> list:
    """Category match + recency."""
    if weights is None:
        weights = VARIANT_WEIGHTS[0]

    since = datetime.now(timezone.utc) - timedelta(days=3)
    w     = profile.category_weights or {}
    top_cats = sorted(w, key=lambda c: w[c], reverse=True)[:3]

    query = select(NewsArticle).where(
        NewsArticle.created_at >= since,
        NewsArticle.nlp_score.isnot(None),
    )
    if top_cats:
        query = query.where(NewsArticle.category.in_(top_cats))
    query = query.order_by(NewsArticle.created_at.desc()).limit(limit * 2)

    rows = (await db.execute(query)).scalars().all()

    def score(a: NewsArticle) -> float:
        cat_w   = w.get(a.category or "", 0.1) * weights["cat"]
        recency = max(0, 1 - (datetime.now(timezone.utc) - a.created_at).total_seconds() / 259200) * weights["rec"]
        safety  = (1 - (a.nlp_score or 0.5)) * weights["safety"]
        return cat_w + recency + safety

    return sorted(rows, key=score, reverse=True)[:limit]


async def _personal_mode(db: AsyncSession, user_id, profile: UserPreferenceProfile, limit: int, weights_personal: dict = None, weights_warm: dict = None) -> list:
    """Semantic (cache) + category + safety."""
    if weights_personal is None:
        weights_personal = VARIANT_WEIGHTS_PERSONAL[0]
    if weights_warm is None:
        weights_warm = VARIANT_WEIGHTS[0]

    recent_clicks = (await db.execute(
        select(ContentInteraction.content_id)
        .where(
            ContentInteraction.user_id == user_id,
            ContentInteraction.interaction_type == "click",
            ContentInteraction.content_id.isnot(None),
        )
        .order_by(ContentInteraction.created_at.desc())
        .limit(3)
    )).scalars().all()

    similar_ids = set()
    for cid in recent_clicks:
        cache = (await db.execute(
            select(ContentSimilarityCache).where(ContentSimilarityCache.content_id == cid)
        )).scalar_one_or_none()
        if cache and cache.similar_ids:
            similar_ids.update(cache.similar_ids[:5])

    seen_ids      = {str(cid) for cid in recent_clicks}
    candidate_ids = [sid for sid in similar_ids if sid not in seen_ids][:limit * 2]

    if not candidate_ids:
        return await _warm_mode(db, user_id, profile, limit, weights=weights_warm)

    rows = (await db.execute(
        select(NewsArticle)
        .where(NewsArticle.id.in_([_uuid.UUID(i) for i in candidate_ids]))
    )).scalars().all()

    w = profile.category_weights or {}

    def score(a: NewsArticle) -> float:
        cat_w  = w.get(a.category or "", 0.1) * weights_personal["cat"]
        safety = (1 - (a.nlp_score or 0.5)) * weights_personal["safety"]
        return cat_w + safety

    return sorted(rows, key=score, reverse=True)[:limit]


def _serialize(article: NewsArticle, reason: str) -> dict:
    return {
        "id":          str(article.id),
        "title":       article.title,
        "category":    article.category,
        "source_name": article.source_name,
        "source_url":  article.source_url,
        "image_url":   article.image_url,
        "nlp_score":   article.nlp_score,
        "pub_date":    article.pub_date.isoformat() if article.pub_date else None,
        "reason":      reason,
    }


@router.get("/")
async def get_recommendations(
    context: str          = Query("feed", pattern="^(feed|post_analysis)$"),
    limit:   int          = Query(10, ge=1, le=20),
    user:    User | None  = Depends(get_optional_user),
    db:      AsyncSession = Depends(get_db),
):
    if context == "post_analysis":
        limit = 5

    # ── Aktif deney kontrolü ──────────────────────────────────────────────────
    experiment = (await db.execute(
        select(AbExperiment).where(AbExperiment.status == "active")
    )).scalar_one_or_none()

    ab_variant        = None
    ab_experiment_id  = None
    warm_weights      = VARIANT_WEIGHTS[0]
    personal_weights  = VARIANT_WEIGHTS_PERSONAL[0]

    if experiment and user:
        ab_variant       = await _get_or_assign_variant(user.id, experiment, db)
        ab_experiment_id = str(experiment.id)
        warm_weights     = VARIANT_WEIGHTS[ab_variant]
        personal_weights = VARIANT_WEIGHTS_PERSONAL[ab_variant]

    def _ab_meta(items: list) -> dict:
        base = {"items": items}
        if ab_variant is not None:
            base["ab_variant"]       = ab_variant
            base["ab_experiment_id"] = ab_experiment_id
        return base

    # ── Öneri modu seçimi ─────────────────────────────────────────────────────
    if user is None:
        articles = await _cold_start(db, {}, limit)
        return {**_ab_meta([_serialize(a, "Trend") for a in articles]), "mode": "cold_start"}

    profile = (await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == user.id)
    )).scalar_one_or_none()

    count = profile.interaction_count if profile else 0

    if count < COLD_START_THRESHOLD:
        declared = profile.declared_interests if profile else {}
        articles = await _cold_start(db, declared or {}, limit)
        reason   = "İlgi alanın" if declared else "Trend"
        return {**_ab_meta([_serialize(a, reason) for a in articles]), "mode": "cold_start"}

    if count < WARM_THRESHOLD:
        articles = await _warm_mode(db, user.id, profile, limit, weights=warm_weights)
        return {**_ab_meta([_serialize(a, "Çok okuduğun kategori") for a in articles]), "mode": "warming"}

    articles = await _personal_mode(db, user.id, profile, limit,
                                    weights_personal=personal_weights,
                                    weights_warm=warm_weights)
    return {**_ab_meta([_serialize(a, "Senin için seçildi") for a in articles]), "mode": "personal"}
