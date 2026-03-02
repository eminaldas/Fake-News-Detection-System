from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.models.models import Article
from app.core.security import verify_token
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

class ArticleResponse(BaseModel):
    id: UUID
    title: str
    content: str
    status: str
    metadata_info: dict | None = None
    
    class Config:
        from_attributes = True

class PaginatedArticleResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ArticleResponse]

@router.get("/", response_model=PaginatedArticleResponse)
async def get_articles(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, description="Filter by status (e.g., 'Yanlış', 'Doğru')"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a paginated list of articles from the Knowledge Base.
    """
    skip = (page - 1) * size
    
    # Base query
    query = select(Article)
    count_query = select(func.count()).select_from(Article)
    
    if status_filter:
        query = query.where(Article.status == status_filter)
        count_query = count_query.where(Article.status == status_filter)
        
    query = query.offset(skip).limit(size)
    
    # Execute
    total_result = await db.execute(count_query)
    total_count = total_result.scalar()
    
    items_result = await db.execute(query)
    articles = items_result.scalars().all()
    
    return PaginatedArticleResponse(
        total=total_count,
        page=page,
        size=size,
        items=articles
    )
