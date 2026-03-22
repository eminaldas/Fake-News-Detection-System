from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import auth, analysis, articles

app = FastAPI(
    title="Fake News Detection System (FNDS)",
    description="API for detecting fake news and misinformation using machine learning.",
    version="1.0.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["Authentication"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
app.include_router(articles.router, prefix="/api/v1/articles", tags=["Articles"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "online", "version": "1.0.0"}
