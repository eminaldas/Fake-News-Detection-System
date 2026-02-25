from celery import Celery

from app.core.config import settings

celery_app: Celery = Celery(
    "fnds",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Beat schedule (add periodic tasks here)
    beat_schedule={},
)
