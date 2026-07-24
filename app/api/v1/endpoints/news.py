"""
app/api/v1/endpoints/news.py
=============================
GET /api/v1/news — RSS haber listesi (paginated, kategoriye göre filtrelenebilir).
Auth gerekmez.
"""

from datetime import date, datetime, timedelta, timezone, UTC

import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, func, select
from sqlalchemy.dialects.postgresql import array as pg_array
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.db.session import get_db
from app.models.models import Category, ContentInteraction, NewsArticle, User, UserPreferenceProfile
from app.schemas.schemas import NewsArticleResponse, NewsListResponse
from app.services.category_tree import build_category_tree

router = APIRouter()

_HIDDEN_CONTENT_TYPES = ["service_schedule", "service_program", "service_trivia"]


def _hidden_content_type_filter():
    """
    Servis/trivia etiketli (A/B/C) içerikleri varsayılan feed'den gizleyen koşul.
    content_type IS NULL olan kayıtlar bilinçli olarak dahil edilir — aksi halde
    `NOT (NULL ?| ...)` SQL'de NULL döner ve WHERE bu satırları sessizce elerdi.
    """
    return (
        NewsArticle.content_type.is_(None)
        | ~NewsArticle.content_type.op("?|")(pg_array(_HIDDEN_CONTENT_TYPES))
    )


@router.get("", response_model=NewsListResponse)
async def list_news(
    category:    str | None  = Query(None, description="Kategori filtresi (gündem, spor, ekonomi...)"),
    subcategory: str | None  = Query(None, description="Alt kategori filtresi"),
    page:        int         = Query(1, ge=1),
    size:        int         = Query(20, ge=1, le=100),
    date_from:   date | None = Query(None, description="Başlangıç tarihi (YYYY-MM-DD)"),
    date_to:     date | None = Query(None, description="Bitiş tarihi (YYYY-MM-DD)"),
    sort:        str  | None = Query(None, description="Sıralama: popular"),
    q:           str  | None = Query(None, description="Başlık araması"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_user),
):
    offset = (page - 1) * size

    now_plus_2h = datetime.now(UTC) + timedelta(hours=2)

    base_filter = [
        NewsArticle.id == NewsArticle.cluster_id,
        (NewsArticle.pub_date.is_(None) | (NewsArticle.pub_date <= now_plus_2h)),
        _hidden_content_type_filter(),
    ]
    if category:
        base_filter.append(NewsArticle.category == category)
    if subcategory:
        base_filter.append(NewsArticle.subcategory == subcategory)
    if q:
        base_filter.append(NewsArticle.title.ilike(f"%{q}%"))
    if date_from:
        base_filter.append(NewsArticle.pub_date >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc))
    if date_to:
        end = datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc) + timedelta(days=1)
        base_filter.append(NewsArticle.pub_date < end)

    if current_user:
        user_profile = (await db.execute(
            select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == current_user.id)
        )).scalar_one_or_none()
        if user_profile:
            for domain in (user_profile.blocked_sources or []):
                base_filter.append(~NewsArticle.source_url.contains(domain))
            if user_profile.hidden_categories:
                base_filter.append(~NewsArticle.category.in_(user_profile.hidden_categories))
            for pair in (user_profile.hidden_subcategories or []):
                main, _, sub = pair.partition("/")
                if main and sub:
                    base_filter.append(
                        ~and_(NewsArticle.category == main, NewsArticle.subcategory == sub)
                    )

    total_result = await db.execute(
        select(func.count()).select_from(NewsArticle).where(*base_filter)
    )
    total = total_result.scalar_one()

    if sort == "popular":
        popular_cutoff = datetime.now(UTC) - timedelta(days=2)
        popular_filter = [
            *base_filter,
            func.coalesce(NewsArticle.pub_date, NewsArticle.created_at) >= popular_cutoff,
        ]
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        day_weight = case(
            (func.coalesce(NewsArticle.pub_date, NewsArticle.created_at) >= today_start, 3.0),
            else_=1.0,
        )
        hrs = (
            func.extract('epoch', func.now() - func.coalesce(NewsArticle.pub_date, NewsArticle.created_at))
            / 3600.0
        )
        cv_sub = (
            select(ContentInteraction.content_id, func.count().label('cv'))
            .where(ContentInteraction.interaction_type == 'click')
            .group_by(ContentInteraction.content_id)
            .subquery()
        )
        base_score = (
            NewsArticle.source_count * 0.4
            + func.coalesce(cv_sub.c.cv, 0) * 0.4
            + (1.0 / (hrs + 1.0)) * 0.2
        )
        pop = base_score * day_weight
        items_result = await db.execute(
            select(NewsArticle)
            .where(*popular_filter)
            .outerjoin(cv_sub, NewsArticle.id == cv_sub.c.content_id)
            .order_by(pop.desc())
            .offset(offset)
            .limit(size)
        )
    else:
        items_result = await db.execute(
            select(NewsArticle)
            .where(*base_filter)
            .order_by(func.coalesce(NewsArticle.pub_date, NewsArticle.created_at).desc())
            .offset(offset)
            .limit(size)
        )
    items = items_result.scalars().all()

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


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Aktif kategoriler ağaç halinde (public, auth gerekmez)."""
    rows = (await db.execute(
        select(Category).where(Category.is_active.is_(True)).order_by(Category.display_order)
    )).scalars().all()
    return build_category_tree(rows)


@router.get("/{article_id}", response_model=NewsArticleResponse)
async def get_news_detail(
    article_id: _uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    article = (await db.execute(
        select(NewsArticle).where(NewsArticle.id == article_id)
    )).scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=404, detail="Haber bulunamadı.")

    stats = (await db.execute(
        select(
            func.count().label("total"),
            func.sum(
                case((ContentInteraction.interaction_type == "feedback_positive", 1), else_=0)
            ).label("positive"),
        ).where(ContentInteraction.content_id == article_id)
    )).one()

    return NewsArticleResponse(
        id           = article.id,
        title        = article.title,
        image_url    = article.image_url,
        source_name  = article.source_name,
        source_url   = article.source_url,
        category     = article.category,
        subcategory  = article.subcategory,
        pub_date     = article.pub_date,
        source_count = article.source_count,
        trust_score  = article.trust_score,
        nlp_score    = article.nlp_score,
        content_type = article.content_type,
        community    = {"view_count": stats.total or 0, "positive_count": int(stats.positive or 0)},
    )
