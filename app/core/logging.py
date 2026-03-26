"""
app/core/logging.py
===================
structlog tabanlı JSON logger.
Her modül: from app.core.logging import get_logger; log = get_logger(__name__)
"""
import logging
import sys

import structlog


def setup_logging() -> None:
    """Uygulama başlangıcında bir kez çağrılır (app/main.py)."""
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)
