"""
Celery task definitions.

Tasks are auto-discovered because this module is listed in the
``include`` argument of the Celery app factory (workers/celery_app.py).
"""
import logging
from typing import Any

from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def analyse_article(self, article_id: str) -> dict[str, Any]:
    """
    Trigger the ML analysis pipeline for a given article.

    Args:
        article_id: UUID string of the article to analyse.

    Returns:
        Dict containing overall_score, sentiment_score, linguistic_flags.
    """
    try:
        logger.info("Starting analysis for article %s", article_id)
        # TODO: implement analysis logic using ml_engine
        return {"article_id": article_id, "status": "queued"}
    except Exception as exc:
        logger.exception("Analysis failed for article %s", article_id)
        raise self.retry(exc=exc)


@celery_app.task
def scrape_rss_feeds() -> dict[str, int]:
    """Periodic task: fetch new articles from configured RSS feeds."""
    # TODO: implement via scrapers package
    logger.info("RSS feed scraping triggered")
    return {"scraped": 0}
