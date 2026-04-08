"""
workers/audit_flush_task.py
============================
Celery Beat task: Redis audit buffer → PostgreSQL bulk insert.
Her 5 saniyede bir çalışır (workers/agent_tasks.py beat_schedule).
"""
import asyncio
import json
import logging
import uuid as _uuid

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.audit import BUFFER_KEY
from app.core.config import settings

logger     = logging.getLogger(__name__)
BATCH_SIZE = 500


def flush_audit_buffer() -> None:
    """Celery tarafından çağrılır — sync wrapper."""
    asyncio.run(_flush_async())


async def _flush_async() -> None:
    from redis.asyncio import from_url as redis_from_url
    from app.models.models import AuditLog

    redis = await redis_from_url(
        settings.REDIS_URL, encoding="utf-8", decode_responses=True
    )
    try:
        # Atomik oku + temizle
        pipe        = redis.pipeline(transaction=True)
        pipe.lrange(BUFFER_KEY, 0, BATCH_SIZE - 1)
        pipe.ltrim(BUFFER_KEY, BATCH_SIZE, -1)
        results     = await pipe.execute()
        raw_events  = results[0]

        if not raw_events:
            return

        engine        = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        try:
            logs = []
            for raw in raw_events:
                try:
                    data    = json.loads(raw)
                    uid_str = data.get("user_id")
                    logs.append(AuditLog(
                        event_type      = data.get("event_type",  "SYSTEM"),
                        event_name      = data.get("event_name",  "unknown"),
                        user_id         = _uuid.UUID(uid_str) if uid_str else None,
                        ip_hash         = data.get("ip_hash",     ""),
                        session_id      = data.get("session_id"),
                        path            = data.get("path"),
                        http_method     = data.get("http_method"),
                        status_code     = data.get("status_code"),
                        process_time_ms = data.get("process_time_ms"),
                        severity        = data.get("severity",    "INFO"),
                        details         = data.get("details",     {}),
                    ))
                except Exception as exc:
                    logger.warning("audit flush: bad event skipped: %s", exc)

            if logs:
                async with async_session() as session:
                    session.add_all(logs)
                    await session.commit()
                logger.info("audit flush: %d events → PostgreSQL", len(logs))
        finally:
            await engine.dispose()
    finally:
        await redis.aclose()
