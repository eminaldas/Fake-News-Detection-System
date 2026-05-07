"""
app/services/xp_service.py
==========================
award_xp(db, redis, user_id, action_type, ref_id=None)
    -> {"xp_gained": int, "new_badges": [{"key", "name", "description"}]}
"""
from datetime import date
from typing import Optional
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import UserBadge, UserXPEvent, XPActionType
from app.models.models import AnalysisRequest, ForumComment, ForumThread, User
from workers.badge_definitions import BADGE_BY_KEY, BADGE_DEFS


XP_TABLE: dict[XPActionType, int] = {
    XPActionType.analysis_created:  8,
    XPActionType.thread_created:    15,
    XPActionType.comment_created:   5,
    XPActionType.vote_cast:         2,
    XPActionType.evidence_added:    25,
    XPActionType.helpful_received:  10,
    XPActionType.followed:          5,
    XPActionType.daily_login:       3,
}

DAILY_LIMITS: dict[XPActionType, int] = {
    XPActionType.analysis_created: 10,
    XPActionType.thread_created:   5,
    XPActionType.comment_created:  15,
    XPActionType.vote_cast:        20,
    XPActionType.evidence_added:   3,
}


# ── Seviye hesaplama ─────────────────────────────────────────────────────────

def xp_for_level(level: int) -> int:
    """level seviyesine ulaşmak için gereken kümülatif XP."""
    if level <= 1:
        return 0
    if level <= 10:
        return sum(100 * i for i in range(1, level))
    if level <= 20:
        return 4500 + (level - 10) * 500
    if level <= 30:
        return 9500 + (level - 20) * 1000
    return 19500 + (level - 30) * 1500


def level_from_xp(total_xp: int) -> int:
    lvl = 1
    while True:
        if total_xp < xp_for_level(lvl + 1):
            return lvl
        lvl += 1
        if lvl >= 200:
            return 200


# ── Badge koşul metriklerini topla ───────────────────────────────────────────

async def _collect_stats(db: AsyncSession, user_id: UUID) -> dict:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()

    analysis_count = (await db.execute(
        select(func.count()).where(AnalysisRequest.user_id == user_id)
    )).scalar_one()

    thread_count = (await db.execute(
        select(func.count()).where(ForumThread.user_id == user_id)
    )).scalar_one()

    helpful_total = (await db.execute(
        select(func.coalesce(func.sum(ForumComment.helpful_count), 0))
        .where(ForumComment.user_id == user_id)
    )).scalar_one()

    evidence_count = (await db.execute(
        select(func.count()).where(
            UserXPEvent.user_id == user_id,
            UserXPEvent.action_type == XPActionType.evidence_added,
        )
    )).scalar_one()

    # Debunker: FAKE sonuçlu haber thread'inde kanıt yorumu (5 kez)
    debunker_row = await db.execute(text("""
        SELECT COUNT(DISTINCT e.id)
        FROM user_xp_events e
        JOIN forum_comments fc ON fc.id::text = e.ref_id
        JOIN forum_threads  ft ON ft.id = fc.thread_id
        JOIN articles        a ON a.id  = ft.article_id
        JOIN analysis_results ar ON ar.article_id = a.id
        WHERE e.user_id     = :uid
          AND e.action_type = 'evidence_added'
          AND ar.status     = 'FAKE'
    """), {"uid": str(user_id)})
    debunker_count = debunker_row.scalar_one() or 0

    # Kategori sayıları
    cat_rows = await db.execute(
        select(ForumThread.category, func.count().label("cnt"))
        .where(ForumThread.user_id == user_id)
        .group_by(ForumThread.category)
    )
    cat_map: dict[str, int] = {r.category: r.cnt for r in cat_rows.all()}

    CATEGORIES = ["haberler", "teknoloji", "kültür", "spor", "eğlence", "bilim", "ekonomi", "genel"]
    cat_all_active = sum(1 for c in CATEGORIES if cat_map.get(c, 0) >= 1)

    return {
        "analysis_count":  analysis_count,
        "thread_count":    thread_count,
        "helpful_total":   int(helpful_total),
        "evidence_count":  evidence_count,
        "follower_count":  user.follower_count,
        "current_streak":  user.current_streak,
        "level":           user.level or 1,
        "debunker_count":  debunker_count,
        "cat_haberler":    cat_map.get("haberler",   0),
        "cat_teknoloji":   cat_map.get("teknoloji",  0),
        "cat_kultur":      cat_map.get("kültür",     0),
        "cat_spor":        cat_map.get("spor",       0),
        "cat_eglence":     cat_map.get("eğlence",    0),
        "cat_bilim":       cat_map.get("bilim",      0),
        "cat_ekonomi":     cat_map.get("ekonomi",    0),
        "cat_genel":       cat_map.get("genel",      0),
        "cat_all":         cat_all_active,
    }


_BADGE_CONDITIONS: dict[str, callable] = {
    "level_1":        lambda s: True,
    "level_10":       lambda s: s["level"] >= 10,
    "level_20":       lambda s: s["level"] >= 20,
    "level_30":       lambda s: s["level"] >= 30,
    "level_40":       lambda s: s["level"] >= 40,
    "level_50":       lambda s: s["level"] >= 50,
    "first_analysis": lambda s: s["analysis_count"] >= 1,
    "analyst_100":    lambda s: s["analysis_count"] >= 100,
    "first_thread":   lambda s: s["thread_count"] >= 1,
    "prolific_50":    lambda s: s["thread_count"] >= 50,
    "evidence_10":    lambda s: s["evidence_count"] >= 10,
    "evidence_50":    lambda s: s["evidence_count"] >= 50,
    "social_10":      lambda s: s["follower_count"] >= 10,
    "social_100":     lambda s: s["follower_count"] >= 100,
    "helpful_50":     lambda s: s["helpful_total"] >= 50,
    "streak_7":       lambda s: s["current_streak"] >= 7,
    "streak_30":      lambda s: s["current_streak"] >= 30,
    "debunker":       lambda s: s["debunker_count"] >= 5,
    "cat_haberler":   lambda s: s["cat_haberler"]  >= 20,
    "cat_teknoloji":  lambda s: s["cat_teknoloji"] >= 20,
    "cat_kultur":     lambda s: s["cat_kultur"]    >= 20,
    "cat_spor":       lambda s: s["cat_spor"]      >= 20,
    "cat_eglence":    lambda s: s["cat_eglence"]   >= 20,
    "cat_bilim":      lambda s: s["cat_bilim"]     >= 20,
    "cat_ekonomi":    lambda s: s["cat_ekonomi"]   >= 20,
    "cat_genel":      lambda s: s["cat_genel"]     >= 20,
    "cat_all":        lambda s: s["cat_all"]       >= 8,
    # early_bird migration ile atanır, burada kontrol edilmez
}


async def check_and_unlock_badges(db: AsyncSession, user_id: UUID) -> list[str]:
    earned_keys = {
        r[0] for r in (await db.execute(
            select(UserBadge.badge_key).where(UserBadge.user_id == user_id)
        )).all()
    }
    candidates = set(_BADGE_CONDITIONS.keys()) - earned_keys
    if not candidates:
        return []

    stats = await _collect_stats(db, user_id)
    new_keys: list[str] = []
    for key in candidates:
        if _BADGE_CONDITIONS[key](stats):
            db.add(UserBadge(user_id=user_id, badge_key=key))
            new_keys.append(key)

    if new_keys:
        await db.flush()
    return new_keys


# ── Ana servis fonksiyonu ────────────────────────────────────────────────────

async def award_xp(
    db:          AsyncSession,
    redis:       Redis,
    user_id:     UUID,
    action_type: XPActionType,
    ref_id:      Optional[str] = None,
) -> dict:
    xp_amount = XP_TABLE.get(action_type, 0)
    if xp_amount == 0:
        return {"xp_gained": 0, "new_badges": []}

    # Günlük limit kontrolü
    daily_limit = DAILY_LIMITS.get(action_type)
    if daily_limit is not None:
        today = date.today().isoformat()
        redis_key = f"xp:daily:{user_id}:{action_type.value}:{today}"
        count = await redis.incr(redis_key)
        if count == 1:
            await redis.expire(redis_key, 86400)
        if count > daily_limit:
            return {"xp_gained": 0, "new_badges": []}

    # Günlük giriş — streak güncelleme
    if action_type == XPActionType.daily_login:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
        today_date = date.today()
        if user.last_login_date == today_date:
            return {"xp_gained": 0, "new_badges": []}
        from datetime import timedelta
        yesterday = today_date - timedelta(days=1)
        user.current_streak = (user.current_streak + 1) if user.last_login_date == yesterday else 1
        user.last_login_date = today_date

    # XP event kaydet
    db.add(UserXPEvent(user_id=user_id, action_type=action_type, xp_amount=xp_amount, ref_id=ref_id))

    # total_xp güncelle (level nightly'de hesaplanır)
    user_row = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
    user_row.total_xp = (user_row.total_xp or 0) + xp_amount

    await db.flush()

    new_keys  = await check_and_unlock_badges(db, user_id)
    new_badges = [
        {"key": k, "name": BADGE_BY_KEY[k].name, "description": BADGE_BY_KEY[k].description}
        for k in new_keys if k in BADGE_BY_KEY
    ]
    return {"xp_gained": xp_amount, "new_badges": new_badges}
