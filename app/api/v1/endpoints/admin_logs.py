"""
app/api/v1/endpoints/admin_logs.py
====================================
Admin dashboard için audit log ve analitik API endpoint'leri.
Tüm endpoint'ler require_admin gerektirir.
"""
import json
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from redis.asyncio import Redis
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.audit import ALERTS_KEY
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.models import AuditLog, AnalysisRequest, AnalysisResult, Article, User, ModelFeedback, ModelTrainingRun, UserReport, ReportStatus
from app.schemas.schemas import AdminStatsOverviewResponse, FeedbackStatsResponse, TrainingRunResponse
from app.core.config import settings

router = APIRouter()


def _since(hours: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)



@router.get("/stats/overview", response_model=AdminStatsOverviewResponse)
async def get_stats_overview(
    _admin: User         = Depends(require_admin),
    db: AsyncSession     = Depends(get_db),
    redis: Redis         = Depends(get_redis),
):
    """Dashboard ana metrikleri: 24s analiz, sahtelik oranı, bekleyen ihbar, kritik uyarı."""
    since_24h = _since(24)

    total_analyses = (await db.execute(
        select(func.count()).select_from(AnalysisRequest)
        .where(AnalysisRequest.created_at >= since_24h)
    )).scalar_one()

    fake_count = (await db.execute(
        select(func.count()).select_from(AnalysisResult)
        .join(Article, Article.id == AnalysisResult.article_id)
        .where(
            AnalysisResult.status == "FAKE",
            Article.created_at >= since_24h,
        )
    )).scalar_one()

    pending_reports = (await db.execute(
        select(func.count()).select_from(UserReport)
        .where(UserReport.status == ReportStatus.open)
    )).scalar_one()

    raw_alerts   = await redis.zrevrange(ALERTS_KEY, 0, -1, withscores=False)
    critical_alerts = len(raw_alerts)

    fake_rate = round(fake_count / total_analyses, 3) if total_analyses > 0 else 0.0

    return AdminStatsOverviewResponse(
        total_analyses_24h=total_analyses,
        fake_count_24h=fake_count,
        fake_rate_24h=fake_rate,
        pending_reports=pending_reports,
        critical_alerts=critical_alerts,
    )



@router.get("/logs/security")
async def get_security_logs(
    severity:   Optional[str] = Query(None, description="INFO | WARNING | CRITICAL"),
    hours:      int           = Query(24, ge=1, le=168),
    event_name: Optional[str] = Query(None),
    page:       int           = Query(1, ge=1),
    size:       int           = Query(50, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Son N saatin SECURITY event'lerini döner (sayfalı)."""
    filters = [
        AuditLog.event_type == "SECURITY",
        AuditLog.created_at >= _since(hours),
    ]
    if severity:
        filters.append(AuditLog.severity == severity.upper())
    if event_name:
        filters.append(AuditLog.event_name == event_name)

    cond = and_(*filters)
    total = (await db.execute(
        select(func.count()).select_from(AuditLog).where(cond)
    )).scalar_one()

    rows = (await db.execute(
        select(AuditLog, User.username, User.email)
        .outerjoin(User, User.id == AuditLog.user_id)
        .where(cond)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * size).limit(size)
    )).all()

    return {
        "total": total,
        "page":  page,
        "size":  size,
        "items": [
            {
                "id":         str(r.AuditLog.id),
                "event_name": r.AuditLog.event_name,
                "severity":   r.AuditLog.severity,
                "user_id":    str(r.AuditLog.user_id) if r.AuditLog.user_id else None,
                "username":   r.username,
                "email":      r.email,
                "ip_hash":    r.AuditLog.ip_hash,
                "path":       r.AuditLog.path,
                "details":    r.AuditLog.details,
                "created_at": r.AuditLog.created_at.isoformat(),
            }
            for r in rows
        ],
    }



@router.get("/logs/alerts")
async def get_alerts(
    _admin: User = Depends(require_admin),
    redis: Redis = Depends(get_redis),
):
    """Redis'teki aktif CRITICAL alert'leri döner (max 50, en yeni önce)."""
    raw_pairs = await redis.zrevrange(ALERTS_KEY, 0, 49, withscores=True)
    alerts = []
    for event_json, score in raw_pairs:
        try:
            alerts.append({**json.loads(event_json), "alert_ts": score})
        except json.JSONDecodeError:
            pass
    return {"alerts": alerts}



@router.get("/logs/analytics/daily")
async def get_daily_analytics(
    days: int = Query(30, ge=1, le=90),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Son N günün günlük analiz istatistiklerini döner."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    day_col = func.date_trunc("day", AnalysisRequest.created_at).label("day")

    rows = (await db.execute(
        select(
            day_col,
            func.count(AnalysisRequest.id).label("total"),
        )
        .where(AnalysisRequest.created_at >= since)
        .group_by(day_col)
        .order_by(day_col)
    )).all()

    return {
        "days": days,
        "data": [
            {
                "day":   r.day.strftime("%Y-%m-%d") if r.day else None,
                "total": r.total,
            }
            for r in rows
        ],
    }


@router.get("/logs/analytics/analysis-types")
async def get_analysis_type_distribution(
    days: int = Query(30, ge=1, le=90),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """text / url / image analiz tiplerinin dağılımı."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await db.execute(
        select(
            AnalysisRequest.analysis_type,
            func.count().label("count"),
        )
        .where(AnalysisRequest.created_at >= since)
        .group_by(AnalysisRequest.analysis_type)
        .order_by(func.count().desc())
    )).all()

    return {
        "days": days,
        "data": [{"type": r.analysis_type, "count": r.count} for r in rows],
    }


@router.get("/logs/analytics/top-users")
async def get_top_users(
    days: int = Query(7, ge=1, le=30),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """En çok analiz yapan kullanıcılar (anonim hariç)."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await db.execute(
        select(
            AnalysisRequest.user_id,
            User.username,
            func.count().label("count"),
        )
        .join(User, User.id == AnalysisRequest.user_id)
        .where(
            AnalysisRequest.created_at >= since,
            AnalysisRequest.user_id.isnot(None),
        )
        .group_by(AnalysisRequest.user_id, User.username)
        .order_by(func.count().desc())
        .limit(10)
    )).all()

    return {
        "days": days,
        "data": [{"user_id": str(r.user_id), "username": r.username, "count": r.count} for r in rows],
    }



@router.get("/logs/system/health")
async def get_system_health(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Son worker heartbeat + son 1 saatteki hata sayısı."""
    since_1h = _since(1)

    last_heartbeat = (await db.execute(
        select(AuditLog)
        .where(AuditLog.event_name == "worker.heartbeat")
        .order_by(AuditLog.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    error_count = (await db.execute(
        select(func.count()).select_from(AuditLog).where(
            AuditLog.event_name == "worker.error",
            AuditLog.created_at >= since_1h,
        )
    )).scalar_one()

    recent_critical = (await db.execute(
        select(func.count()).select_from(AuditLog).where(
            AuditLog.severity == "CRITICAL",
            AuditLog.created_at >= since_1h,
        )
    )).scalar_one()

    return {
        "last_heartbeat":   last_heartbeat.created_at.isoformat() if last_heartbeat else None,
        "worker_details":   last_heartbeat.details if last_heartbeat else None,
        "errors_last_1h":   error_count,
        "critical_last_1h": recent_critical,
    }



@router.get("/logs/feedback/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Feedback consensus durumu ve son eğitim çalışması bilgisi."""
    threshold = settings.FEEDBACK_CONSENSUS_THRESHOLD

    consensus_ready_result = await db.execute(
        select(func.count()).select_from(
            select(ModelFeedback.article_id)
            .group_by(ModelFeedback.article_id, ModelFeedback.submitted_label)
            .having(func.count() >= threshold)
            .subquery()
        )
    )
    consensus_ready = consensus_ready_result.scalar_one() or 0

    all_articles_result = await db.execute(
        select(func.count(func.distinct(ModelFeedback.article_id)))
    )
    all_articles_with_feedback = all_articles_result.scalar_one() or 0
    pending_consensus = max(0, all_articles_with_feedback - consensus_ready)

    last_run_result = await db.execute(
        select(ModelTrainingRun).order_by(ModelTrainingRun.created_at.desc()).limit(1)
    )
    last_run = last_run_result.scalar_one_or_none()

    return FeedbackStatsResponse(
        pending_consensus=pending_consensus,
        consensus_ready=consensus_ready,
        last_training_run=TrainingRunResponse.model_validate(last_run) if last_run else None,
    )



@router.get("/security/ip-threats")
async def get_ip_threats(
    hours:    int = Query(24,  ge=1, le=168),
    limit:    int = Query(50,  ge=1, le=200),
    min_events: int = Query(3, ge=1),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Son N saatte en çok olaya karışan şüpheli IP hash'lerini döner.
    Sadece SECURITY event tipindeki kayıtlar kullanılır.
    """
    since = _since(hours)

    rows = (await db.execute(
        select(
            AuditLog.ip_hash,
            func.count().label("event_count"),
            func.max(AuditLog.created_at).label("last_seen"),
            func.array_agg(func.distinct(AuditLog.event_name)).label("event_types"),
            func.bool_or(AuditLog.severity == "CRITICAL").label("has_critical"),
            func.bool_or(AuditLog.severity == "WARNING").label("has_warning"),
        )
        .where(
            AuditLog.event_type == "SECURITY",
            AuditLog.created_at >= since,
            AuditLog.ip_hash.isnot(None),
        )
        .group_by(AuditLog.ip_hash)
        .having(func.count() >= min_events)
        .order_by(func.count().desc())
        .limit(limit)
    )).all()

    def _threat_level(has_critical, has_warning, count):
        if has_critical:
            return "CRITICAL"
        if has_warning or count >= 10:
            return "WARNING"
        return "INFO"

    return {
        "items": [
            {
                "ip_hash":      r.ip_hash,
                "event_count":  r.event_count,
                "last_seen":    r.last_seen.isoformat() if r.last_seen else None,
                "event_types":  r.event_types or [],
                "threat_level": _threat_level(r.has_critical, r.has_warning, r.event_count),
            }
            for r in rows
            if r.ip_hash
        ]
    }


@router.get("/security/ip-threats/{ip_hash}/events")
async def get_ip_events(
    ip_hash:  str,
    hours:    int = Query(72, ge=1, le=168),
    page:     int = Query(1,  ge=1),
    size:     int = Query(50, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Belirli bir IP hash'inin tüm güvenlik eventlerini döner."""
    since = _since(hours)
    cond  = and_(
        AuditLog.ip_hash == ip_hash,
        AuditLog.event_type == "SECURITY",
        AuditLog.created_at >= since,
    )

    total = (await db.execute(select(func.count()).select_from(AuditLog).where(cond))).scalar_one()
    rows  = (await db.execute(
        select(AuditLog).where(cond)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * size).limit(size)
    )).scalars().all()

    return {
        "total":   total,
        "page":    page,
        "size":    size,
        "ip_hash": ip_hash,
        "items":   [
            {
                "id":         str(r.id),
                "event_name": r.event_name,
                "severity":   r.severity,
                "user_id":    str(r.user_id) if r.user_id else None,
                "path":       r.path,
                "details":    r.details,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }
