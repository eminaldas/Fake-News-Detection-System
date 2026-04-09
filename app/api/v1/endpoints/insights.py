"""
app/api/v1/endpoints/insights.py
====================================
Kullanıcıya özel risk raporu ve kaynak güven skoru.
Veriler hiçbir zaman dışarıya açılmaz — yalnızca sahip kullanıcıya döner.
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import ContentInteraction, User

router = APIRouter()


@router.get("/risk-report")
async def get_risk_report(
    user: User         = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Son 7 günde karşılaşılan sahte haber istatistikleri."""
    since = datetime.now(timezone.utc) - timedelta(days=7)

    rows = (await db.execute(
        select(
            ContentInteraction.category,
            func.count().label("total"),
            func.avg(ContentInteraction.nlp_score_at_time).label("avg_nlp"),
        )
        .where(
            ContentInteraction.user_id == user.id,
            ContentInteraction.interaction_type == "click",
            ContentInteraction.created_at >= since,
            ContentInteraction.nlp_score_at_time.isnot(None),
        )
        .group_by(ContentInteraction.category)
    )).all()

    total_clicks = sum(r.total for r in rows)
    high_risk_count = sum(r.total for r in rows if (r.avg_nlp or 0) >= 0.5)

    high_risk_cats = [
        {
            "category": r.category or "Diğer",
            "clicks":   r.total,
            "avg_risk": round(r.avg_nlp or 0, 2),
        }
        for r in sorted(rows, key=lambda r: r.avg_nlp or 0, reverse=True)
    ]

    return {
        "period_days":     7,
        "total_clicks":    total_clicks,
        "high_risk_count": high_risk_count,
        "categories":      high_risk_cats,
    }


@router.get("/source-trust")
async def get_source_trust(
    user: User         = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Kullanıcının tıkladığı kaynakların kişisel güven skoru."""
    since = datetime.now(timezone.utc) - timedelta(days=30)

    rows = (await db.execute(
        select(
            ContentInteraction.source_domain,
            func.count().label("total"),
            func.avg(ContentInteraction.nlp_score_at_time).label("avg_nlp"),
            func.sum(
                case((ContentInteraction.nlp_score_at_time >= 0.5, 1), else_=0)
            ).label("high_risk_count"),
        )
        .where(
            ContentInteraction.user_id == user.id,
            ContentInteraction.interaction_type == "click",
            ContentInteraction.created_at >= since,
            ContentInteraction.source_domain.isnot(None),
            ContentInteraction.nlp_score_at_time.isnot(None),
        )
        .group_by(ContentInteraction.source_domain)
        .having(func.count() >= 2)
        .order_by(func.avg(ContentInteraction.nlp_score_at_time).desc())
    )).all()

    return {
        "period_days": 30,
        "sources": [
            {
                "domain":          r.source_domain,
                "total_clicks":    r.total,
                "avg_risk":        round(r.avg_nlp or 0, 2),
                "high_risk_count": int(r.high_risk_count or 0),
                "trust_level":     "düşük" if (r.avg_nlp or 0) >= 0.5 else
                                   "orta"  if (r.avg_nlp or 0) >= 0.25 else "yüksek",
            }
            for r in rows
        ],
    }
