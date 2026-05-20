from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import DailySummary
from app.schemas.schemas import DailySummaryResponse

router = APIRouter()


@router.get("/today", response_model=DailySummaryResponse)
async def get_today_digest(db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(DailySummary)
        .where(DailySummary.summary_date == today)
        .order_by(DailySummary.generated_at.desc())
        .limit(1)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Bugün için özet henüz hazır değil")
    return summary
