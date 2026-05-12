from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import Article, AnalysisResult, User

router = APIRouter()

_CACHE: dict = {}
_CACHE_TTL = 300  # 5 dakika


def _cache_key() -> str:
    return "platform_stats"


def _cache_get():
    entry = _CACHE.get(_cache_key())
    if entry and (datetime.now(timezone.utc).timestamp() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(data: dict):
    _CACHE[_cache_key()] = {"data": data, "ts": datetime.now(timezone.utc).timestamp()}


@router.get("/platform")
async def platform_stats(db: AsyncSession = Depends(get_db)):
    cached = _cache_get()
    if cached:
        return cached

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    # Bugünkü istatistikler
    today_rows = (await db.execute(
        select(
            AnalysisResult.status,
            func.count().label("cnt"),
        )
        .join(Article, AnalysisResult.article_id == Article.id)
        .where(Article.created_at >= today_start)
        .group_by(AnalysisResult.status)
    )).all()

    today_count = sum(r.cnt for r in today_rows)
    fake_count  = sum(r.cnt for r in today_rows if r.status == "FAKE")
    auth_count  = sum(r.cnt for r in today_rows if r.status == "AUTHENTIC")

    # Aktif kullanıcılar (bugün login)
    active_users = (await db.execute(
        select(func.count()).where(User.last_login_at >= today_start)
    )).scalar_one()

    # 7 günlük heatmap
    heatmap_rows = (await db.execute(
        select(
            cast(Article.created_at, Date).label("day"),
            func.count().label("total"),
            func.sum(case((AnalysisResult.status == "FAKE", 1), else_=0)).label("fake_cnt"),
        )
        .join(Article, AnalysisResult.article_id == Article.id)
        .where(Article.created_at >= week_start)
        .group_by(cast(Article.created_at, Date))
        .order_by(cast(Article.created_at, Date))
    )).all()

    heatmap = []
    for r in heatmap_rows:
        total = int(r.total)
        fake  = int(r.fake_cnt or 0)
        heatmap.append({
            "date":     r.day.isoformat(),
            "total":    total,
            "fake_pct": round((fake / total * 100), 1) if total else 0.0,
        })

    result = {
        "today_count":     today_count,
        "fake_count":      fake_count,
        "authentic_count": auth_count,
        "active_users":    int(active_users),
        "heatmap":         heatmap,
    }
    _cache_set(result)
    return result
