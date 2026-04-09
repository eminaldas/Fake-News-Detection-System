"""
app/api/v1/endpoints/news.py
=============================
GET /api/v1/news — RSS haber listesi (paginated, kategoriye göre filtrelenebilir).
Auth gerekmez.
"""

from datetime import date, datetime, timedelta, timezone

import uuid as _uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.db.session import get_db
from app.models.models import ContentInteraction, NewsArticle, User, UserPreferenceProfile
from app.schemas.schemas import NewsArticleResponse, NewsListResponse

router = APIRouter()


@router.get("", response_model=NewsListResponse)
async def list_news(
    category:    str | None  = Query(None, description="Kategori filtresi (gündem, spor, ekonomi...)"),
    subcategory: str | None  = Query(None, description="Alt kategori filtresi"),
    page:        int         = Query(1, ge=1),
    size:        int         = Query(20, ge=1, le=100),
    date_from:   date | None = Query(None, description="Başlangıç tarihi (YYYY-MM-DD)"),
    date_to:     date | None = Query(None, description="Bitiş tarihi (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user),
):
    offset = (page - 1) * size

    base_filter = [
        NewsArticle.embedding.is_not(None),
        # Sadece canonical kayıtları göster (cluster içindeki diğer kaynaklar gizli)
        NewsArticle.id == NewsArticle.cluster_id,
    ]
    if category:
        base_filter.append(NewsArticle.category == category)
    if subcategory:
        base_filter.append(NewsArticle.subcategory == subcategory)
    if date_from:
        base_filter.append(NewsArticle.pub_date >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc))
    if date_to:
        end = datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc) + timedelta(days=1)
        base_filter.append(NewsArticle.pub_date < end)

    # Faz 5: Kullanıcı tercihlerine göre filtrele (opsiyonel)
    if current_user:
        user_profile = (await db.execute(
            select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
        )).scalar_one_or_none()
        if user_profile:
            for domain in (user_profile.blocked_sources or []):
                base_filter.append(~NewsArticle.source_url.contains(domain))
            if user_profile.hidden_categories:
                base_filter.append(~NewsArticle.category.in_(user_profile.hidden_categories))

    total_result = await db.execute(
        select(func.count()).select_from(NewsArticle).where(*base_filter)
    )
    total = total_result.scalar_one()

    items_result = await db.execute(
        select(NewsArticle)
        .where(*base_filter)
        .order_by(NewsArticle.pub_date.desc().nullsfirst())
        .offset(offset)
        .limit(size)
    )
    items = items_result.scalars().all()

    # Topluluk istatistikleri — tek sorguda tüm makaleler için
    article_ids = [a.id for a in items]
    community_map: dict = {}
    if article_ids:
        stats_rows = (await db.execute(
            select(
                ContentInteraction.content_id,
                func.count().label("total"),
                func.sum(
                    case((ContentInteraction.interaction_type == "feedback_positive", 1), else_=0)
                ).label("positive"),
            )
            .where(ContentInteraction.content_id.in_(article_ids))
            .group_by(ContentInteraction.content_id)
        )).all()
        community_map = {
            str(r.content_id): {
                "view_count":     r.total,
                "positive_count": int(r.positive or 0),
            }
            for r in stats_rows
        }

    return NewsListResponse(
        items=[
            NewsArticleResponse(
                id           = a.id,
                title        = a.title,
                image_url    = a.image_url,
                source_name  = a.source_name,
                source_url   = a.source_url,
                category     = a.category,
                subcategory  = a.subcategory,
                pub_date     = a.pub_date,
                source_count = a.source_count,
                trust_score  = a.trust_score,
                nlp_score    = a.nlp_score,
                content_type = a.content_type,
                community    = community_map.get(str(a.id), {"view_count": 0, "positive_count": 0}),
            )
            for a in items
        ],
        total=total,
        page=page,
    )
