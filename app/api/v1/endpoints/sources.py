from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import NewsArticle, User
from app.schemas.schemas import SourceSearchItem

router = APIRouter()


@router.get("/", response_model=List[SourceSearchItem])
async def search_sources(
    search: str = Query(..., min_length=1, max_length=50),
    limit:  int = Query(5, ge=1, le=10),
    db:     AsyncSession = Depends(get_db),
    _:      User = Depends(get_current_user),
):
    """
    "Engellenen kaynaklar" arama kutusu için öneri listesi.

    Not: Bu uctan onceden bagimsiz bir Source (bilgi tabani yayincisi)
    tablosu sorgulaniyordu - o tablo hic doldurulmadigi icin arama
    her zaman bos donuyordu. Kullanicinin gercekte engellemek istedigi
    sey RSS haber akisindaki kaynaklar (NewsArticle.source_name), feed
    filtresi de zaten oradaki source_url'e gore calisiyor (bkz.
    app/api/v1/endpoints/news.py:list_news). O yuzden dogrudan
    NewsArticle'dan distinct kaynak adi araniyor.
    """
    result = await db.execute(
        select(NewsArticle.source_name, func.max(NewsArticle.source_url).label("sample_url"))
        .where(
            NewsArticle.source_name.isnot(None),
            NewsArticle.source_name.ilike(f"%{search}%"),
        )
        .group_by(NewsArticle.source_name)
        .order_by(NewsArticle.source_name)
        .limit(limit)
    )
    rows = result.all()

    items = []
    for name, sample_url in rows:
        domain = name
        if sample_url:
            try:
                netloc = urlparse(sample_url).netloc
                if netloc:
                    domain = netloc[4:] if netloc.startswith("www.") else netloc
            except ValueError:
                pass
        items.append(SourceSearchItem(id=name, name=name, url=domain, credibility_score=None))
    return items
