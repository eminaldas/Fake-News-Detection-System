import asyncio
import logging
import os
import pickle

from celery import Celery
from celery.signals import worker_process_init
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import AnalysisRequest, Article, AnalysisResult
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector
from ml_engine.scoring.decision_policy import POLICY_VERSION, compute_risk, ensemble_decision
from ml_engine.vectorizer import TurkishVectorizer
from workers.ai_comment_task import generate_ai_comment

logger = logging.getLogger(__name__)

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
    result_expires=3600,   # task sonuçları 1 saat sonra Redis'ten silinir
)

cleaner                  = None
vectorizer               = None
classifier_model         = None
classifier_model_version = None   # .pkl'nin mtime'ı — hangi model sürümünün yüklü olduğunu işaretler

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml_engine", "models", "fake_news_classifier.pkl",
)


def _load_classifier() -> None:
    global classifier_model, classifier_model_version
    with open(_MODEL_PATH, "rb") as f:
        classifier_model = pickle.load(f)
    classifier_model_version = str(int(os.path.getmtime(_MODEL_PATH)))


@worker_process_init.connect
def _load_models(**kwargs):
    global cleaner, vectorizer, classifier_model
    cleaner    = NewsCleaner()
    vectorizer = TurkishVectorizer()
    try:
        _load_classifier()
        logger.info("Fake News Classifier yüklendi (version=%s).", classifier_model_version)
    except Exception as exc:
        logger.warning("Classifier yüklenemedi, kural tabanlı fallback kullanılacak: %s", exc)
        classifier_model = None


def _maybe_reload_classifier() -> None:
    """
    workers/retrain_task.py her gece yeni bir .pkl yazabilir; worker süreci yeniden
    başlamadan bunu fark etmez. Her analizden önce mtime'ı kontrol edip değiştiyse
    yeniden yükler — retraining sonrası worker restart'a gerek kalmaz.
    """
    try:
        disk_mtime = str(int(os.path.getmtime(_MODEL_PATH)))
    except OSError:
        return
    if disk_mtime != classifier_model_version:
        try:
            _load_classifier()
            logger.info("Classifier yeniden yüklendi (yeni version=%s).", classifier_model_version)
        except Exception as exc:
            logger.warning("Classifier yeniden yükleme hatası, mevcut model kullanılmaya devam ediyor: %s", exc)


async def _analyze_and_save(content_id: str, text: str, news_evidence: str = None, user_id: str = None) -> dict:
    _maybe_reload_classifier()

    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    if user_id:
        try:
            import json as _json_p
            from redis.asyncio import from_url as _redis_p
            _rp = await _redis_p(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
            try:
                await _rp.publish(
                    f"user:{user_id}:events",
                    _json_p.dumps({"type": "analysis_progress", "payload": {"stage": "nlp"}}),
                )
            finally:
                await _rp.aclose()
        except Exception:
            pass

    processed   = cleaner.process(raw_iddia=text)
    signals     = processed["signals"]
    cleaned     = processed["cleaned_text"]
    raw         = processed["original_text"]

    embedding = vectorizer.get_embedding(cleaned)

    if not any(embedding):
        logger.warning(
            "zero_vector: Boş embedding üretildi — metin çok kısa veya boş. task_id=%s",
            content_id,
        )
        return {
            "task_id": content_id,
            "status": "FAILED",
            "error": "zero_vector",
            "message": "Metin çok kısa veya analiz edilemiyor. Lütfen daha uzun bir metin girin.",
        }

    risk = compute_risk(signals)
    model_probability = None
    combined_score    = None
    model_version     = None

    if classifier_model and cleaned:
        signal_vec     = signals_to_vector(signals)       # 8-dim, normalize edilmiş
        feature_vector = embedding + signal_vec           # 776-dim
        try:
            proba  = classifier_model.predict_proba([feature_vector])[0]
            fake_p = float(proba[1])

            pred_status, combined = ensemble_decision(fake_p, risk, settings.ENSEMBLE_MODEL_WEIGHT)
            confidence = round(max(combined, 1.0 - combined), 4)

            model_probability = round(fake_p, 4)
            combined_score    = round(combined, 4)
            model_version     = classifier_model_version
            decision_path     = "ensemble"
        except Exception as exc:
            logger.warning("Classifier tahmin hatası: %s", exc)
            pred_status = "UNKNOWN"
            confidence  = 0.0
            decision_path = "classifier_error"

    else:
        # Classifier yüklenemedi — kural tabanlı risk tek başına kesin FAKE/AUTHENTIC
        # kararı için yeterince güvenilir değil, bu yüzden UNKNOWN dönülür.
        logger.warning("Classifier mevcut değil, UNKNOWN dönülüyor. task_id=%s", content_id)
        pred_status = "UNKNOWN"
        confidence  = 0.0
        decision_path = "no_classifier"

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
            model_probability=model_probability,
            risk_score=round(risk, 4),
            combined_score=combined_score,
            model_version=model_version,
            policy_version=POLICY_VERSION,
            decision_path=decision_path,
        )
        session.add(analysis)
        await session.flush()

        # AnalysisRequest bu task_id ile daha önce oluşturulmuşsa (yarış durumu hariç,
        # bkz. analysis.py'de .delay()'den önce commit sırası) sonucu geri bağla.
        await session.execute(
            sa_update(AnalysisRequest)
            .where(AnalysisRequest.task_id == content_id)
            .values(result_id=analysis.id)
        )
        await session.commit()
        article_id = str(article.id)

    # confidence = max(combined, 1-combined) her zaman >= 0.50 döner, bu yüzden
    # GEMINI_ESCALATION_LOW burada hiçbir zaman tetiklenemez — üst sınır yeterli.
    _uncertain = confidence <= settings.GEMINI_ESCALATION_HIGH

    if settings.GEMINI_API_KEY:
        generate_ai_comment.apply_async(
            kwargs=dict(
                article_id=article_id,
                text=raw,
                signals=signals,
                local_verdict=pred_status,
                local_confidence=confidence,
                needs_decision=_uncertain,
                news_evidence=news_evidence,
                user_id=user_id,
            ),
            queue="ai_comment",
        )
        logger.info(
            "ai_comment_task spawn edildi → article_id=%s mod=%s",
            article_id,
            "uncertain" if _uncertain else "explanatory",
        )

    await engine.dispose()

    if user_id:
        try:
            import json as _json
            from redis.asyncio import from_url as _redis_from_url
            _r = await _redis_from_url(
                settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )
            try:
                await _r.publish(
                    f"user:{user_id}:events",
                    _json.dumps(
                        {
                            "type": "analysis_complete",
                            "payload": {
                                "task_id":    content_id,
                                "status":     pred_status,
                                "confidence": confidence,
                            },
                        },
                        ensure_ascii=False,
                    ),
                )
            finally:
                await _r.aclose()
        except Exception as exc:
            logger.warning("analysis_complete publish hatası: %s", exc)

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


@celery_app.task(name="analyze_article", rate_limit=settings.CELERY_RATE_LIMIT)
def analyze_article(content_id: str, text: str, news_evidence: str = None, user_id: str = None) -> dict:
    """Ham metin → temizlik → embedding → sınıflandırma → DB kaydı."""
    return asyncio.run(_analyze_and_save(content_id, text, news_evidence=news_evidence, user_id=user_id))


from workers.image_analysis_task import analyze_image as _analyze_image_task  # noqa: F401
from workers.deep_report_task import generate_deep_report as _generate_deep_report  # noqa: F401
from workers.evidence_verdict_task import analyze_evidence_comment as _analyze_evidence  # noqa: F401


from celery.schedules import crontab
from workers.audit_flush_task import flush_audit_buffer as _flush_audit_buffer  # noqa: F401
from workers.preference_updater import update_preference_profiles as _update_prefs
from workers.similarity_cache import build_similarity_cache as _build_sim_cache
from workers.digest_task import run_weekly_digest as _run_weekly_digest
from workers.retrain_task import retrain_model as _retrain_model
from workers.trust_tasks import recalculate_trust_scores as _recalculate_trust  # noqa: F401


@celery_app.task(name="workers.tasks.flush_audit_buffer")
def flush_audit_buffer_task() -> None:
    _flush_audit_buffer()


@celery_app.task(name="workers.tasks.update_preference_profiles")
def update_preference_profiles_task() -> None:
    _update_prefs()


@celery_app.task(name="workers.tasks.build_similarity_cache")
def build_similarity_cache_task() -> None:
    _build_sim_cache()


@celery_app.task(name="workers.tasks.weekly_digest")
def weekly_digest_task() -> dict:
    sent = _run_weekly_digest()
    return {"sent": sent}


@celery_app.task(name="workers.tasks.nightly_model_retrain")
def nightly_model_retrain_task() -> None:
    _retrain_model()


celery_app.conf.beat_schedule = {
    "flush-audit-buffer": {
        "task": "workers.tasks.flush_audit_buffer",
        "schedule": float(settings.AUDIT_FLUSH_INTERVAL),
    },
    "update-preference-profiles-4x-daily": {
        "task":     "workers.tasks.update_preference_profiles",
        "schedule": crontab(hour="2,8,14,20", minute=0),
    },
    "build-similarity-cache-daily": {
        "task":     "workers.tasks.build_similarity_cache",
        "schedule": crontab(hour=3, minute=0),
    },
    "weekly-digest-monday-morning": {
        "task":     "workers.tasks.weekly_digest",
        "schedule": crontab(hour=8, minute=0, day_of_week=1),
    },
    "nightly-model-retrain": {
        "task":     "workers.tasks.nightly_model_retrain",
        "schedule": crontab(hour=4, minute=30),
    },
    "recalculate-trust-scores-nightly": {
        "task":     "recalculate_trust_scores",
        "schedule": crontab(hour=3, minute=30),  # 03:30 her gece
    },
    "daily-digest-0900": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=6, minute=0),   # 06:00 UTC = 09:00 TRT
    },
    "daily-digest-1300": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=10, minute=0),  # 10:00 UTC = 13:00 TRT
    },
    "daily-digest-1700": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=14, minute=0),  # 14:00 UTC = 17:00 TRT
    },
    "daily-digest-2100": {
        "task":     "workers.daily_digest_task.generate_daily_digest",
        "schedule": crontab(hour=18, minute=0),  # 18:00 UTC = 21:00 TRT
    },
    "leaderboard-weekly-monday": {
        "task":     "workers.leaderboard_task.weekly_leaderboard_rewards",
        "schedule": crontab(hour=21, minute=15, day_of_week=0),  # Pazar 21:15 UTC = Pzt 00:15 TRT
    },
    "leaderboard-monthly-first": {
        "task":     "workers.leaderboard_task.monthly_leaderboard_rewards",
        "schedule": crontab(hour=0, minute=20, day_of_month=1),  # ayın 1'i 00:20 UTC = 03:20 TRT (biten ayı işler)
    },
}

# Celery task kaydı (circular import'tan kaçınmak için en sonda; celery_app yukarıda tanımlı)
import workers.leaderboard_task  # noqa: E402,F401
