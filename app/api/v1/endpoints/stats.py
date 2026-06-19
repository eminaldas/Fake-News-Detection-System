from datetime import datetime, timezone, timedelta

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import AnalysisResult, Article, User

router = APIRouter()
logger = logging.getLogger(__name__)

_CACHE: dict = {}
_CACHE_TTL = 300  # 5 dakika


def _cache_get():
    entry = _CACHE.get("platform_stats")
    if entry and (datetime.now(timezone.utc).timestamp() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(data: dict):
    _CACHE["platform_stats"] = {"data": data, "ts": datetime.now(timezone.utc).timestamp()}


@router.get("/platform")
async def platform_stats(db: AsyncSession = Depends(get_db)):
    cached = _cache_get()
    if cached:
        return cached

    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=6)

        today_rows = (await db.execute(
            select(
                AnalysisResult.status,
                func.count().label("cnt"),
            )
            .join(Article, Article.id == AnalysisResult.article_id)
            .where(AnalysisResult.created_at >= today_start)
            .where(Article.metadata_info.op("?")("task_id"))
            .group_by(AnalysisResult.status)
        )).all()

        today_count = sum(r.cnt for r in today_rows)
        fake_count  = sum(r.cnt for r in today_rows if r.status == "FAKE")
        auth_count  = sum(r.cnt for r in today_rows if r.status == "AUTHENTIC")

        active_users = (await db.execute(
            select(func.count(User.id)).where(
                User.last_login_at >= today_start,
                User.is_active == True,
            )
        )).scalar_one()

        heatmap_rows = (await db.execute(
            select(
                cast(AnalysisResult.created_at, Date).label("day"),
                func.count().label("total"),
                func.sum(case((AnalysisResult.status == "FAKE", 1), else_=0)).label("fake_cnt"),
            )
            .join(Article, Article.id == AnalysisResult.article_id)
            .where(AnalysisResult.created_at >= week_start)
            .where(Article.metadata_info.op("?")("task_id"))
            .group_by(cast(AnalysisResult.created_at, Date))
            .order_by(cast(AnalysisResult.created_at, Date))
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
    except Exception as exc:
        logger.exception("platform_stats hatası: %s", exc)
        raise HTTPException(status_code=503, detail="İstatistikler şu an kullanılamıyor.")
