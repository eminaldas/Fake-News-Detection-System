from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.schemas import ContentAnalysisRequest, AnalysisResponse, TaskStatusResponse
from app.core.security import verify_token
from celery.result import AsyncResult
from workers.tasks import analyze_article
from fastapi.security import OAuth2PasswordBearer
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Article
from ml_engine.vectorizer import TurkishVectorizer
from app.db.session import get_db
from app.core.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Load lightweight vectorizer component for real-time search
vectorizer = TurkishVectorizer()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

@router.post("/analyze", response_model=AnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_content(
    request: ContentAnalysisRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit an article or URL for fake news analysis.
    Performs an immediate semantic similarity check against known fake news.
    If no matches are found, queues a deeper analysis task.
    """
    if not request.text or request.text.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid 'text' must be provided."
        )

    content_id = str(uuid.uuid4())
    
    # 1. Immediate Semantic Search
    if request.text:
        # Generate embedding for incoming text
        embedding = vectorizer.get_embedding(request.text)
        
        # Search the database for the closest match using Cosine Distance
        # pgvector cosine_distance operator is <=>, lower distance means higher similarity
        # cosine_similarity = 1 - cosine_distance
        
        # dbmdz/bert-base-turkish-cased gibi temel (base) dil modelleri
        # fine-tune edilmediği için vektörleri dar bir alana sıkışır (anisotropi).
        # Bu yüzden çok alakasız iki cümlenin benzerliği %85 çıkabilir.
        # Threshold'u çok daha katı (> %92 benzerlik) yapmalıyız.
        distance_threshold = 0.08 # 92% similarity threshold (1 - 0.92)
        
        # Find top 3 closest items
        stmt = (
            select(Article)
            .order_by(Article.embedding.cosine_distance(embedding))
            .limit(3)
        )
        
        result = await db.execute(stmt)
        closest_articles = result.scalars().all()
        
        for article in closest_articles:
            # Re-calculate distance in Python just to be safe, or use the DB distance if queried
            # Alternatively, we could query the distance in SELECT: `Article.embedding.cosine_distance(embedding).label('distance')`
            # For simplicity, we assume if it's the top result we can verify later, 
            # but let's do a strict query with threshold checking directly
            pass
            
        # A more optimal query to only get those > 80% similarity:
        stmt_filtered = (
            select(Article, Article.embedding.cosine_distance(embedding).label('distance'))
            .where(Article.embedding.cosine_distance(embedding) < distance_threshold)
            .order_by("distance")
            .limit(3)
        )
        
        result_filtered = await db.execute(stmt_filtered)
        matches = result_filtered.all()
        
        if matches:
            best_match, distance = matches[0]
            similarity = (1 - distance) * 100
            
            # Bu haber daha önce yalanlanmıştır (veya doğrulanmıştır)
            warning_msg = (
                f"Sistemde benzer bir haber bulundu! (Benzerlik: %{similarity:.1f})\n"
                f"Durum: {best_match.status}\n"
                f"Dayanak: {best_match.metadata_info.get('dayanak_noktalari', 'Bilinmiyor') if best_match.metadata_info else 'Bilinmiyor'}"
            )
            
            return AnalysisResponse(
                task_id=content_id, # Just return the generated ID
                message=warning_msg
            )
    
    # 2. Offload new unseen heavy work to Celery
    task = analyze_article.delay(content_id, text=request.text)

    return AnalysisResponse(
        task_id=task.id,
        message="Analysis task registered successfully. No exact historical match found. Use the task_id to check the status."
    )

@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_analysis_status(
    task_id: str,
    current_user=Depends(get_current_user)
):
    """
    Check the status of an ongoing analysis task.
    """
    task_result = AsyncResult(task_id)
    
    response = TaskStatusResponse(
        task_id=task_id,
        status=task_result.status,
    )

    if task_result.ready():
        if task_result.successful():
            response.result = task_result.result
        else:
            response.status = "FAILED"
            response.result = {"error": str(task_result.info)}

    return response
