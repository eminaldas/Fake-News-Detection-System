import asyncio
import logging
import os
import pickle
from datetime import datetime, timezone

from celery import Celery
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import Article, AnalysisResult
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector
from ml_engine.vectorizer import TurkishVectorizer
from workers.ai_comment_task import generate_ai_comment

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
async def _analyze_and_save(content_id: str, text: str, news_evidence: str = None) -> dict:
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Temizlik + linguistik sinyaller
    processed   = cleaner.process(raw_iddia=text)
    signals     = processed["signals"]
    cleaned     = processed["cleaned_text"]
    raw         = processed["original_text"]

    # 2. BERT embedding — tek vektör (ham metin üzerinden)
    #
    # NOT: Başlık+içerik ağırlıklı birleşim (get_weighted_embedding) bu pipeline için
    # uygun değildir. Teyit verilerinde "content" alanı orijinal haber gövdesi değil,
    # fact-check doğrulama analizidir. Bu metne ağırlık vermek modele ters sinyal üretir.
    # get_weighted_embedding yalnızca gerçek haber başlığı + haber gövdesi çiftinin
    # kesin olarak bilindiği senaryolarda (ör. URL scraping pipeline) kullanılmalıdır.
    embedding = vectorizer.get_embedding(cleaned)

    # 3. Risk skoru (kural tabanlı, genişletilmiş sinyal seti)
    #
    # Ağırlıklar — manipülatif sinyal türüne göre katkı payları:
    #   clickbait_score  : en güçlü sahte haber göstergesi
    #   exclamation_ratio: duygusal manipülasyon
    #   caps_ratio       : bağırma / abartı
    #   hedge_ratio      : belirsiz kaynak → güven azalır
    #   question_density : retorik soru yoğunluğu
    #   number_density   : yüksek rakam → manipülatif istatistik riski
    #   source_score     : güvenilir kaynak referansı → riski DÜŞÜRÜR (negatif katkı)
    #   avg_word_length  : kısa kelime ortalaması → sensasyonel dil riski
    #
    _AVG_WORD_LEN_BASELINE = 5.5   # Türkçe haber metni beklenen ortalaması
    avg_len = signals.get("avg_word_length", _AVG_WORD_LEN_BASELINE)
    short_word_penalty = max(0.0, (_AVG_WORD_LEN_BASELINE - avg_len) / _AVG_WORD_LEN_BASELINE)

    risk = (
        signals.get("clickbait_score",   0) * 0.30
        + signals.get("exclamation_ratio", 0) * 0.20
        + signals.get("caps_ratio",        0) * 0.15
        + signals.get("hedge_ratio",       0) * 0.15
        + signals.get("question_density",  0) * 0.10
        + signals.get("number_density",    0) * 0.05
        + short_word_penalty               * 0.10
        - signals.get("source_score",      0) * 0.15   # kaynak varsa riski düşür
    )
    risk = max(0.0, min(risk, 1.0))   # [0, 1] aralığına sıkıştır

    # 4. Sınıflandırma — katmanlı karar mekanizması
    #
    # Katman A — Hard override (kural tabanlı):
    #   BERT semantiğe odaklanır; güçlü sinyal kombinasyonları veya tek başına
    #   yüksek clickbait/hedge değerleri semantik kararı geçersiz kılar.
    #   Koşullar:
    #     1. clickbait > 0.15 + büyük harf veya ünlem (bağırarak sensasyon)
    #     2. clickbait > 0.30 tek başına (çoklu komplo/sensasyon ifadesi)
    #     3. clickbait + hedge + soru kombinasyonu (komplo söylemi)
    #     4. hedge > 0.15 tek başına (yüksek anonim kaynak yoğunluğu)
    #
    # Katman B — Ağırlıklı ensemble (model + kural):
    #   Feature vektörü: [768-dim BERT] + [8-dim sinyal] = 776-dim
    #   combined = 0.55 × fake_p + 0.45 × risk
    #   (BERT kurumsal dile karşı önyargılı; sinyallere daha fazla ağırlık verilir)
    #
    clickbait = signals.get("clickbait_score",   0)
    uppercase = signals.get("caps_ratio",        0)
    exclaim   = signals.get("exclamation_ratio", 0)

    hedge   = signals.get("hedge_ratio",       0)
    question = signals.get("question_density", 0)

    strong_manipulative = (
        (clickbait > 0.15 and uppercase > 0.12) or              # bağırarak sensasyon
        (clickbait > 0.15 and exclaim   > 0.02) or              # clickbait + ünlem
        (clickbait > 0.30) or                                    # çoklu komplo/sensasyon ifadesi
        (clickbait > 0.05 and hedge > 0.08) or                       # clickbait + anonim kaynak kombinasyonu (soru işareti gerekmez)
        (hedge > 0.15)                                           # yüksek anonim kaynak yoğunluğu
    )

    if strong_manipulative:
        # Güven: sinyal yoğunluğuna göre 0.55-0.90 arası kalibre edilir
        pred_status    = "FAKE"
        override_conf  = 0.55 + clickbait * 0.50 + exclaim * 2.0 + uppercase * 0.30
        confidence     = round(min(override_conf, 0.90), 4)

    elif classifier_model and cleaned:
        signal_vec     = signals_to_vector(signals)       # 8-dim, normalize edilmiş
        feature_vector = embedding + signal_vec           # 776-dim
        try:
            proba  = classifier_model.predict_proba([feature_vector])[0]
            fake_p = float(proba[1])

            combined    = 0.55 * fake_p + 0.45 * risk
            pred_status = "FAKE" if combined > 0.50 else "AUTHENTIC"
            confidence  = round(max(combined, 1.0 - combined), 4)
        except Exception as exc:
            logger.warning("Classifier tahmin hatası: %s", exc)
            pred_status = "UNKNOWN"
            confidence  = 0.0

    else:
        # Classifier yok — yalnızca kural tabanlı karar
        pred_status = "FAKE" if risk > 0.20 else "AUTHENTIC"
        confidence  = round(min(risk if risk > 0.20 else 1.0 - risk, 0.99), 4)

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

        _ai_comment_skipped = None
        if strong_manipulative:
            _ai_comment_skipped = {
                "summary": "Yüksek güvenli otomatik tespit — linguistik sinyal eşiği aşıldı.",
                "evidence": [],
                "gemini_verdict": None,
                "model": None,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

        analysis = AnalysisResult(
            article_id=article.id,
            status=pred_status,
            confidence=confidence,   # artık Float
            signals=signals,         # artık JSONB — dict doğrudan
            ai_comment=_ai_comment_skipped,
        )
        session.add(analysis)
        await session.commit()
        article_id = str(article.id)

    # ── Phase 2: AI yorum task'ını spawn et ────────────────────────────────────
    # Hard override durumunda (strong_manipulative) Gemini'ye gerek yok.
    # Yalnızca classifier karar verdiyse veya kural bazlı fallback'te spawn edilir.
    _LOW  = settings.GEMINI_ESCALATION_LOW
    _HIGH = settings.GEMINI_ESCALATION_HIGH
    _uncertain = _LOW <= confidence <= _HIGH

    if not strong_manipulative and settings.GEMINI_API_KEY:
        generate_ai_comment.apply_async(
            kwargs=dict(
                article_id=article_id,
                text=raw,
                signals=signals,
                local_verdict=pred_status,
                local_confidence=confidence,
                needs_decision=_uncertain,
                news_evidence=news_evidence,
            ),
            queue="ai_comment",
        )
        logger.info(
            "ai_comment_task spawn edildi → article_id=%s mod=%s",
            article_id,
            "uncertain" if _uncertain else "explanatory",
        )

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
def analyze_article(content_id: str, text: str, news_evidence: str = None) -> dict:
    """Ham metin → temizlik → embedding → sınıflandırma → DB kaydı."""
    return asyncio.run(_analyze_and_save(content_id, text, news_evidence=news_evidence))


# Görsel analiz task'ını kaydet — worker startup'ta keşfedilsin
from workers.image_analysis_task import analyze_image as _analyze_image_task  # noqa: F401


# ─────────────────────────────────────────────────────────────────────────────
# Audit flush task + beat schedule
# ─────────────────────────────────────────────────────────────────────────────
from celery.schedules import crontab
from workers.audit_flush_task import flush_audit_buffer as _flush_audit_buffer  # noqa: F401
from workers.preference_updater import update_preference_profiles as _update_prefs
from workers.similarity_cache import build_similarity_cache as _build_sim_cache


@celery_app.task(name="workers.tasks.flush_audit_buffer")
def flush_audit_buffer_task() -> None:
    _flush_audit_buffer()


@celery_app.task(name="workers.tasks.update_preference_profiles")
def update_preference_profiles_task() -> None:
    _update_prefs()


@celery_app.task(name="workers.tasks.build_similarity_cache")
def build_similarity_cache_task() -> None:
    _build_sim_cache()


celery_app.conf.beat_schedule = {
    "flush-audit-buffer-every-5s": {
        "task": "workers.tasks.flush_audit_buffer",
        "schedule": 5.0,
    },
    "update-preference-profiles-nightly": {
        "task":     "workers.tasks.update_preference_profiles",
        "schedule": crontab(hour=2, minute=0),
    },
    "build-similarity-cache-daily": {
        "task":     "workers.tasks.build_similarity_cache",
        "schedule": crontab(hour=3, minute=0),
    },
}
