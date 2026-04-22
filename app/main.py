import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import HTMLResponse

from app.api.v1.endpoints import ab as ab_endpoint, admin, admin_logs, analysis, articles, auth, forum, insights, interactions, market, news, notifications, recommendations, sources, users, ws as ws_endpoint
from app.api.v1.endpoints import share as share_router
from app.core.logging import get_logger, setup_logging
from app.core.seo import inject_thread_meta, is_bot
from app.db.redis import close_redis
from app.middleware.logging_middleware import LoggingMiddleware

setup_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("app.startup")
    yield
    await close_redis()
    log.info("app.shutdown")


app = FastAPI(
    title="Fake News Detection System (FNDS)",
    description="API for detecting fake news and misinformation using machine learning.",
    version="1.0.0",
    lifespan=lifespan,
)

_FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"
_INDEX_PATH   = _FRONTEND_DIR / "index.html"
_INDEX_HTML   = _INDEX_PATH.read_text(encoding="utf-8") if _INDEX_PATH.exists() else ""
_THREAD_RE    = re.compile(r"^/forum/([0-9a-f-]{36})$")


class SEOMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ua   = request.headers.get("user-agent", "")
        path = request.url.path

        if _INDEX_HTML and is_bot(ua):
            m = _THREAD_RE.match(path)
            if m:
                thread_id = m.group(1)
                try:
                    from app.db.session import AsyncSessionLocal
                    from app.models.models import ForumThread
                    from sqlalchemy import select
                    from sqlalchemy.orm import selectinload

                    async with AsyncSessionLocal() as db:
                        thread = (await db.execute(
                            select(ForumThread)
                            .options(selectinload(ForumThread.user))
                            .where(ForumThread.id == thread_id)
                        )).scalar_one_or_none()

                        if thread:
                            html = inject_thread_meta(_INDEX_HTML, {
                                "id":              str(thread.id),
                                "title":           thread.title,
                                "body":            thread.body or "",
                                "author_username": thread.user.username if thread.user else "",
                                "created_at":      thread.created_at.isoformat(),
                            })
                            return HTMLResponse(html)
                except Exception:
                    pass

        return await call_next(request)


app.add_middleware(SEOMiddleware)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"chrome-extension://[a-z]{32}",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"

    # Rate limit header'larını request.state'den ekle (set edildiyse)
    if hasattr(request.state, "rate_limit_limit"):
        response.headers["X-RateLimit-Limit"]     = str(request.state.rate_limit_limit)
        response.headers["X-RateLimit-Remaining"] = str(request.state.rate_limit_remaining)
        response.headers["X-RateLimit-Reset"]     = str(request.state.rate_limit_reset)

    return response


app.include_router(auth.router,     prefix="/api/v1/auth",    tags=["Authentication"])
app.include_router(analysis.router, prefix="/api/v1/analysis",tags=["Analysis"])
app.include_router(articles.router, prefix="/api/v1/articles",tags=["Articles"])
app.include_router(users.router,    prefix="/api/v1/users",   tags=["Users"])
app.include_router(admin.router,    prefix="/api/v1/admin",   tags=["Admin"])
app.include_router(ab_endpoint.router, prefix="/api/v1/admin/ab", tags=["AB Testing"])
app.include_router(admin_logs.router, prefix="/api/v1/admin", tags=["Admin Logs"])
app.include_router(market.router,   prefix="/api/v1/market",  tags=["Market"])
app.include_router(news.router,     prefix="/api/v1/news",    tags=["News"])
app.include_router(interactions.router,    prefix="/api/v1/interactions",   tags=["Interactions"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
app.include_router(insights.router,        prefix="/api/v1/insights",        tags=["Insights"])
app.include_router(notifications.router,   prefix="/api/v1/notifications",   tags=["Notifications"])
app.include_router(sources.router,         prefix="/api/v1/sources",         tags=["Sources"])
app.include_router(forum.router,           prefix="/api/v1/forum",            tags=["Forum"])
app.include_router(ws_endpoint.router,     prefix="/api/v1")
app.include_router(share_router.router, prefix="/s", tags=["Share"])
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "online", "version": "1.0.0"}
