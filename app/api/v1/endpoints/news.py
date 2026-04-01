"""
app/api/v1/endpoints/news.py
=============================
GET /api/v1/news — RSS haber listesi (paginated, kategoriye göre filtrelenebilir).
Auth gerekmez.
"""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import NewsArticle
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
):
    offset = (page - 1) * size

    base_filter = [NewsArticle.embedding.is_not(None)]
    if category:
        base_filter.append(NewsArticle.category == category)
    if subcategory:
        base_filter.append(NewsArticle.subcategory == subcategory)
    if date_from:
        base_filter.append(NewsArticle.pub_date >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc))
    if date_to:
        end = datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc) + timedelta(days=1)
        base_filter.append(NewsArticle.pub_date < end)

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

    return NewsListResponse(
        items=[
            NewsArticleResponse(
                id          = a.id,
                title       = a.title,
                image_url   = a.image_url,
                source_name = a.source_name,
                source_url  = a.source_url,
                category    = a.category,
                subcategory = a.subcategory,
                pub_date    = a.pub_date,
                source_count = a.source_count,
                trust_score = a.trust_score,
            )
            for a in items
        ],
        total=total,
        page=page,
    )
