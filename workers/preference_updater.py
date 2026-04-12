"""
workers/preference_updater.py
================================
Gece 02:00'de çalışır.
content_interactions → user_preference_profiles günceller.
"""
import asyncio
import logging
import uuid as _uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import (
    ContentInteraction, NewsArticle, UserNotification, UserNotificationPrefs, UserPreferenceProfile,
)

logger = logging.getLogger(__name__)

DECLARED_DECAY_PER_5    = 0.20   # her 5 etkileşimde beyan ağırlığı %20 azalır
INTERACTION_THRESHOLD   = 20     # bu sayıdan sonra declared tamamen silinir


async def _update_profiles_async() -> None:
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with Session() as db:
            rows = (await db.execute(
                select(
                    ContentInteraction.user_id,
                    ContentInteraction.category,
                    ContentInteraction.source_domain,
                    ContentInteraction.nlp_score_at_time,
                    ContentInteraction.interaction_type,
                ).where(
                    ContentInteraction.user_id.isnot(None),
                    ContentInteraction.interaction_type.in_(
                        ["click", "feedback_positive", "feedback_negative", "impression"]
                    ),
                )
            )).all()

            user_data: dict = defaultdict(lambda: {
                "category_clicks": defaultdict(float),
                "source_nlp":      defaultdict(list),
                "total_clicks":    0,
            })

            for row in rows:
                uid = str(row.user_id)
                if row.interaction_type in ("click", "feedback_positive"):
                    weight = 1.5 if row.interaction_type == "feedback_positive" else 1.0
                    if row.category:
                        user_data[uid]["category_clicks"][row.category] += weight
                    if row.source_domain and row.nlp_score_at_time is not None:
                        user_data[uid]["source_nlp"][row.source_domain].append(row.nlp_score_at_time)
                    user_data[uid]["total_clicks"] += 1
                elif row.interaction_type == "feedback_negative":
                    if row.category:
                        user_data[uid]["category_clicks"][row.category] -= 0.5

            for uid_str, data in user_data.items():
                uid   = _uuid.UUID(uid_str)
                total = data["total_clicks"]
                if total == 0:
                    continue

                cat_raw = dict(data["category_clicks"])
                max_val = max(cat_raw.values(), default=1)
                category_weights = {
                    k: round(max(0.0, min(1.0, v / max_val)), 3)
                    for k, v in cat_raw.items()
                    if v > 0
                }

                source_scores = {
                    domain: sum(scores) / len(scores)
                    for domain, scores in data["source_nlp"].items()
                }
                preferred_sources = sorted(source_scores, key=lambda d: source_scores[d])[:5]

                all_scores = [s for scores in data["source_nlp"].values() for s in scores]
                avg_nlp = sum(all_scores) / len(all_scores) if all_scores else 0.5

                existing = (await db.execute(
                    select(UserPreferenceProfile).where(UserPreferenceProfile.user_id == uid)
                )).scalar_one_or_none()

                if existing:
                    declared     = existing.declared_interests or {}
                    decay_steps  = total // 5
                    decay_factor = max(0.0, 1.0 - decay_steps * DECLARED_DECAY_PER_5)

                    if decay_factor > 0 and declared:
                        for cat, w in declared.items():
                            category_weights[cat] = category_weights.get(cat, 0) + w * decay_factor
                    if total >= INTERACTION_THRESHOLD:
                        declared = {}

                    existing.category_weights   = category_weights
                    existing.avg_nlp_tolerance  = round(avg_nlp, 3)
                    existing.preferred_sources  = preferred_sources
                    existing.declared_interests = declared
                    existing.interaction_count  = total
                    existing.last_updated       = datetime.now(timezone.utc)
                else:
                    profile = UserPreferenceProfile(
                        user_id           = uid,
                        category_weights  = category_weights,
                        avg_nlp_tolerance = round(avg_nlp, 3),
                        preferred_sources = preferred_sources,
                        declared_interests= {},
                        interaction_count = total,
                    )
                    db.add(profile)

            # ── Faz 4: High-risk alert trigger ────────────────────────────────
            await _send_high_risk_alerts(db, user_data)
            await db.commit()
            logger.info("preference_profiles güncellendi: %d kullanıcı", len(user_data))

    except Exception as e:
        logger.error("preference_profile_updater hata: %s", e)
    finally:
        await engine.dispose()


async def _send_high_risk_alerts(db: AsyncSession, user_data: dict) -> None:
    """
    Her kullanıcı için: ilgi kategorilerinde son 24 saatte yüksek riskli (nlp_score >= 0.6)
    haber varsa ve high_risk_alert=True ise in-app bildirim ekle.
    Aynı gün için tekrar bildirim gönderme.
    """
    from datetime import timedelta
    from sqlalchemy import func as sqlfunc

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    for uid_str, data in user_data.items():
        try:
            uid = _uuid.UUID(uid_str)
        except ValueError:
            continue

        # Bildirim tercihini kontrol et
        prefs = (await db.execute(
            select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == uid)
        )).scalar_one_or_none()
        if prefs and not prefs.high_risk_alert:
            continue

        # Bu kullanıcının ilgi kategorileri
        top_cats = list(data["category_clicks"].keys()) if data["category_clicks"] else []
        if not top_cats:
            continue

        # Son 24 saatte bu kategorilerde yüksek riskli haber sayısı
        count_result = (await db.execute(
            select(sqlfunc.count()).select_from(NewsArticle).where(
                NewsArticle.category.in_(top_cats),
                NewsArticle.nlp_score >= 0.6,
                NewsArticle.created_at >= cutoff,
            )
        )).scalar_one()

        if count_result < 3:
            continue

        # Bu gün için zaten bildirim gönderildi mi?
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        existing = (await db.execute(
            select(UserNotification).where(
                UserNotification.user_id == uid,
                UserNotification.title.like(f"%{today_str}%"),
                UserNotification.is_read == False,  # noqa: E712
            )
        )).scalar_one_or_none()
        if existing:
            continue

        cats_str = ", ".join(top_cats[:3])
        notif = UserNotification(
            user_id  = uid,
            title    = f"⚠️ İlgi alanlarında sahte haber artışı ({today_str})",
            body     = f"{cats_str} kategorilerinde son 24 saatte {count_result} yüksek riskli haber tespit edildi.",
            link_url = "/gundem",
        )
        db.add(notif)

    await db.commit()


def update_preference_profiles() -> None:
    asyncio.run(_update_profiles_async())
