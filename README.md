# NeHaber — Turkish Fake News Detection Platform

**Live:** [nehaber.dev](https://nehaber.dev)

A full-stack platform for automated fake news detection in Turkish. Combines BERT-based semantic search, machine learning classification, LLM-powered deep research, and community verification into a single production system.

---

## Features

### Analysis Pipeline
- **Stage 1 — Semantic Search:** Incoming text is vectorized (Turkish BERT, 768-dim) and matched against a knowledge base via pgvector cosine similarity. Threshold: 0.08 (~92% similarity). Top-3 matches use similarity² weighted voting.
- **Stage 2 — ML Classification (async Celery):** 8 NLP signals extracted → combined with BERT embedding into a 776-dim feature vector → StandardScaler + LogisticRegression → weighted ensemble: `combined = MODEL_WEIGHT × fake_p + (1-MODEL_WEIGHT) × risk` (configurable, `settings.ENSEMBLE_MODEL_WEIGHT`, empirically tuned — see `docs/decision_policy_ablation_report.md`)
- **Stage 3 — Deep Report (on demand):** 3-stage Gemini research agent (triage → evidence gathering → synthesis). Produces 7-scale verdict, multi-dimensional credibility score, decisive factors, domain context, precedent cases, numeric claim verification.

### Content & Community
- RSS-based automated news ingestion from 65 Turkish sources (Celery Beat, 6×/day)
- Forum with community verdict system (20-vote threshold, 75% majority rule)
- Trust tier system: `yeni_uye → dogrulayici → analist → dedektif`
- Gamification: XP system with daily limits, 28 badges, leaderboard (weekly/monthly/all-time)

### Platform
- 32-page React 19 frontend (Tailwind CSS v4, Vite)
- Admin panel: user management, moderation queue, security events, dataset management, A/B testing
- Visual analysis: pHash → EXIF → Gemini 3-layer escalation
- Source bias detection + temporal deception analysis
- WebSocket real-time notifications

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (async), Python |
| Frontend | React 19, Tailwind CSS v4, Vite |
| Database | PostgreSQL 15 + pgvector |
| ML | scikit-learn, `emrecan/bert-base-turkish-cased-mean-nli-stsb-tr` |
| Task Queue | Celery + Redis |
| LLM | Google Gemini 3.5 Flash |
| Infra | Docker Compose (12 production services + dev-only frontend), DigitalOcean, Vercel, Cloudflare |

---

## Model Performance

Trained on 3,286 balanced Turkish news samples (Teyit + Anadolu Ajansı):

| Metric | Authentic | Fake | Overall |
|--------|-----------|------|---------|
| Precision | 0.88 | 0.89 | 0.88 |
| Recall | 0.90 | 0.87 | 0.89 |
| F1 | 0.89 | 0.88 | 0.88 |
| Accuracy | — | — | **88%** |

Feature vector: 776-dim (768 BERT + 8 NLP signals). Last trained: March 2026.

---

## Architecture

```
User (Browser)
    │ HTTPS
    ▼
Cloudflare (CDN + DDoS + SSL)
    │
    ├── Vercel (React Frontend)
    │
    └── DigitalOcean Droplet (2 vCPU / 4 GB RAM / 80 GB SSD)
            │
            ├── FastAPI app:8000
            ├── embedding-service:8001  (Turkish BERT, 900 MB limit)
            ├── PostgreSQL:5432 + pgvector
            ├── Redis:6379 (broker + cache)
            └── Celery Workers
                    ├── worker            (analysis pipeline)
                    ├── rss-worker        (news ingestion)
                    ├── ai-comment-worker (Gemini comments)
                    ├── category-worker   (content categorization)
                    ├── rss-beat          (6×/day scheduler)
                    ├── category-beat     (categorization scheduler)
                    ├── audit-beat        (async log flush + nightly model retrain)
                    └── news-agent        (65-source monitor)
```

---

## NLP Signals

| Signal | Description | Direction |
|--------|-------------|-----------|
| `clickbait_score` | ~30 Turkish sensationalist keywords | ↑ fake |
| `exclamation_ratio` | Exclamation mark density | ↑ fake |
| `caps_ratio` | Uppercase character ratio | ↑ fake |
| `hedge_ratio` | Uncertainty phrases ("iddia edildi") | ↑ fake |
| `question_density` | Question mark density | ↑ fake |
| `number_density` | Numeric content density | ↑ fake |
| `avg_word_length` | Short word average (sensationalism proxy) | ↑ fake |
| `source_score` | Official source references | ↓ fake |

Risk formula:
```
risk = clickbait×0.30 + exclamation×0.20 + uppercase×0.15
     + hedge×0.15 + question×0.10 + number_density×0.05
     + short_word_penalty×0.10 − source_score×0.15
```

---

## Development

700+ commits across 46 design specs and 52 implementation plans. Spec-driven iterative development — each feature followed: design doc → implementation plan → code → git commit.

---

## License

All rights reserved. Live service at [nehaber.dev](https://nehaber.dev).
