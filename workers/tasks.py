import asyncio
import logging
import os
import pickle

from celery import Celery
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import Article, AnalysisResult
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Celery
# ─────────────────────────────────────────────────────────────────────────────
celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# ─────────────────────────────────────────────────────────────────────────────
# NLP singleton'ları — worker sürecinde bir kez yüklenir
# ─────────────────────────────────────────────────────────────────────────────
cleaner    = NewsCleaner()
vectorizer = TurkishVectorizer()

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml_engine", "models", "fake_news_classifier.pkl",
)
try:
    with open(_MODEL_PATH, "rb") as f:
        classifier_model = pickle.load(f)
    logger.info("Fake News Classifier yüklendi.")
except Exception as exc:
    logger.warning("Classifier yüklenemedi, kural tabanlı fallback kullanılacak: %s", exc)
    classifier_model = None


# ─────────────────────────────────────────────────────────────────────────────
# Async pipeline
# ─────────────────────────────────────────────────────────────────────────────
async def _analyze_and_save(content_id: str, text: str) -> dict:
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Temizlik + linguistik sinyaller
    processed   = cleaner.process(raw_iddia=text)
    signals     = processed["signals"]
    cleaned     = processed["cleaned_text"]
    raw         = processed["original_text"]

    # 2. BERT embedding
    embedding = vectorizer.get_embedding(cleaned)

    # 3. Risk skoru (kural tabanlı)
    risk = (
        signals.get("exclamation_ratio", 0) * 0.4
        + signals.get("uppercase_ratio",   0) * 0.4
        + signals.get("question_density",  0) * 0.2
    )

    # 4. Sınıflandırma
    if classifier_model and cleaned:
        try:
            proba    = classifier_model.predict_proba([embedding])[0]
            fake_p   = float(proba[1])
            max_p    = float(max(proba))

            if max_p < 0.60 and risk > 0.03:
                pred_status = "FAKE"
                confidence  = round(max(max_p, min(risk * 10, 0.99)), 4)
            else:
                pred_status = "FAKE" if fake_p > 0.5 else "AUTHENTIC"
                confidence  = round(max_p, 4)
        except Exception as exc:
            logger.warning("Classifier tahmin hatası: %s", exc)
            pred_status = "UNKNOWN"
            confidence  = 0.0
    else:
        pred_status = "FAKE" if risk > 0.05 else "AUTHENTIC"
        confidence  = round(min(risk * 10, 0.99), 4)

    # 5. DB kaydı
    title_db = (text[:50] + "...") if len(text) > 50 else text
    async with Session() as session:
        article = Article(
            title=title_db,
            raw_content=raw,
            content=cleaned,
            embedding=embedding,
            metadata_info={"task_id": content_id},
        )
        session.add(article)
        await session.flush()

        analysis = AnalysisResult(
            article_id=article.id,
            status=pred_status,
            confidence=confidence,   # artık Float
            signals=signals,         # artık JSONB — dict doğrudan
        )
        session.add(analysis)
        await session.commit()
        article_id = str(article.id)

    await engine.dispose()
    logger.info("Analiz tamamlandı → status=%s conf=%.4f id=%s", pred_status, confidence, article_id)

    return {
        "content_id":            content_id,
        "status":                "completed",
        "db_article_id":         article_id,
        "prediction":            pred_status,
        "confidence":            confidence,
        "signals":               signals,
        "processed_text_length": len(cleaned),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Celery task
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(name="analyze_article", rate_limit=settings.CELERY_RATE_LIMIT)
def analyze_article(content_id: str, text: str) -> dict:
    """Ham metin → temizlik → embedding → sınıflandırma → DB kaydı."""
    return asyncio.run(_analyze_and_save(content_id, text))
