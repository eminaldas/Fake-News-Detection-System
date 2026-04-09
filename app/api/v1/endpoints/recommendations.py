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
    ContentInteraction, User,
)

router = APIRouter()

COLD_START_THRESHOLD = 5
WARM_THRESHOLD       = 20


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


async def _warm_mode(db: AsyncSession, user_id, profile: UserPreferenceProfile, limit: int) -> list:
    """Category match + recency."""
    since   = datetime.now(timezone.utc) - timedelta(days=3)
    weights = profile.category_weights or {}
    top_cats = sorted(weights, key=lambda c: weights[c], reverse=True)[:3]

    query = select(NewsArticle).where(
        NewsArticle.created_at >= since,
        NewsArticle.nlp_score.isnot(None),
    )
    if top_cats:
        query = query.where(NewsArticle.category.in_(top_cats))
    query = query.order_by(NewsArticle.created_at.desc()).limit(limit * 2)

    rows = (await db.execute(query)).scalars().all()

    def score(a: NewsArticle) -> float:
        cat_w   = weights.get(a.category or "", 0.1) * 0.40
        recency = max(0, 1 - (datetime.now(timezone.utc) - a.created_at).total_seconds() / 259200) * 0.35
        safety  = (1 - (a.nlp_score or 0.5)) * 0.25
        return cat_w + recency + safety

    return sorted(rows, key=score, reverse=True)[:limit]


async def _personal_mode(db: AsyncSession, user_id, profile: UserPreferenceProfile, limit: int) -> list:
    """Semantic (cache) + category + safety."""
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

    seen_ids     = {str(cid) for cid in recent_clicks}
    candidate_ids = [sid for sid in similar_ids if sid not in seen_ids][:limit * 2]

    if not candidate_ids:
        return await _warm_mode(db, user_id, profile, limit)

    rows = (await db.execute(
        select(NewsArticle)
        .where(NewsArticle.id.in_([_uuid.UUID(i) for i in candidate_ids]))
    )).scalars().all()

    weights = profile.category_weights or {}

    def score(a: NewsArticle) -> float:
        cat_w  = weights.get(a.category or "", 0.1) * 0.25
        safety = (1 - (a.nlp_score or 0.5)) * 0.10
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

    if user is None:
        articles = await _cold_start(db, {}, limit)
        return {"mode": "cold_start", "items": [_serialize(a, "Trend") for a in articles]}

    profile = (await db.execute(
        select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == user.id)
    )).scalar_one_or_none()

    count = profile.interaction_count if profile else 0

    if count < COLD_START_THRESHOLD:
        declared = profile.declared_interests if profile else {}
        articles = await _cold_start(db, declared or {}, limit)
        reason   = "İlgi alanın" if declared else "Trend"
        return {"mode": "cold_start", "items": [_serialize(a, reason) for a in articles]}

    if count < WARM_THRESHOLD:
        articles = await _warm_mode(db, user.id, profile, limit)
        return {"mode": "warming", "items": [_serialize(a, "Çok okuduğun kategori") for a in articles]}

    articles = await _personal_mode(db, user.id, profile, limit)
    return {"mode": "personal", "items": [_serialize(a, "Senin için seçildi") for a in articles]}
