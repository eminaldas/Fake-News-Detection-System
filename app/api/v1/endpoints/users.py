from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import AnalysisRequest, AnalysisResult, Article, User
from app.schemas.schemas import AnalysisRequestResponse, PaginatedAnalysisRequestResponse

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
    raw_items = items_result.scalars().all()

    # Enrich each request with Article title + AnalysisResult status + source_url
    enriched = []
    for req in raw_items:
        item_data = AnalysisRequestResponse(
            id=req.id,
            analysis_type=req.analysis_type.value if hasattr(req.analysis_type, "value") else req.analysis_type,
            task_id=req.task_id,
            created_at=req.created_at,
        )
        if req.task_id:
            try:
                enrich_result = await db.execute(
                    select(
                        Article.title,
                        Article.metadata_info,
                        AnalysisResult.status,
                    )
                    .join(AnalysisResult, AnalysisResult.article_id == Article.id)
                    .where(Article.metadata_info.op("->>")(  "task_id") == req.task_id)
                    .limit(1)
                )
                row = enrich_result.first()
                if row:
                    item_data.title = row.title
                    item_data.prediction = row.status
                    item_data.source_url = (
                        row.metadata_info.get("source_url") if row.metadata_info else None
                    )
            except Exception:
                pass
        enriched.append(item_data)

    return PaginatedAnalysisRequestResponse(total=total, page=page, size=size, items=enriched)
