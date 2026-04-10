"""
workers/retrain_task.py
========================
Celery Beat task: Her gece 04:30'da model yeniden eğitimi.

Pipeline:
  1. Consensus'e ulaşmış feedback'leri topla
  2. Ground-truth article'ları çek (train_classifier.py ile aynı mantık)
  3. Proportion cap uygula (feedback ≤ %15)
  4. Veri yetersizse skip
  5. Feature vektörlerini oluştur
  6. Mevcut modeli ölç (prev_accuracy)
  7. Yeni modeli eğit
  8. Accuracy guard: yeni < eski - 0.02 → skip
  9. Eski modeli backup'la, yeni modeli kaydet
 10. ModelTrainingRun kaydı yaz
 11. Admin WS push
"""
import asyncio
import logging
import os
import pickle
import shutil
import sys
import uuid as _uuid

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.models import Article, ModelFeedback, ModelTrainingRun
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector
from ml_engine.vectorizer import TurkishVectorizer

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml_engine", "models", "fake_news_classifier.pkl",
)

_VALID_STATUSES = (
    "Doğru", "DOĞRU", "doğru",
    "Yanlış", "YANLIŞ", "yanlış",
    "AUTHENTIC", "authentic",
    "FAKE", "fake",
    "TRUE", "true",
    "FALSE", "false",
)

_cleaner    = NewsCleaner()
_vectorizer = TurkishVectorizer()


def retrain_model() -> None:
    """Celery tarafından çağrılır — sync wrapper."""
    asyncio.run(_retrain_async())


async def _retrain_async() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    threshold = settings.FEEDBACK_CONSENSUS_THRESHOLD
    max_prop  = settings.FEEDBACK_MAX_PROPORTION

    try:
        async with Session() as session:
            # ── 1. Consensus'e ulaşmış feedback'ler ──────────────────────────
            consensus_subq = (
                select(
                    ModelFeedback.article_id,
                    ModelFeedback.submitted_label,
                    func.count().label("cnt"),
                )
                .group_by(ModelFeedback.article_id, ModelFeedback.submitted_label)
                .having(func.count() >= threshold)
                .subquery()
            )
            consensus_result = await session.execute(select(consensus_subq))
            consensus_raw = consensus_result.fetchall()

            # article_id başına yalnızca kazanan label'ı tut (>%60 kontrolü)
            from collections import defaultdict
            article_votes: dict = defaultdict(dict)
            for row in consensus_raw:
                article_votes[str(row.article_id)][row.submitted_label] = row.cnt

            consensus_labels: dict = {}
            for art_id, votes in article_votes.items():
                total = sum(votes.values())
                winner, winner_cnt = max(votes.items(), key=lambda x: x[1])
                if winner_cnt / total > 0.60:
                    consensus_labels[art_id] = winner

            # ── 2. Ground-truth articles ──────────────────────────────────────
            gt_result = await session.execute(
                select(Article).where(Article.status.in_(_VALID_STATUSES))
            )
            gt_articles = gt_result.scalars().all()

            # ── 3. Proportion cap ─────────────────────────────────────────────
            n_gt = len(gt_articles)
            max_feedback = int(n_gt * max_prop / (1 - max_prop))
            selected_art_ids = list(consensus_labels.keys())[:max_feedback]
            n_feedback = len(selected_art_ids)

            total_count = n_gt + n_feedback

            # ── 4. Veri yeterliliği kontrolü ──────────────────────────────────
            if total_count < 10:
                await _write_run(session, status="skipped", notes="Yetersiz veri")
                await session.commit()
                logger.info("retrain: skipped — yetersiz veri (%d örnek)", total_count)
                return

            # ── 5. Feature vektörleri: ground-truth ──────────────────────────
            X, y = [], []
            for article in gt_articles:
                label = _status_to_label(article.status)
                if label is None:
                    continue
                embedding = _get_embedding(article)
                if embedding is None:
                    continue
                signal_source = article.raw_content or article.content or ""
                signals = _cleaner.extract_manipulative_signals(signal_source)
                signal_vec = signals_to_vector(signals)
                X.append(embedding + signal_vec)
                y.append(label)

            # ── 5b. Feature vektörleri: feedback ─────────────────────────────
            if selected_art_ids:
                fb_articles_result = await session.execute(
                    select(Article).where(
                        Article.id.in_([
                            _uuid.UUID(aid) for aid in selected_art_ids
                        ])
                    )
                )
                fb_articles = fb_articles_result.scalars().all()
                for article in fb_articles:
                    label_str = consensus_labels.get(str(article.id))
                    label = 1 if label_str == "FAKE" else 0
                    embedding = _get_embedding(article)
                    if embedding is None:
                        continue
                    signal_source = article.raw_content or article.content or ""
                    signals = _cleaner.extract_manipulative_signals(signal_source)
                    signal_vec = signals_to_vector(signals)
                    X.append(embedding + signal_vec)
                    y.append(label)

            if len(X) < 10:
                await _write_run(session, status="skipped", notes="Feature çıkarılamadı — yeterli örnek yok")
                await session.commit()
                return

            X_np = np.array(X)
            y_np = np.array(y)

            stratify_arg = y_np if len(np.unique(y_np)) > 1 else None
            X_train, X_test, y_train, y_test = train_test_split(
                X_np, y_np, test_size=0.2, random_state=42, stratify=stratify_arg
            )

            # ── 6. Mevcut modelin accuracy'si ────────────────────────────────
            prev_accuracy = None
            try:
                with open(_MODEL_PATH, "rb") as f:
                    current_model = pickle.load(f)
                y_pred_prev = current_model.predict(X_test)
                prev_accuracy = float(accuracy_score(y_test, y_pred_prev))
            except Exception as exc:
                logger.warning("retrain: mevcut model ölçülemedi: %s", exc)

            # ── 7. Yeni modeli eğit ───────────────────────────────────────────
            new_pipeline = Pipeline([
                ("scaler", StandardScaler()),
                ("lr", LogisticRegression(
                    random_state=42,
                    class_weight="balanced",
                    max_iter=1000,
                    C=1.0,
                )),
            ])
            new_pipeline.fit(X_train, y_train)
            y_pred_new = new_pipeline.predict(X_test)
            new_accuracy = float(accuracy_score(y_test, y_pred_new))

            # ── 8. Accuracy guard ─────────────────────────────────────────────
            if prev_accuracy is not None and new_accuracy < prev_accuracy - 0.02:
                notes = f"Accuracy düştü: {new_accuracy:.3f} < {prev_accuracy:.3f} - 0.02"
                await _write_run(
                    session, status="skipped", notes=notes,
                    sample_count=total_count, feedback_count=n_feedback,
                    accuracy=new_accuracy, prev_accuracy=prev_accuracy,
                )
                await session.commit()
                logger.info("retrain: skipped — %s", notes)
                return

            # ── 9. Eski modeli backup'la, yeni modeli kaydet ─────────────────
            if os.path.exists(_MODEL_PATH):
                shutil.copy(_MODEL_PATH, _MODEL_PATH + ".bak")
            os.makedirs(os.path.dirname(_MODEL_PATH), exist_ok=True)
            with open(_MODEL_PATH, "wb") as f:
                pickle.dump(new_pipeline, f)

            logger.info(
                "retrain: model güncellendi — accuracy=%.4f prev=%.4f samples=%d feedback=%d",
                new_accuracy, prev_accuracy or 0, total_count, n_feedback,
            )

            # ── 10. ModelTrainingRun kaydı ────────────────────────────────────
            await _write_run(
                session, status="success",
                sample_count=total_count, feedback_count=n_feedback,
                accuracy=new_accuracy, prev_accuracy=prev_accuracy,
            )
            await session.commit()

            # ── 11. Admin WS push (transient Redis) ──────────────────────────
            try:
                import json as _json
                from redis.asyncio import from_url as _redis_from_url
                _r = await _redis_from_url(
                    settings.REDIS_URL, encoding="utf-8", decode_responses=True
                )
                try:
                    await _r.publish(
                        "admin:events",
                        _json.dumps({
                            "type": "model_retrained",
                            "payload": {
                                "accuracy":       new_accuracy,
                                "prev_accuracy":  prev_accuracy,
                                "sample_count":   total_count,
                                "feedback_count": n_feedback,
                            },
                        }, ensure_ascii=False),
                    )
                finally:
                    await _r.aclose()
            except Exception as exc:
                logger.warning("retrain: WS push hatası: %s", exc)

    finally:
        await engine.dispose()


def _status_to_label(status_str: str):
    s = (status_str or "").strip().lower()
    if any(x in s for x in ("yanlış", "false", "fake")):
        return 1
    if any(x in s for x in ("doğru", "true", "authentic")):
        return 0
    return None


def _get_embedding(article: Article):
    if article.embedding is not None:
        return list(article.embedding)
    try:
        processed = _cleaner.process(raw_iddia=article.content)
        text = processed["cleaned_text"]
    except Exception:
        text = article.content
    if not text or text == "Bilgi mevcut değil":
        return None
    return _vectorizer.get_embedding(text)


async def _write_run(
    session: AsyncSession,
    *,
    status: str,
    notes: str = None,
    sample_count: int = None,
    feedback_count: int = None,
    accuracy: float = None,
    prev_accuracy: float = None,
) -> None:
    run = ModelTrainingRun(
        status=status,
        notes=notes,
        sample_count=sample_count,
        feedback_count=feedback_count,
        accuracy=accuracy,
        prev_accuracy=prev_accuracy,
    )
    session.add(run)
