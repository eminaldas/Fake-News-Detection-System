"""
workers/trust_tasks.py
======================
Celery görevi — tüm kullanıcıların forum trust skorunu nightly yeniden hesaplar.

Çalıştırma:
  celery -A workers.trust_tasks worker --loglevel=info

Beat zamanlaması Task 4'te ayrı bir dosyada tanımlanacaktır.
"""

import asyncio
import logging
from collections import defaultdict

from celery import Celery
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy import text

from app.core.config import settings

logger = logging.getLogger("TrustTask")

# ─────────────────────────────────────────────────────────────────────────────
# Celery Uygulama
# ─────────────────────────────────────────────────────────────────────────────
celery_app = Celery(
    "trust",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Istanbul",
    enable_utc=True,
)

# Beat zamanlaması Task 4'te eklenir — burada tanımlanmaz.


# ─────────────────────────────────────────────────────────────────────────────
# Yardımcı: tier hesaplama
# ─────────────────────────────────────────────────────────────────────────────
def _score_to_tier(score: float) -> str:
    if score <= 25.0:
        return "yeni_uye"
    elif score <= 50.0:
        return "dogrulayici"
    elif score <= 75.0:
        return "analist"
    else:
        return "dedektif"


# ─────────────────────────────────────────────────────────────────────────────
# Async iş mantığı
# ─────────────────────────────────────────────────────────────────────────────
async def _recalculate() -> dict:
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)

    updated_count    = 0
    highlighted_count = 0

    try:
        # ── Okuma fazı: yazma kilidi olmadan tüm sinyalleri topla ────────────
        async with engine.connect() as conn:

            # Adım 1: Kullanıcı bazında sinyal toplaması
            # helpful_total, comment_count, thread_count tek sorguda alınır.
            signals_rows = await conn.execute(text("""
                SELECT
                    u.id                              AS user_id,
                    COALESCE(SUM(c.helpful_count), 0) AS helpful_total,
                    COUNT(DISTINCT c.id)              AS comment_count,
                    COUNT(DISTINCT t.id)              AS thread_count
                FROM users u
                LEFT JOIN forum_comments c ON c.user_id = u.id
                LEFT JOIN forum_threads  t ON t.author_id = u.id
                GROUP BY u.id
            """))
            signals = {
                row.user_id: {
                    "helpful_total": int(row.helpful_total),
                    "comment_count": int(row.comment_count),
                    "thread_count":  int(row.thread_count),
                }
                for row in signals_rows
            }

            if not signals:
                logger.info("Hiç kullanıcı bulunamadı, görev tamamlandı.")
                return {"updated_users": 0, "highlighted_comments": 0}

            # Adım 2: Oy doğruluğu (vote_accuracy)
            # Yalnızca total_votes >= 10 olan thread'ler geçerli (gürültü filtresi).
            votes_rows = await conn.execute(text("""
                SELECT
                    fv.user_id,
                    fv.thread_id,
                    fv.vote_type,
                    thread_votes.majority_vote
                FROM forum_votes fv
                JOIN (
                    SELECT
                        thread_id,
                        SUM(CASE WHEN vote_type = 'suspicious'   THEN 1 ELSE 0 END) AS cnt_suspicious,
                        SUM(CASE WHEN vote_type = 'authentic'    THEN 1 ELSE 0 END) AS cnt_authentic,
                        SUM(CASE WHEN vote_type = 'investigate'  THEN 1 ELSE 0 END) AS cnt_investigate,
                        COUNT(*)                                                     AS total_votes,
                        (
                            CASE
                                WHEN SUM(CASE WHEN vote_type = 'suspicious'  THEN 1 ELSE 0 END) >=
                                     SUM(CASE WHEN vote_type = 'authentic'   THEN 1 ELSE 0 END)
                                     AND
                                     SUM(CASE WHEN vote_type = 'suspicious'  THEN 1 ELSE 0 END) >=
                                     SUM(CASE WHEN vote_type = 'investigate' THEN 1 ELSE 0 END)
                                THEN 'suspicious'
                                WHEN SUM(CASE WHEN vote_type = 'authentic'   THEN 1 ELSE 0 END) >=
                                     SUM(CASE WHEN vote_type = 'investigate' THEN 1 ELSE 0 END)
                                THEN 'authentic'
                                ELSE 'investigate'
                            END
                        ) AS majority_vote
                    FROM forum_votes
                    GROUP BY thread_id
                    HAVING COUNT(*) >= 10
                ) AS thread_votes ON fv.thread_id = thread_votes.thread_id
            """))

            # Kullanıcı bazında doğru / toplam sayısını hesapla
            vote_correct: dict = defaultdict(int)
            vote_total:   dict = defaultdict(int)
            for row in votes_rows:
                vote_total[row.user_id] += 1
                if row.vote_type == row.majority_vote:
                    vote_correct[row.user_id] += 1

            # Adım 3: En aktif kategori
            category_rows = await conn.execute(text("""
                SELECT
                    c.user_id,
                    t.category,
                    COUNT(c.id) AS cnt
                FROM forum_comments c
                JOIN forum_threads t ON c.thread_id = t.id
                WHERE t.category IS NOT NULL
                GROUP BY c.user_id, t.category
            """))

            user_category_counts: dict = defaultdict(lambda: defaultdict(int))
            for row in category_rows:
                user_category_counts[row.user_id][row.category] += row.cnt

            user_top_category: dict = {}
            for uid, cat_counts in user_category_counts.items():
                user_top_category[uid] = max(cat_counts, key=cat_counts.get)

        # ── Python hesaplama fazı: DB bağlantısı yok ─────────────────────────
        update_values = []
        for user_id, sig in signals.items():
            helpful_total = sig["helpful_total"]
            comment_count = sig["comment_count"]
            thread_count  = sig["thread_count"]

            total_valid = vote_total.get(user_id, 0)
            vote_accuracy = vote_correct.get(user_id, 0) / total_valid if total_valid > 0 else 0.5

            raw = (
                helpful_total * 0.40
                + comment_count * 0.20
                + thread_count  * 0.15
                + vote_accuracy * 100 * 0.25
            )
            score    = min(max(raw, 0.0), 100.0)
            tier     = _score_to_tier(score)
            category = user_top_category.get(user_id)

            update_values.append({
                "uid":      user_id,
                "score":    score,
                "tier":     tier,
                "category": category,
            })

        # ── Yazma fazı: kısa transaction, yalnızca UPDATE'ler ────────────────
        async with engine.begin() as conn:
            if update_values:
                await conn.execute(
                    text("""
                        UPDATE users
                        SET
                            forum_trust_score    = data.score,
                            forum_trust_tier     = data.tier,
                            forum_trust_category = data.category
                        FROM (
                            SELECT
                                UNNEST(:uids::uuid[])    AS id,
                                UNNEST(:scores::float[]) AS score,
                                UNNEST(:tiers::text[])   AS tier,
                                UNNEST(:cats::text[])    AS category
                        ) AS data
                        WHERE users.id = data.id
                    """),
                    {
                        "uids":   [str(v["uid"])   for v in update_values],
                        "scores": [v["score"]      for v in update_values],
                        "tiers":  [v["tier"]       for v in update_values],
                        "cats":   [v["category"]   for v in update_values],
                    },
                )

            updated_count = len(update_values)
            logger.info("Trust skorlari guncellendi: %d kullanici", updated_count)

            # is_highlighted güncelleme — users UPDATE commit'inden sonra çalışır
            result = await conn.execute(text("""
                UPDATE forum_comments c
                SET is_highlighted = (
                    u.forum_trust_tier IN ('analist', 'dedektif')
                    AND c.helpful_count >= 3
                )
                FROM users u
                WHERE c.user_id = u.id
                RETURNING c.id
            """))
            highlighted_count = len(result.fetchall())
            logger.info("is_highlighted guncellendi: %d yorum", highlighted_count)

    finally:
        await engine.dispose()

    return {
        "updated_users":        updated_count,
        "highlighted_comments": highlighted_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Celery Task
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(name="recalculate_trust_scores")
def recalculate_trust_scores() -> dict:
    """
    Tüm kullanıcıların forum trust skorunu yeniden hesaplar.
    Nightly 03:30'da çalışır (beat zamanlaması Task 4'te eklenir).
    """
    logger.info("Trust skoru yeniden hesaplaması basladi...")
    result = asyncio.run(_recalculate())
    logger.info(
        "Trust hesaplamasi tamamlandi — %d kullanici, %d yorum guncellendi.",
        result["updated_users"],
        result["highlighted_comments"],
    )
    return result
