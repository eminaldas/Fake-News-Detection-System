"""
app/api/v1/endpoints/gamification.py
GET  /gamification/me/stats
GET  /gamification/users/{user_id}/stats
GET  /gamification/me/badges
GET  /gamification/badges
POST /gamification/me/showcase
GET  /gamification/users/{user_id}/showcase
GET  /gamification/leaderboard
"""
import json
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy import func, select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.gamification import UserBadge, UserXPEvent, XPActionType
from app.models.models import User
from app.services.xp_service import xp_for_level, _collect_stats
from workers.badge_definitions import BADGE_BY_KEY, BADGE_DEFS, BADGE_PROGRESS_HINTS

router = APIRouter()

ACTION_LABELS = {
    "analysis_created":  "Analiz Oluşturuldu",
    "thread_created":    "Başlık Açıldı",
    "comment_created":   "Yorum Yapıldı",
    "vote_cast":         "Oy Kullanıldı",
    "evidence_added":    "Kanıt Eklendi",
    "helpful_received":  "Faydalı Bulundu",
    "followed":          "Yeni Takipçi",
    "daily_login":       "Günlük Giriş",
}


def _stats_dict(user: User) -> dict:
    total_xp  = user.total_xp or 0
    level     = user.level or 1
    cur_floor = xp_for_level(level)
    nxt_floor = xp_for_level(level + 1)
    span      = max(nxt_floor - cur_floor, 1)
    pct       = round((total_xp - cur_floor) / span * 100, 1)
    return {
        "total_xp":         total_xp,
        "level":            level,
        "xp_to_next_level": max(0, nxt_floor - total_xp),
        "xp_progress_pct":  min(pct, 100.0),
        "tier":             user.forum_trust_tier,
        "trust_score":      round(user.forum_trust_score, 2),
    }


def _badge_detail(b, earned_at=None, stats: dict = None) -> dict:
    hint = BADGE_PROGRESS_HINTS.get(b.key)
    progress = threshold = None
    if hint and stats:
        metric, thr = hint
        progress  = min(stats.get(metric, 0), thr)
        threshold = thr
    return {
        "key": b.key, "name": b.name, "description": b.description,
        "category": b.category, "icon": b.icon, "color": b.color,
        "earned_at": earned_at.isoformat() if earned_at else None,
        "progress": progress, "threshold": threshold,
    }


@router.get("/me/stats")
async def my_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stats = _stats_dict(current_user)
    events = (await db.execute(
        select(UserXPEvent)
        .where(UserXPEvent.user_id == current_user.id)
        .order_by(desc(UserXPEvent.created_at))
        .limit(10)
    )).scalars().all()
    stats["recent_events"] = [
        {"action": ACTION_LABELS.get(e.action_type.value, e.action_type.value),
         "xp_amount": e.xp_amount,
         "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in events
    ]
    return stats


@router.get("/users/{user_id}/stats")
async def user_stats(user_id: UUID, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return _stats_dict(user)


@router.get("/badges")
async def badge_catalog():
    return [{"key": b.key, "name": b.name, "description": b.description,
             "category": b.category, "icon": b.icon, "color": b.color}
            for b in BADGE_DEFS]


@router.get("/me/badges")
async def my_badges(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    earned_rows = (await db.execute(
        select(UserBadge).where(UserBadge.user_id == current_user.id)
    )).scalars().all()
    earned_map = {r.badge_key: r for r in earned_rows}

    stats = await _collect_stats(db, current_user.id)
    stats["level"] = current_user.level or 1

    earned, locked = [], []
    for b in BADGE_DEFS:
        if b.key in earned_map:
            row = earned_map[b.key]
            d = _badge_detail(b, row.earned_at, stats)
            d["is_showcased"]   = row.is_showcased
            d["showcase_order"] = row.showcase_order
            earned.append(d)
        elif b.key != "early_bird":
            locked.append(_badge_detail(b, None, stats))
    return {"earned": earned, "locked": locked}


@router.post("/me/showcase")
async def update_showcase(
    badge_keys:   List[str],
    current_user: User         = Depends(get_current_user),
    db: AsyncSession           = Depends(get_db),
):
    if len(badge_keys) > 3:
        raise HTTPException(400, "En fazla 3 rozet seçilebilir")
    earned = (await db.execute(
        select(UserBadge).where(UserBadge.user_id == current_user.id)
    )).scalars().all()
    earned_map = {r.badge_key: r for r in earned}
    for key in badge_keys:
        if key not in earned_map:
            raise HTTPException(400, f"'{key}' rozeti henüz kazanılmadı")
    for row in earned:
        row.is_showcased   = False
        row.showcase_order = None
    for order, key in enumerate(badge_keys):
        earned_map[key].is_showcased   = True
        earned_map[key].showcase_order = order
    await db.commit()
    return {"showcased": badge_keys}


@router.get("/users/{user_id}/showcase")
async def user_showcase(user_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == user_id, UserBadge.is_showcased == True)
        .order_by(UserBadge.showcase_order)
    )).scalars().all()
    return [
        {"key": b.badge_key, "name": BADGE_BY_KEY[b.badge_key].name if b.badge_key in BADGE_BY_KEY else b.badge_key,
         "icon": BADGE_BY_KEY[b.badge_key].icon if b.badge_key in BADGE_BY_KEY else "Award",
         "color": BADGE_BY_KEY[b.badge_key].color if b.badge_key in BADGE_BY_KEY else "gray",
         "showcase_order": b.showcase_order}
        for b in rows if b.badge_key in BADGE_BY_KEY
    ]


@router.get("/leaderboard")
async def leaderboard(
    period: str      = Query("alltime", pattern="^(weekly|monthly|alltime)$"),
    type:   str      = Query("xp",      pattern="^(xp|analyses|threads|evidence)$"),
    db:     AsyncSession = Depends(get_db),
    redis:  Redis        = Depends(get_redis),
):
    cache_key = f"leaderboard:{period}:{type}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    now   = datetime.now(timezone.utc)
    since = None
    if period == "weekly":
        since = now - timedelta(days=7)
    elif period == "monthly":
        since = now - timedelta(days=30)

    if type == "xp" and not since:
        rows = await db.execute(text(
            "SELECT id, username, avatar_url, level, total_xp AS value "
            "FROM users ORDER BY total_xp DESC LIMIT 50"
        ))
    elif type == "xp":
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level,
                   COALESCE(SUM(e.xp_amount), 0) AS value
            FROM users u
            LEFT JOIN user_xp_events e ON e.user_id = u.id AND e.created_at >= :since
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})
    elif type == "analyses":
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level, COUNT(ar.id) AS value
            FROM users u
            LEFT JOIN analysis_requests ar ON ar.user_id = u.id
                AND (:since IS NULL OR ar.created_at >= :since)
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})
    elif type == "threads":
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level, COUNT(t.id) AS value
            FROM users u
            LEFT JOIN forum_threads t ON t.user_id = u.id
                AND (:since IS NULL OR t.created_at >= :since)
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})
    else:  # evidence
        rows = await db.execute(text("""
            SELECT u.id, u.username, u.avatar_url, u.level, COUNT(e.id) AS value
            FROM users u
            LEFT JOIN user_xp_events e ON e.user_id = u.id
                AND e.action_type = 'evidence_added'
                AND (:since IS NULL OR e.created_at >= :since)
            GROUP BY u.id, u.username, u.avatar_url, u.level
            ORDER BY value DESC LIMIT 50
        """), {"since": since})

    entries = []
    for rank, row in enumerate(rows.mappings().all(), start=1):
        showcase = (await db.execute(
            select(UserBadge)
            .where(UserBadge.user_id == row["id"], UserBadge.is_showcased == True)
            .order_by(UserBadge.showcase_order).limit(3)
        )).scalars().all()
        entries.append({
            "rank": rank, "user_id": str(row["id"]),
            "username": row["username"], "avatar_url": row["avatar_url"],
            "level": row["level"] or 1, "value": int(row["value"]),
            "showcase_badges": [
                {"key": b.badge_key,
                 "name":  BADGE_BY_KEY[b.badge_key].name  if b.badge_key in BADGE_BY_KEY else b.badge_key,
                 "icon":  BADGE_BY_KEY[b.badge_key].icon  if b.badge_key in BADGE_BY_KEY else "Award",
                 "color": BADGE_BY_KEY[b.badge_key].color if b.badge_key in BADGE_BY_KEY else "gray"}
                for b in showcase
            ],
        })

    result = {"period": period, "type": type, "entries": entries}
    await redis.setex(cache_key, 300, json.dumps(result, default=str))
    return result
