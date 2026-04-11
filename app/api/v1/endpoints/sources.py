from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Source, User
from app.schemas.schemas import SourceSearchItem

router = APIRouter()


@router.get("/", response_model=List[SourceSearchItem])
async def search_sources(
    search: str = Query(..., min_length=1, max_length=50),
    limit:  int = Query(5, ge=1, le=10),
    db:     AsyncSession = Depends(get_db),
    _:      User = Depends(get_current_user),
):
    result = await db.execute(
        select(Source)
        .where(
            Source.name.ilike(f"%{search}%") | Source.url.ilike(f"%{search}%")
        )
        .order_by(Source.name)
        .limit(limit)
    )
    sources = result.scalars().all()
    return [
        SourceSearchItem(
            id=str(s.id),
            name=s.name or "",
            url=s.url or "",
            credibility_score=s.credibility_score if s.credibility_score is not None else None,
        )
        for s in sources
    ]
