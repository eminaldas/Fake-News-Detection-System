import os
import time
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery
celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="analyze_article")
def analyze_article(content_id: str, text: str = None, url: str = None):
    """
    Placeholder task for article analysis.
    In real usage, this will trigger the ML models and web scrapers.
    """
    # Simulate processing delay
    time.sleep(5)
    
    result = {
        "content_id": content_id,
        "status": "completed",
        "mock_score": "fake",
        "confidence": 0.88,
        "processed_text_length": len(text) if text else 0,
        "source_url": url
    }
    
    return result
