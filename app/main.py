from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth, analysis

app = FastAPI(
    title="Fake News Detection System (FNDS)",
    description="API for detecting fake news and misinformation using machine learning.",
    version="1.0.0",
)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000", # Frontend dev server
    # Add other origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])

@app.get("/", tags=["Health"])
async def read_root():
    return {
        "status": "online",
        "message": "FNDS API is running",
        "docs_url": "/docs"
    }
