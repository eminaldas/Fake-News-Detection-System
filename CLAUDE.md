# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Turkish fake news detection system with a FastAPI backend, React frontend, ML pipeline, and Celery async workers. The system uses BERT Turkish embeddings stored in PostgreSQL with pgvector for semantic search, combined with a scikit-learn classifier and rule-based NLP signals.

## Commands

### Running the Project

```bash
# Start all services (recommended)
docker-compose up

# Backend only
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend only
cd frontend && npm install && npm run dev
```

Services:
- Backend API: http://localhost:8000 (Swagger: /docs)
- Frontend: http://localhost:5173
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Data & Model Setup

```bash
python scripts/ingest_aa_data.py    # Load Aruz-Alkan dataset
python scripts/ingest_ht_data.py    # Load Hoax Tutorial dataset
python scripts/create_index.py      # Create pgvector indexes
python scripts/train_classifier.py  # Train ML classifier
```

### Testing

```bash
python test_db.py   # Validate PostgreSQL/pgvector connectivity
```

No automated test suite exists. Use Swagger UI at `/docs` for interactive API testing (JWT required for all endpoints except `/auth/login`).

### Frontend

```bash
cd frontend && npm run build   # Production build
cd frontend && npm run lint    # Lint check
```

## Architecture

### Two-Stage Analysis Pipeline

**Stage 1 — Semantic search (real-time):** Incoming text is vectorized (BERT Turkish) and compared against the pgvector knowledge base using cosine distance. Threshold 0.08 (≈92% similarity) triggers a direct match.

**Stage 2 — Deep analysis (Celery worker, async):** If no match:
1. NLP preprocessing via `ml_engine/processing/cleaner.py` (text cleaning, URL removal, Turkish morphology via zemberek)
2. Signal extraction: `exclamation_ratio`, `uppercase_ratio`, `question_density`
3. BERT embeddings → scikit-learn classifier (`ml_engine/models/fake_news_classifier.pkl`)
4. Hybrid ensemble: if classifier confidence 40–60% AND rule signals > 0.03 → FAKE; else use classifier prediction

### Key Components

| Path | Role |
|------|------|
| `app/main.py` | FastAPI app entry point, router registration |
| `app/api/v1/endpoints/analysis.py` | Core analysis endpoint |
| `app/models/models.py` | Article (768-dim pgvector embedding), AnalysisResult, Source ORM models |
| `ml_engine/vectorizer.py` | Turkish sentence embedding generation (`emrecan/bert-base-turkish-cased-mean-nli-stsb-tr`) |
| `ml_engine/processing/cleaner.py` | Text preprocessing & linguistic signal extraction |
| `workers/tasks.py` | Main Celery analysis tasks |
| `workers/agent_tasks.py` | AI News Agent (RSS monitoring + fact-checking pipeline) |
| `scrapers/rss_monitor.py` | RSS feed monitoring for automated ingestion |

### Database

PostgreSQL with pgvector. Articles store 768-dimensional BERT embeddings; cosine similarity search uses the `<=>` operator. Metadata is JSONB (evidence, fact-check sources, radar search results).

### Environment Variables (`.env`)

- `DATABASE_URL` — PostgreSQL async connection string
- `REDIS_URL` — Celery broker/backend
- `SECRET_KEY` — JWT signing key
- `GEMINI_API_KEY` — Google Gemini for fact-checking
- `SIMILARITY_THRESHOLD` — Vector match threshold (default `0.08`)
- `CELERY_RATE_LIMIT` — Task rate limit (default `10/s`, controls OOM risk)

### Auth

JWT (HS256, 30-min expiry). All endpoints require `Authorization: Bearer <token>` except `/auth/login` and `/health`.

### Frontend

React 19 + Vite + Tailwind CSS 4. Pages: Login, Home, Dashboard, Archive. Uses Axios for API calls and React Context for auth state.
