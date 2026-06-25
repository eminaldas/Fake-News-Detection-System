"""
Dönem-sonu liderlik ödülleri — haftalık (Pzt) / aylık (ay başı) çalışır.
Biten dönemin XP liderlerini hesaplar, min-5 kuralını uygular ve kazananlara
'leaderboard_reward' tipinde Notification kaydı açar (idempotent).
"""
import asyncio
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import Notification
from workers.tasks import celery_app

logger = logging.getLogger(__name__)

TR = timezone(timedelta(hours=3))            # Europe/Istanbul (DST yok)
REWARD_TOP = {"weekly": 3, "monthly": 5}
MIN_PARTICIPANTS = 5


def _period_window(period_type: str, now_utc: datetime):
    """Biten dönemin [start_utc, end_utc) penceresi + period_end (TR günü)."""
    now_tr = now_utc.astimezone(TR)
    if period_type == "weekly":
        # Bu haftanın TR Pazartesi 00:00'ı = biten haftanın sonu
        this_monday = (now_tr - timedelta(days=now_tr.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end_tr   = this_monday
        start_tr = end_tr - timedelta(days=7)
    elif period_type == "monthly":
        first_this = now_tr.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_tr   = first_this
        prev_last = first_this - timedelta(days=1)
        start_tr = prev_last.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        raise ValueError(f"bilinmeyen period_type: {period_type}")
    start_utc = start_tr.astimezone(timezone.utc)
    end_utc   = end_tr.astimezone(timezone.utc)
    period_end = (end_tr - timedelta(days=1)).date()
    return start_utc, end_utc, period_end


async def _run_rewards(period_type: str) -> dict:
    top_n = REWARD_TOP[period_type]
    now   = datetime.now(timezone.utc)
    start_utc, end_utc, period_end = _period_window(period_type, now)

    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        # İdempotent: bu dönem zaten işlendiyse çık
        exists = (await db.execute(text(
            "SELECT 1 FROM notifications "
            "WHERE type = 'leaderboard_reward' "
            "AND payload->>'period_type' = :pt AND payload->>'period_end' = :pe LIMIT 1"
        ), {"pt": period_type, "pe": period_end.isoformat()})).first()
        if exists:
            logger.info("leaderboard_reward zaten işlenmiş: %s %s", period_type, period_end)
            return {"period_type": period_type, "period_end": str(period_end), "participants": 0, "awarded": 0, "skipped": "already_done"}

        rows = (await db.execute(text("""
            SELECT u.id AS uid, COALESCE(SUM(e.xp_amount), 0) AS value
            FROM users u
            JOIN user_xp_events e ON e.user_id = u.id
                AND e.created_at >= :start AND e.created_at < :end
            WHERE u.role::text != 'admin'
            GROUP BY u.id
            HAVING COALESCE(SUM(e.xp_amount), 0) > 0
            ORDER BY value DESC
            LIMIT 50
        """), {"start": start_utc, "end": end_utc})).mappings().all()

        participants = len(rows)
        if participants < MIN_PARTICIPANTS:
            logger.info("min-5 kuralı: %s katılımcı < %s, atlanıyor", participants, MIN_PARTICIPANTS)
            return {"period_type": period_type, "period_end": str(period_end), "participants": participants, "awarded": 0, "skipped": "min_participants"}

        awarded = 0
        for rank, row in enumerate(rows[:top_n], start=1):
            db.add(Notification(
                user_id=row["uid"],
                type="leaderboard_reward",
                payload={
                    "period_type": period_type,
                    "period_end":  period_end.isoformat(),
                    "rank":        rank,
                    "value":       int(row["value"]),
                    "metric":      "xp",
                },
            ))
            awarded += 1
        await db.commit()
        logger.info("leaderboard ödül: %s %s → %s kazanan / %s katılımcı", period_type, period_end, awarded, participants)
        return {"period_type": period_type, "period_end": str(period_end), "participants": participants, "awarded": awarded, "skipped": None}


@celery_app.task(name="workers.leaderboard_task.weekly_leaderboard_rewards")
def weekly_leaderboard_rewards() -> dict:
    return asyncio.run(_run_rewards("weekly"))


@celery_app.task(name="workers.leaderboard_task.monthly_leaderboard_rewards")
def monthly_leaderboard_rewards() -> dict:
    return asyncio.run(_run_rewards("monthly"))
