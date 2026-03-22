from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.api.deps import get_current_user
from app.core.security import TokenData  # get_articles ve get için kullanılıyor
from app.db.session import get_db
from app.models.models import Article, AnalysisResult
from app.schemas.schemas import (
    ArticleResponse,
    PaginatedArticleResponse,
    TrendingHeadlineResponse,
)

router = APIRouter()


@router.get("/trending", response_model=List[TrendingHeadlineResponse])
async def get_trending_headlines(
    db: AsyncSession = Depends(get_db),
):
    """
    Son 24 saatte google_trends_rss kaynağından eklenen en fazla 5 başlığı döndürür.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    stmt = (
        select(Article, AnalysisResult.status.label("analysis_status"))
        .outerjoin(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(
            Article.metadata_info.op("->>")(  "origin") == "google_trends_rss",
            Article.created_at >= cutoff,
        )
        .order_by(Article.created_at.desc())
        .limit(5)
    )

    rows = (await db.execute(stmt)).all()

    return [
        TrendingHeadlineResponse(
            id=article.id,
            title=article.title,
            status=analysis_status or "belirsiz",
            classification_label=(article.metadata_info or {}).get(
                "classification_label", "gerçek veri"
            ),
            source_url=(article.metadata_info or {}).get("source_url"),
            source_name=(article.metadata_info or {}).get("source_name"),
            source_domain=(article.metadata_info or {}).get("source_domain"),
        )
        for article, analysis_status in rows
    ]


@router.get("/", response_model=PaginatedArticleResponse)
async def get_articles(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: TokenData = Depends(get_current_user),
):
    """Bilgi tabanındaki makaleleri sayfalı olarak döndürür."""
    skip = (page - 1) * size

    base = select(Article)
    count_q = select(func.count()).select_from(Article)

    if status_filter:
        base    = base.where(Article.status == status_filter)
        count_q = count_q.where(Article.status == status_filter)

    total = (await db.execute(count_q)).scalar()
    items = (await db.execute(base.offset(skip).limit(size))).scalars().all()

    return PaginatedArticleResponse(total=total, page=page, size=size, items=items)
