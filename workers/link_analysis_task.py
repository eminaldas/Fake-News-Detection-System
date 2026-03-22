"""
URL tabanlı hibrit NLP sahte haber analizi — Celery görevi.

Pipeline:
  1. scrape_article(url)           → başlık + gövde
  2. cleaner.process()             → temizlenmiş metin + linguistik sinyaller
  3. vectorizer.get_embedding()    → 768 boyutlu BERT embedding
  4. pgvector cosine arama         → semantic_component
  5. TurkishStylometrics.analyse() → style_score
  6. classifier_model.predict_proba() → classifier_authentic_score
  7. Ağırlıklı truth_score (0-100) + verdict
  8. Article + AnalysisResult DB kaydı
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import Article, AnalysisResult
from ml_engine.processing.stylometric import TurkishStylometrics
from scrapers.web_scraper import ScraperError, scrape_article

# Aynı worker sürecinde zaten yüklenmiş singletonları yeniden kullan;
# BERT modelini ikinci kez belleğe yüklemekten kaçınılır.
from workers.tasks import celery_app, classifier_model, cleaner, vectorizer

logger = logging.getLogger(__name__)

_stylometrics = TurkishStylometrics()

VERDICT_AUTHENTIC_THRESHOLD = 65.0
VERDICT_FAKE_THRESHOLD = 35.0


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _semantic_component(embedding: list, matches: list) -> float:
    """
    pgvector eşleşmelerinden 0-1 arası semantic bileşeni türetir.
      - Authentic eşleşme → benzerlik skoru
      - Fake eşleşme      → 1 - benzerlik (ters)
      - Eşleşme yok       → 0.5 (nötr)
    """
    if not matches:
        return 0.5

    best, distance = matches[0]
    similarity = 1.0 - distance
    st = (best.status or "").upper()

    if st in ("AUTHENTIC", "DOĞRU", "DOGRU", "TRUE"):
        return similarity
    elif st in ("FAKE", "YANLIŞ", "YANLIS", "FALSE"):
        return 1.0 - similarity
    return 0.5


def _ling_component(signals: dict) -> float:
    """Linguistik risk skorunu 0-1 otantiklik bileşenine çevirir (ters)."""
    risk = (
        signals.get("exclamation_ratio", 0.0) * 0.4 +
        signals.get("uppercase_ratio", 0.0) * 0.4 +
        signals.get("question_density", 0.0) * 0.2
    )
    return max(0.0, 1.0 - min(risk * 5.0, 1.0))


def _truth_score(semantic: float, classifier: float, ling: float, style: float) -> float:
    """
    Ağırlıklı doğruluk skoru — 0-100, yüksek = daha otantik.

    semantic   * 0.40
    classifier * 0.35
    ling       * 0.15
    (1-style)  * 0.10
    """
    return round((
        semantic * 0.40 +
        classifier * 0.35 +
        ling * 0.15 +
        (1.0 - style) * 0.10
    ) * 100.0, 2)


def _verdict(score: float) -> str:
    if score >= VERDICT_AUTHENTIC_THRESHOLD:
        return "AUTHENTIC"
    if score <= VERDICT_FAKE_THRESHOLD:
        return "FAKE"
    return "UNCERTAIN"


# ---------------------------------------------------------------------------
# Ana async pipeline
# ---------------------------------------------------------------------------

def _make_session():
    """Fresh engine + sessionmaker per task call — prevents asyncpg loop binding across tasks."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False), engine


async def _async_pipeline(task_id: str, url: str) -> dict:
    TaskSession, task_engine = _make_session()

    # 1. Scrape
    try:
        scraped = scrape_article(url)
    except ScraperError as exc:
        logger.error("Scraping başarısız [%s]: %s", url, exc)
        await task_engine.dispose()
        return {"task_id": task_id, "status": "failed", "error": str(exc), "url": url}

    full_text = f"{scraped.title}. {scraped.body}".strip()
    if not full_text:
        await task_engine.dispose()
        return {"task_id": task_id, "status": "failed",
                "error": "URL'den okunabilir içerik çekilemedi.", "url": url}

    # 2. Temizle
    processed = cleaner.process(raw_iddia=full_text)
    cleaned_text: str = processed["cleaned_text"]
    signals: dict = processed["signals"]

    # 3. BERT embedding
    embedding = vectorizer.get_embedding(cleaned_text)

    # Sıfır vektörü kontrolü — boş metin durumunda nötr bırak
    is_zero_vec = all(v == 0.0 for v in embedding)

    # 4. Semantic arama
    semantic = 0.5
    best_match_meta = {}

    if not is_zero_vec:
        async with TaskSession() as session:
            stmt = (
                select(Article, Article.embedding.cosine_distance(embedding).label("distance"))
                .where(
                    (Article.embedding.cosine_distance(embedding) < settings.SIMILARITY_THRESHOLD)
                    & (Article.status.is_not(None))
                )
                .order_by("distance")
                .limit(3)
            )
            result = await session.execute(stmt)
            matches = result.all()

        semantic = _semantic_component(embedding, matches)

        if matches:
            bm, dist = matches[0]
            best_match_meta = {
                "matched_article_id": str(bm.id),
                "similarity": round((1.0 - dist) * 100, 2),
                "matched_status": bm.status or "UNKNOWN",
            }

    # 5. Stilometri (ham metin üzerinde — noktalama korunsun)
    style_result = _stylometrics.analyse(full_text)
    style_score: float = style_result["style_score"]

    # 6. Sınıflandırıcı
    clf_authentic = 0.5
    if classifier_model is not None and cleaned_text and not is_zero_vec:
        try:
            proba = classifier_model.predict_proba([embedding])[0]
            clf_authentic = float(proba[0])  # proba[0] = Authentic sınıfı
        except Exception as exc:
            logger.warning("Sınıflandırıcı hatası: %s", exc)

    # 7. Truth score + verdict
    ling = _ling_component(signals)
    score = _truth_score(semantic, clf_authentic, ling, style_score)
    verdict = _verdict(score)
    confidence = round(score / 100.0, 4)

    # 8. DB kaydı
    all_signals = {
        **signals,
        **{f"style_{k}": v for k, v in style_result.items()},
        "semantic_component": round(semantic, 4),
        "classifier_authentic_score": round(clf_authentic, 4),
        "ling_component": round(ling, 4),
        "truth_score": score,
    }

    async with TaskSession() as session:
        title_db = (scraped.title or full_text[:50])[:512]
        new_article = Article(
            title=title_db,
            raw_content=processed["original_text"],
            content=cleaned_text,
            embedding=embedding,
            metadata_info={
                "task_id": task_id,       # /status/{task_id} endpoint'i bunu okur
                "source_url": url,
                "pipeline": "url_analysis_v1",
                "best_match": best_match_meta,
            },
        )
        session.add(new_article)
        await session.flush()

        analysis_res = AnalysisResult(
            article_id=new_article.id,
            status=verdict,
            confidence=confidence,
            signals=all_signals,
        )
        session.add(analysis_res)
        await session.commit()
        article_id = str(new_article.id)

    await task_engine.dispose()
    logger.info("URL analizi → verdict=%s score=%.1f | %s", verdict, score, url)

    return {
        "task_id": task_id,
        "status": "completed",
        "db_article_id": article_id,
        "url": url,
        "prediction": verdict,
        "truth_score": score,
        "confidence": confidence,
        "signals": all_signals,
        "scraped_title": scraped.title,
        "processed_text_length": len(cleaned_text),
    }


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(name="analyze_article_url", rate_limit=settings.CELERY_RATE_LIMIT)
def analyze_article_url(task_id: str, url: str) -> dict:
    """
    Celery görevi: URL → Scrape → BERT → pgvector → Stilometri → truth_score → DB
    """
    return asyncio.run(_async_pipeline(task_id, url))
