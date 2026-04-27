from typing import Optional
import base64
import io

import imagehash
from PIL import Image, UnidentifiedImageError
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from celery.result import AsyncResult
import uuid
import json

from app.api.deps import get_current_user, get_optional_user
from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import check_rate_limit
from app.core.security import hash_ip
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import AnalysisRequest, AnalysisType, Article, AnalysisResult, ImageCache, NewsArticle, User, ModelFeedback
from app.schemas.schemas import (
    AnalysisResponse,
    ContentAnalysisRequest,
    FeedbackRequest,
    FullReportResponse,
    ImageAnalysisResponse,
    SharedAnalysisResponse,
    SignalsRequest,
    SignalsResponse,
    TaskStatusResponse,
    UrlAnalysisRequest,
)
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer
from workers.image_analysis_task import analyze_image as celery_analyze_image
from workers.link_analysis_task import analyze_article_url
from workers.tasks import analyze_article

router = APIRouter()

vectorizer = TurkishVectorizer()
cleaner    = NewsCleaner()

_MAX_IMAGE_BYTES = 25 * 1024 * 1024  # 25 MB
_PHASH_MATCH_THRESHOLD = 10           # Hamming distance ≤ 10 → eşleşme
_AI_KEYWORDS = [
    "midjourney", "stable diffusion", "dall-e", "dall·e",
    "firefly", "adobe photoshop", "runway", "imagen",
    "bing image", "nightcafe", "leonardo.ai",
]


def _compute_phash(image: Image.Image) -> str:
    return str(imagehash.phash(image))


def _phash_distance(h1: str, h2: str) -> int:
    return imagehash.hex_to_hash(h1) - imagehash.hex_to_hash(h2)


def _extract_exif_flags(image: Image.Image) -> dict:
    """Pillow ile EXIF okur, AI yazılım izlerini döndürür."""
    flags = {}
    try:
        exif_raw = image._getexif()
        if not exif_raw:
            return flags
        from PIL.ExifTags import TAGS
        for tag_id, value in exif_raw.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            if tag_name in ("Software", "Make", "Model", "Artist", "Copyright"):
                flags[tag_name] = str(value)
    except Exception:
        pass
    return flags


def _detect_ai_software(exif_flags: dict) -> Optional[str]:
    """Varsa AI yazılım adını döndürür, yoksa None."""
    for val in exif_flags.values():
        for kw in _AI_KEYWORDS:
            if kw in val.lower():
                return val
    return None


async def _get_news_evidence(db: AsyncSession, embedding: list) -> Optional[str]:
    """
    news_articles tablosunda cosine benzerliği yüksek haber var mı bak.
    Varsa 'X kaynakta yayınlandı' bilgisini döndür.
    Verdict VERMEZ — sadece Gemini prompt'una ek bağlam sağlar.
    """
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = text(
        """
        SELECT source_name, source_count, trust_score,
               embedding <=> :emb AS dist
        FROM news_articles
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :emb
        LIMIT 3
        """
    )
    result = await db.execute(sql, {"emb": embedding_str})
    rows = result.fetchall()
    if not rows:
        return None
    close = [r for r in rows if r.dist < 0.20]
    if not close:
        return None
    sources = ", ".join(
        f"{r.source_name} (güven: {r.trust_score:.1f})"
        for r in close
        if r.source_name
    )
    return f"Bu haber şu kaynaklarda da yayınlandı: {sources}."


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

    # ── Deduplication: same cleaned text already analysed? ─────────────────
    dedup_result = await db.execute(
        select(
            Article.id,
            Article.metadata_info,
            AnalysisResult.status,
            AnalysisResult.confidence,
            AnalysisResult.signals,
            AnalysisResult.ai_comment,
        )
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.content == cleaned_for_search)
        .limit(1)
    )
    dedup_row = dedup_result.first()
    if dedup_row:
        existing_task_id = (
            dedup_row.metadata_info.get("task_id") if dedup_row.metadata_info else None
        ) or str(dedup_row.id)
        return AnalysisResponse(
            task_id=existing_task_id,
            message="Bu içerik daha önce analiz edildi.",
            is_direct_match=True,
        )

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

        # Analiz isteğini logla — eşleşen makalenin task_id'sini sakla ki history join çalışsın
        matched_task_id = (
            best_match.metadata_info.get("task_id") if best_match.metadata_info else None
        ) or str(best_match.id)
        ar = AnalysisRequest(
            user_id=current_user.id if current_user else None,
            ip_hash=hash_ip(ip),
            analysis_type=AnalysisType.text,
            task_id=matched_task_id,
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
                "db_article_id":   str(best_match.id),
            },
        )

    news_evidence = await _get_news_evidence(db, embedding)
    task = analyze_article.delay(
        content_id,
        text=request.text,
        news_evidence=news_evidence,
        user_id=str(current_user.id) if current_user else None,
    )

    # Analiz isteğini logla — content_id sakla (task.id değil) ki history join çalışsın
    # Article metadata_info['task_id'] = content_id olarak yaratılır
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

    # ── Deduplication: same source_url already analysed? ───────────────────
    url_str = str(request.url)
    dedup_url_result = await db.execute(
        select(
            Article.id,
            Article.metadata_info,
            AnalysisResult.status,
            AnalysisResult.confidence,
            AnalysisResult.signals,
            AnalysisResult.ai_comment,
        )
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.metadata_info.op("->>")(  "source_url") == url_str)
        .limit(1)
    )
    dedup_url_row = dedup_url_result.first()
    if dedup_url_row:
        existing_task_id = (
            dedup_url_row.metadata_info.get("task_id") if dedup_url_row.metadata_info else None
        ) or str(dedup_url_row.id)
        return AnalysisResponse(
            task_id=existing_task_id,
            message="Bu URL daha önce analiz edildi.",
            is_direct_match=True,
        )

    task = analyze_article_url.delay(task_id=content_id, url=url_str)

    # Analiz isteğini logla — content_id sakla (task.id değil) ki history join çalışsın
    # Article metadata_info['task_id'] = content_id (kwarg) olarak yaratılır
    ar = AnalysisRequest(
        user_id=current_user.id if current_user else None,
        ip_hash=hash_ip(ip),
        analysis_type=AnalysisType.url,
        task_id=content_id,
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


@router.post(
    "/analyze/image",
    response_model=ImageAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_image_endpoint(
    http_request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Görsel sahtelik analizi — 3 katmanlı escalation.
    Layer 1 (pHash) ve Layer 2 (EXIF) kotadan düşmez.
    Layer 3 (Gemini) kotadan düşer ve Celery kuyruğuna girer.
    """
    log = get_logger(__name__)
    ip = http_request.client.host if http_request.client else "unknown"
    content_id = str(uuid.uuid4())

    # ── Boyut kontrolü ─────────────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Görsel 25 MB'dan büyük olamaz.",
        )

    # ── Görsel aç ──────────────────────────────────────────────────────────
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except (UnidentifiedImageError, IOError, SyntaxError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu format desteklenmiyor, lütfen farklı bir görsel deneyin.",
        )

    # ── Layer 1: pHash lookup ───────────────────────────────────────────────
    phash_str = _compute_phash(image)
    cache_rows_result = await db.execute(select(ImageCache))
    cache_rows = cache_rows_result.scalars().all()

    for row in cache_rows:
        try:
            dist = _phash_distance(phash_str, row.phash)
        except Exception as e:
            log.warning("image.cache_invalid_phash", phash=row.phash, error=str(e))
            continue
        if dist <= _PHASH_MATCH_THRESHOLD and row.gemini_result:
            log.info("image.cache_hit", phash=phash_str, distance=dist)
            return ImageAnalysisResponse(
                task_id=content_id,
                message="Bu görsel daha önce analiz edildi.",
                is_direct_match=True,
                direct_match_data={
                    "layer": 1,
                    "hamming_distance": dist,
                    **row.gemini_result,
                },
            )

    # ── Layer 2: EXIF metadata ──────────────────────────────────────────────
    exif_flags = _extract_exif_flags(image)
    ai_software = _detect_ai_software(exif_flags)
    if ai_software:
        log.info("image.exif_ai_detected", software=ai_software)

    # ── Layer 3: Gemini — kota burada düşer ────────────────────────────────
    await check_rate_limit(http_request, redis, current_user)

    image_b64 = base64.b64encode(contents).decode("utf-8")
    task = celery_analyze_image.delay(content_id, image_b64, phash_str, exif_flags)

    # ── Analiz isteğini logla ───────────────────────────────────────────────
    ar = AnalysisRequest(
        user_id=current_user.id if current_user else None,
        ip_hash=hash_ip(ip),
        analysis_type=AnalysisType.image,
        task_id=content_id,
    )
    db.add(ar)
    await db.commit()

    log.info(
        "image_analysis.requested",
        user_id=str(current_user.id) if current_user else None,
        task_id=task.id,
        exif_ai=ai_software,
    )

    return ImageAnalysisResponse(
        task_id=task.id,
        message="Görsel analiz kuyruğa alındı.",
        is_direct_match=False,
        exif_flags=exif_flags if exif_flags else None,
    )


@router.post(
    "/feedback",
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_feedback(
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kullanıcı bir analiz sonucunun yanlış olduğunu bildiriyor.
    Güven < 0.80 olan sonuçlar için kabul edilir; yüksek güvenliler reddedilir.
    """
    from sqlalchemy.exc import IntegrityError

    # 1. task_id ile makaleyi bul
    result = await db.execute(
        select(Article, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.metadata_info.op("->>")(  "task_id") == request.task_id)
        .limit(1)
    )
    row = result.first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu task_id ile eşleşen analiz bulunamadı.",
        )

    article, analysis_result = row

    # 2. Confidence guard — yüksek güven → feedback kabul etme
    if analysis_result.confidence is not None and analysis_result.confidence >= settings.FEEDBACK_CONFIDENCE_GUARD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Model bu sonuçtan yeterince emin, düzeltme kabul edilmiyor.",
        )

    # 3. Feedback kaydını ekle — (article_id, user_id) çakışırsa 409
    feedback = ModelFeedback(
        article_id=article.id,
        user_id=current_user.id,
        submitted_label=request.submitted_label,
    )
    db.add(feedback)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu analiz için zaten geri bildirim gönderdiniz.",
        )

    return {"accepted": True}


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
            celery_res = task_result.result or {}
            db_article_id = celery_res.get("db_article_id")

            # Phase-2 (ai_comment) henüz yazılmış olabilir — DB'den taze veri çek
            if db_article_id:
                try:
                    db_query = (
                        select(
                            AnalysisResult.status,
                            AnalysisResult.confidence,
                            AnalysisResult.signals,
                            AnalysisResult.ai_comment,
                            Article.id.label("article_id"),
                            Article.content.label("article_content"),
                        )
                        .join(Article, AnalysisResult.article_id == Article.id)
                        .where(Article.id == db_article_id)
                    )
                    db_result = await db.execute(db_query)
                    db_match = db_result.first()
                    if db_match:
                        response.status = "SUCCESS"
                        response.result = {
                            **celery_res,
                            "ai_comment": db_match.ai_comment if isinstance(db_match.ai_comment, dict) else (json.loads(db_match.ai_comment) if db_match.ai_comment else None),
                        }
                        return response
                except Exception:
                    pass

            response.result = celery_res
        else:
            response.status = "FAILED"
            response.result = {"error": str(task_result.info)}

    return response


@router.post("/analyze/signals", response_model=SignalsResponse, status_code=status.HTTP_200_OK)
async def analyze_signals(
    body:         SignalsRequest,
    current_user: User = Depends(get_current_user),
):
    """Başlık metnini NLP sinyallerine göre hızlıca değerlendirir. ML/BERT çalışmaz."""
    signals = cleaner.extract_manipulative_signals(body.text)
    # Ağırlıklar: başlık/hızlı sinyal için ayarlanmış — _compute_risk'ten kasıtlı farklı.
    # avg_word_length kısa başlık tespitinde daha yüksek katkı alır (0.10 vs. 0.00 ingest'te).

    risk = (
        signals["clickbait_score"]   * 0.28 +
        signals["exclamation_ratio"] * 0.20 +
        signals["caps_ratio"]        * 0.15 +
        signals["hedge_ratio"]       * 0.15 +
        signals["question_density"]  * 0.10 +
        signals["number_density"]    * 0.05 +
        max(0.0, 4.5 - signals["avg_word_length"]) / 4.5 * 0.10 -
        signals["source_score"]      * 0.15
    )
    risk = round(max(0.0, min(1.0, risk)), 4)

    return SignalsResponse(
        clickbait_score=signals["clickbait_score"],
        caps_ratio=signals["caps_ratio"],
        exclamation_ratio=signals["exclamation_ratio"],
        hedge_ratio=signals["hedge_ratio"],
        source_score=signals["source_score"],
        risk_score=risk,
        label="suspicious" if risk > 0.30 else "clean",
    )


@router.get("/share/{article_id}", response_model=SharedAnalysisResponse, status_code=status.HTTP_200_OK)
async def get_shared_analysis(
    article_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Analiz sonucunu auth gerektirmeden döner — paylaşım linkleri için."""
    try:
        uid = uuid.UUID(article_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Bulunamadı")

    row = await db.execute(
        select(Article, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.article_id == Article.id)
        .where(Article.id == uid)
    )
    pair = row.first()
    if not pair:
        raise HTTPException(status_code=404, detail="Bulunamadı")

    article, result = pair
    signals = result.signals or {}
    return SharedAnalysisResponse(
        article_id=str(article.id),
        title=article.title or "",
        prediction=result.status,
        confidence=result.confidence or 0.0,
        risk_score=signals.get("risk_score"),
        clickbait_score=signals.get("clickbait_score"),
        created_at=result.created_at.isoformat() if result.created_at else None,
    )


@router.post(
    "/analyze/full-report/{task_id}",
    response_model=FullReportResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_full_report(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kayıtlı kullanıcı için derin Gemini raporu başlatır.
    Rapor daha önce üretildiyse 200 + rapor döner (Gemini çalışmaz).
    """
    from workers.deep_report_task import generate_deep_report

    row = await db.execute(
        select(
            AnalysisResult.id,
            AnalysisResult.full_report,
            Article.metadata_info,
        )
        .join(Article, AnalysisResult.article_id == Article.id)
        .where(Article.metadata_info.op("->>")(  "task_id") == task_id)
        .limit(1)
    )
    data = row.first()

    if not data:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı.")

    if data.full_report:
        return FullReportResponse(
            task_id=task_id,
            status="cached",
            report=data.full_report,
        )

    generate_deep_report.apply_async(
        kwargs={"task_id": task_id, "user_id": str(current_user.id)},
        queue="deep_report",
    )

    return FullReportResponse(
        task_id=task_id,
        status="queued",
        message="Derin analiz kuyruğa alındı.",
    )


@router.get(
    "/analyze/full-report/{task_id}",
    response_model=FullReportResponse,
    status_code=status.HTTP_200_OK,
)
async def get_full_report(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Üretilmiş tam raporu getirir. Henüz hazır değilse 404."""
    row = await db.execute(
        select(AnalysisResult.full_report, AnalysisResult.confidence, AnalysisResult.status)
        .join(Article, AnalysisResult.article_id == Article.id)
        .where(Article.metadata_info.op("->>")(  "task_id") == task_id)
        .limit(1)
    )
    data = row.first()

    if not data or not data.full_report:
        raise HTTPException(status_code=404, detail="Rapor henüz hazır değil.")

    return FullReportResponse(
        task_id=task_id,
        status="cached",
        report=data.full_report,
        confidence=data.confidence,
        ml_verdict=data.status,
    )
