from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints import ab as ab_endpoint, admin, admin_logs, analysis, articles, auth, forum, insights, interactions, market, news, notifications, recommendations, sources, users, ws as ws_endpoint
from app.api.v1.endpoints import share as share_router
from app.core.logging import get_logger, setup_logging
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
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
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
