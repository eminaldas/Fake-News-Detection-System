from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.db import engine
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables on startup (dev convenience; use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app: FastAPI = FastAPI(
    title="Fake News Detection & Analysis System",
    description=(
        "High-scalability backend for fake-news detection powered by "
        "pgvector similarity search and an NLP analysis pipeline."
    ),
    version="0.1.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
