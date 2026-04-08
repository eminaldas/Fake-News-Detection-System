"""
app/middleware/logging_middleware.py
=====================================
Her HTTP request'ini non-blocking olarak audit buffer'a yazar.
/health, /docs, /openapi.json, /redoc hariç tutulur.
"""
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.audit import audit_log
from app.db.redis import get_redis

_EXCLUDED = {"/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"}


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in _EXCLUDED:
            return await call_next(request)

        start    = time.perf_counter()
        response = await call_next(request)
        ms       = round((time.perf_counter() - start) * 1000, 2)

        ip = request.client.host if request.client else "unknown"

        try:
            redis = await get_redis()
            event_type = "SECURITY" if response.status_code in {401, 403, 429} else "USER_ACTION"
            await audit_log(
                redis=redis,
                event_type=event_type,
                event_name=f"http.{request.method.lower()}",
                ip=ip,
                path=str(request.url.path),
                http_method=request.method,
                status_code=response.status_code,
                process_time_ms=ms,
            )
        except Exception:
            pass  # Middleware hataları response'u bloklamaz

        return response
