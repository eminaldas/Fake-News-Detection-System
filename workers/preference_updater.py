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
from app.models.models import ContentInteraction, UserPreferenceProfile

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

            await db.commit()
            logger.info("preference_profiles güncellendi: %d kullanıcı", len(user_data))

    except Exception as e:
        logger.error("preference_profile_updater hata: %s", e)
    finally:
        await engine.dispose()


def update_preference_profiles() -> None:
    asyncio.run(_update_profiles_async())
