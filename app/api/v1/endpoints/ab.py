"""
app/api/v1/endpoints/ab.py
===========================
A/B deney yönetim endpoint'leri — yalnızca admin erişimi.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin, get_db
from app.models.models import AbExperiment, User
from app.core.logging import get_logger

router = APIRouter()
log    = get_logger(__name__)


@router.get("/experiments")
async def list_experiments(
    admin: User = Depends(require_admin),
    db:    AsyncSession = Depends(get_db),
):
    """Tüm deneyleri + varyant başına tıklama özetini döner."""
    from sqlalchemy import select
    experiments = (await db.execute(
        select(AbExperiment).order_by(AbExperiment.created_at.desc())
    )).scalars().all()

    result = []
    for exp in experiments:
        rows = (await db.execute(text("""
            SELECT
                (details->>'ab_variant')::int AS variant,
                COUNT(*) AS clicks
            FROM content_interactions
            WHERE details->>'ab_experiment_id' = :eid
              AND interaction_type = 'click'
            GROUP BY variant
        """), {"eid": str(exp.id)})).all()

        clicks_by_variant = {r.variant: r.clicks for r in rows if r.variant is not None}
        min_clicks_reached = all(
            clicks_by_variant.get(v, 0) >= exp.min_clicks for v in range(3)
        )

        result.append({
            "id":                  str(exp.id),
            "name":                exp.name,
            "status":              exp.status,
            "min_clicks":          exp.min_clicks,
            "winner_variant":      exp.winner_variant,
            "created_at":          exp.created_at.isoformat(),
            "concluded_at":        exp.concluded_at.isoformat() if exp.concluded_at else None,
            "clicks_by_variant":   clicks_by_variant,
            "min_clicks_reached":  min_clicks_reached,
        })

    return {"experiments": result}


@router.get("/experiments/{experiment_id}/results")
async def get_experiment_results(
    experiment_id: UUID,
    admin: User = Depends(require_admin),
    db:    AsyncSession = Depends(get_db),
):
    """Varyant bazlı CTR ve pozitif feedback oranı."""
    exp = await db.get(AbExperiment, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Deney bulunamadı")

    rows = (await db.execute(text("""
        SELECT
            (details->>'ab_variant')::int                                          AS variant,
            COUNT(*) FILTER (WHERE interaction_type = 'impression')                AS impressions,
            COUNT(*) FILTER (WHERE interaction_type = 'click')                     AS clicks,
            COUNT(*) FILTER (WHERE interaction_type = 'feedback_positive')         AS positive_feedback
        FROM content_interactions
        WHERE details->>'ab_experiment_id' = :eid
          AND details->>'ab_variant' IS NOT NULL
        GROUP BY variant
        ORDER BY variant
    """), {"eid": str(experiment_id)})).all()

    VARIANT_NAMES = {0: "Kontrol", 1: "Recency-Heavy", 2: "Category-Heavy"}

    variants = []
    for r in rows:
        ctr     = round(r.clicks / r.impressions * 100, 1) if r.impressions else 0.0
        fb_rate = round(r.positive_feedback / r.clicks * 100, 1) if r.clicks else 0.0
        variants.append({
            "variant":           r.variant,
            "name":              VARIANT_NAMES.get(r.variant, f"Varyant {r.variant}"),
            "impressions":       r.impressions,
            "clicks":            r.clicks,
            "positive_feedback": r.positive_feedback,
            "ctr":               ctr,
            "feedback_rate":     fb_rate,
            "ready":             r.clicks >= exp.min_clicks,
        })

    return {
        "experiment_id":   str(experiment_id),
        "experiment_name": exp.name,
        "status":          exp.status,
        "winner_variant":  exp.winner_variant,
        "min_clicks":      exp.min_clicks,
        "variants":        variants,
    }


@router.post("/experiments/{experiment_id}/conclude")
async def conclude_experiment(
    experiment_id: UUID,
    body:  dict,
    admin: User = Depends(require_admin),
    db:    AsyncSession = Depends(get_db),
):
    """
    Deneyi sonuçlandır, kazananı kaydet.
    Body: {"winner_variant": 0 | 1 | 2}
    """
    exp = await db.get(AbExperiment, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Deney bulunamadı")
    if exp.status == "concluded":
        raise HTTPException(status_code=400, detail="Deney zaten sonuçlandırıldı")

    winner = body.get("winner_variant")
    if winner not in (0, 1, 2):
        raise HTTPException(status_code=422, detail="winner_variant 0, 1 veya 2 olmalı")

    exp.winner_variant = winner
    exp.status         = "concluded"
    exp.concluded_at   = datetime.now(timezone.utc)
    await db.commit()

    log.info("ab_experiment_concluded id=%s winner=%s admin=%s", experiment_id, winner, admin.id)
    return {"ok": True, "winner_variant": winner}
