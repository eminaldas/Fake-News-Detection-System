from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from celery.result import AsyncResult
import uuid
import json

from app.api.deps import get_optional_user
from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import check_rate_limit
from app.core.security import hash_ip
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import AnalysisRequest, AnalysisType, Article, AnalysisResult, User
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
    http_request: Request,
    request: ContentAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Haber metni için sahte haber analizi başlatır.
    Önce anlık semantik benzerlik kontrolü yapar;
    eşleşme yoksa derin analizi Celery kuyruğuna ekler.
    """
    log = get_logger(__name__)
    ip = http_request.client.host if http_request.client else "unknown"
    await check_rate_limit(http_request, redis, current_user)

    content_id = str(uuid.uuid4())

    nlp_result         = cleaner.process(raw_iddia=request.text)
    cleaned_for_search = nlp_result["cleaned_text"]
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
        # ── Stage 1: Çoklu eşleşme — benzerlik ağırlıklı oylama ─────────────
        #
        # Tek en iyi eşleşmeyi kullanmak yerine top-3 sonucun ağırlıklı oyunu
        # hesaplarız. Bu yaklaşım; bilgi tabanında birden fazla benzer kayıt
        # olduğunda daha tutarlı ve güvenilir bir karar üretir.
        #
        # Ağırlık: w = similarity² — yakın eşleşmeler üstel olarak daha fazla oy taşır.

        def _normalize_status(raw: str) -> str:
            if not raw:
                return "UNKNOWN"
            upper = raw.strip().upper()
            if upper in {"FAKE", "YANLIŞ", "YANLIS", "FALSE"}:
                return "FAKE"
            if upper in {"AUTHENTIC", "DOĞRU", "DOGRU", "TRUE"}:
                return "AUTHENTIC"
            return "UNKNOWN"

        weighted_votes: dict[str, float] = {"FAKE": 0.0, "AUTHENTIC": 0.0}
        for article, dist in matches:
            sim    = max(0.0, 1.0 - dist)          # [0, 1]
            weight = sim ** 2                       # yakın eşleşmelere üstel ağırlık
            status = _normalize_status(article.status)
            if status in weighted_votes:
                weighted_votes[status] += weight

        # Kazanan: en yüksek ağırlıklı oy
        winner = max(weighted_votes, key=weighted_votes.get)
        total_weight = sum(weighted_votes.values()) or 1.0
        vote_confidence = round(weighted_votes[winner] / total_weight * 100, 1)

        # Kanıt ve benzerlik bilgisi en iyi eşleşmeden alınır
        best_match, best_dist = matches[0]
        best_similarity = (1 - best_dist) * 100
        dayanak = (
            best_match.metadata_info.get("dayanak_noktalari", "Bilinmiyor")
            if best_match.metadata_info
            else "Bilinmiyor"
        )

        # Direct match için sinyal hesapla (triggered_words dahil)
        # cleaner zaten line 25'te tanımlı, nlp_result line 44'te hesaplandı
        match_signals = nlp_result["signals"]

        # Analiz isteğini logla
        ar = AnalysisRequest(
            user_id=current_user.id if current_user else None,
            ip_hash=hash_ip(ip),
            analysis_type=AnalysisType.text,
            task_id=content_id,
        )
        db.add(ar)
        await db.commit()

        log.info(
            "analysis.requested",
            user_id=str(current_user.id) if current_user else None,
            ip_hash=hash_ip(ip),
            type="text",
            task_id=content_id,
        )

        return AnalysisResponse(
            task_id=content_id,
            message=(
                f"Sistemde %{best_similarity:.1f} oranında benzer {len(matches)} kayıt bulundu. "
                f"Oylama güveni: %{vote_confidence:.1f}"
            ),
            is_direct_match=True,
            direct_match_data={
                "similarity":      round(best_similarity, 2),
                "original_status": best_match.status or "Belirtilmemiş",
                "mapped_status":   winner,
                "evidence":        dayanak,
                "match_count":     len(matches),
                "vote_confidence": vote_confidence,
                "signals":         match_signals,   # SignalPanel ve HighlightedText için
            },
        )

    task = analyze_article.delay(content_id, text=request.text)

    # Analiz isteğini logla
    ar = AnalysisRequest(
        user_id=current_user.id if current_user else None,
        ip_hash=hash_ip(ip),
        analysis_type=AnalysisType.text,
        task_id=task.id,
    )
    db.add(ar)
    await db.commit()

    log.info(
        "analysis.requested",
        user_id=str(current_user.id) if current_user else None,
        ip_hash=hash_ip(ip),
        type="text",
        task_id=task.id,
    )

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
    http_request: Request,
    request: UrlAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Verilen URL'deki haberi scrape edip hibrit NLP pipeline'ından geçirir.
    Sonuç için /status/{task_id} endpoint'ini kullanın.
    """
    log = get_logger(__name__)
    ip = http_request.client.host if http_request.client else "unknown"
    await check_rate_limit(http_request, redis, current_user)

    content_id = str(uuid.uuid4())
    task = analyze_article_url.delay(task_id=content_id, url=str(request.url))

    # Analiz isteğini logla
    ar = AnalysisRequest(
        user_id=current_user.id if current_user else None,
        ip_hash=hash_ip(ip),
        analysis_type=AnalysisType.url,
        task_id=task.id,
    )
    db.add(ar)
    await db.commit()

    log.info(
        "analysis.requested",
        user_id=str(current_user.id) if current_user else None,
        ip_hash=hash_ip(ip),
        type="url",
        task_id=task.id,
    )

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
            AnalysisResult.ai_comment,
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
                "ai_comment": match.ai_comment if isinstance(match.ai_comment, dict) else (json.loads(match.ai_comment) if match.ai_comment else None),
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
