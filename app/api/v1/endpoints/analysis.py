from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from celery.result import AsyncResult
import uuid
import json

from app.core.config import settings
from app.db.session import get_db
from app.models.models import Article, AnalysisResult
from app.schemas.schemas import (
    AnalysisResponse,
    ContentAnalysisRequest,
    TaskStatusResponse,
    UrlAnalysisRequest,
)
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer
from workers.link_analysis_task import analyze_article_url
from workers.tasks import analyze_article

router = APIRouter()

vectorizer = TurkishVectorizer()
cleaner    = NewsCleaner()


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_content(
    request: ContentAnalysisRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Haber metni için sahte haber analizi başlatır.
    Önce anlık semantik benzerlik kontrolü yapar;
    eşleşme yoksa derin analizi Celery kuyruğuna ekler.
    """
    content_id = str(uuid.uuid4())

    cleaned_for_search = cleaner.process(raw_iddia=request.text)["cleaned_text"]
    embedding = vectorizer.get_embedding(cleaned_for_search)

    stmt = (
        select(Article, Article.embedding.cosine_distance(embedding).label("distance"))
        .where(
            (Article.embedding.cosine_distance(embedding) < settings.SIMILARITY_THRESHOLD)
            & Article.status.is_not(None)
        )
        .order_by("distance")
        .limit(3)
    )
    result = await db.execute(stmt)
    matches = result.all()

    if matches:
        best_match, distance = matches[0]
        similarity = (1 - distance) * 100

        normalized_status = "UNKNOWN"
        if best_match.status:
            upper = best_match.status.upper()
            if upper in {"FAKE", "YANLIŞ", "YANLIS", "FALSE"}:
                normalized_status = "FAKE"
            elif upper in {"AUTHENTIC", "DOĞRU", "DOGRU", "TRUE"}:
                normalized_status = "AUTHENTIC"
            else:
                normalized_status = upper

        dayanak = (
            best_match.metadata_info.get("dayanak_noktalari", "Bilinmiyor")
            if best_match.metadata_info
            else "Bilinmiyor"
        )

        return AnalysisResponse(
            task_id=content_id,
            message=f"Sistemde %{similarity:.1f} oranında benzer bir kayıt bulundu.",
            is_direct_match=True,
            direct_match_data={
                "similarity": round(similarity, 2),
                "original_status": best_match.status or "Belirtilmemiş",
                "mapped_status": normalized_status,
                "evidence": dayanak,
            },
        )

    task = analyze_article.delay(content_id, text=request.text)
    return AnalysisResponse(
        task_id=task.id,
        message="Analiz görevi kuyruğa alındı. Sonuç için /status/{task_id} kullanın.",
    )


@router.post(
    "/analyze/url",
    response_model=AnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_url(
    request: UrlAnalysisRequest,
):
    """
    Verilen URL'deki haberi scrape edip hibrit NLP pipeline'ından geçirir.
    Sonuç için /status/{task_id} endpoint'ini kullanın.
    """
    content_id = str(uuid.uuid4())
    task = analyze_article_url.delay(task_id=content_id, url=str(request.url))
    return AnalysisResponse(
        task_id=task.id,
        message="URL analiz görevi kuyruğa alındı. Sonuç için /status/{task_id} kullanın.",
    )


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_analysis_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Devam eden bir analiz görevinin durumunu sorgular."""
    # 1. PostgreSQL — tamamlanmış görevler burada saklanır
    # embedding kolonu (Vector(768)) seçilmiyor — asyncpg codec sorunu önlenir
    query = (
        select(
            AnalysisResult.status,
            AnalysisResult.confidence,
            AnalysisResult.signals,
            Article.id.label("article_id"),
            Article.content.label("article_content"),
        )
        .join(Article, AnalysisResult.article_id == Article.id)
        .where(Article.metadata_info.op("->>")(  "task_id") == task_id)
    )
    result = await db.execute(query)
    match = result.first()

    if match:
        return TaskStatusResponse(
            task_id=task_id,
            status="SUCCESS",
            result={
                "content_id": task_id,
                "status": "completed",
                "db_article_id": str(match.article_id),
                "prediction": match.status,
                "confidence": match.confidence,
                "signals": match.signals if isinstance(match.signals, dict) else (json.loads(match.signals) if match.signals else {}),
                "processed_text_length": len(match.article_content or ""),
            },
        )

    # 2. Redis — görev hâlâ çalışıyorsa
    task_result = AsyncResult(task_id)
    response = TaskStatusResponse(task_id=task_id, status=task_result.status)

    if task_result.ready():
        if task_result.successful():
            response.result = task_result.result
        else:
            response.status = "FAILED"
            response.result = {"error": str(task_result.info)}

    return response
