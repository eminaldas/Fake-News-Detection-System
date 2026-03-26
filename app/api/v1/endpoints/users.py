from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import AnalysisRequest, User
from app.schemas.schemas import PaginatedAnalysisRequestResponse

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
    items = items_result.scalars().all()

    return PaginatedAnalysisRequestResponse(total=total, page=page, size=size, items=items)
