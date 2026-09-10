# NeHaber — Turkish Fake News Detection Platform

**Live:** [nehaber.dev](https://nehaber.dev)

A full-stack platform for automated fake news detection in Turkish. Combines BERT-based semantic search, machine learning classification, LLM-powered deep research, and community verification into a single production system.

---

## Features

### Analysis Pipeline
- **Stage 1 — Semantic Search:** Incoming text is vectorized (Turkish BERT, 768-dim) and matched against a knowledge base via pgvector cosine similarity. Threshold: 0.08 (~92% similarity). Top-3 matches use similarity² weighted voting.
- **Stage 2 — ML Classification (async Celery):** 8 NLP signals extracted → combined with BERT embedding into a 776-dim feature vector → StandardScaler + LogisticRegression produces `fake_p`. General decision policy: `z = α·fake_p + (1-α)·risk` (`0 ≤ α ≤ 1`, configurable via `settings.ENSEMBLE_MODEL_WEIGHT`). A 5-fold CV ablation selected **α = 1.0** as production policy — i.e. the local decision is currently `fake_p` alone; the rule-based risk score is stored separately for interpretation/monitoring rather than blended into the decision (see `docs/decision_policy_ablation_report.md`). Confidence `q = max(z, 1-z)` gates the Gemini prompt mode: `q ≤ 0.65` → decision-support mode, else explanatory/verification mode. A differing Gemini verdict can update the stored result in either mode.
- **Stage 3 — Deep Report (on demand):** Gemini-powered research pass with Google Search grounding. Produces a 7-scale verdict (`DOĞRU` → `SAHTE`), multi-dimensional credibility score, decisive factors, domain context, precedent cases, and numeric claim verification.

### Content & Community
- RSS-based automated news ingestion from 65 Turkish sources (Celery Beat, 6×/day)
- Forum with community verdict system (20-vote threshold, 75% majority rule)
- Trust tier system: `yeni_uye → dogrulayici → analist → dedektif`
- Follow/follower system with private profiles (restricted view for non-followers)
- Gamification: XP system with daily limits, 28 badges, leaderboard (weekly/monthly/all-time)

### Platform
- 38-page React 19 frontend (Tailwind CSS v4, Vite)
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
| LLM | Google Gemini 3.5 Flash (2.5 Flash fallback) |
| Infra | Docker Compose (12 production services + dev-only frontend), Hetzner, Vercel, Cloudflare |

---

## Model Performance

Evaluated on a fixed 3,764-sample dataset (1,759 AUTHENTIC / 2,005 FAKE; Teyit + Anadolu Ajansı + Habertürk) via 5-fold stratified cross-validation, mean ± std:

| Method | Accuracy | Macro-F1 | Recall (FAKE) | Recall (AUTH.) |
|--------|----------|----------|----------------|-----------------|
| Majority-class baseline | 0.5327 ± 0.0003 | 0.3475 ± 0.0001 | 1.0000 | 0.0000 |
| TF–IDF + Logistic Regression | 0.8757 ± 0.0093 | **0.8745 ± 0.0095** | 0.9122 ± 0.0101 | 0.8340 ± 0.0177 |
| BERT embeddings only (768-dim) | 0.8666 ± 0.0063 | 0.8663 ± 0.0062 | 0.8569 ± 0.0164 | 0.8778 ± 0.0113 |
| **BERT + 8 NLP signals (776-dim, production)** | **0.8727 ± 0.0065** | 0.8724 ± 0.0065 | 0.8643 ± 0.0183 | 0.8823 ± 0.0138 |

The 8 handcrafted signals add +0.0061 Macro-F1 over BERT-only features, but a classical TF-IDF baseline remains slightly ahead of the hybrid model on this dataset (0.8745 vs 0.8724) — the hybrid approach is not a clear win over the lexical baseline in this evaluation. Decision-policy ablation (α, the classifier-vs-risk-score weight) selected **α = 1.0** — i.e., the production decision uses classifier probability alone. Full methodology, baselines, and ablations: see the project paper and `docs/decision_policy_ablation_report.md` / `docs/ablation_signal_study_report.md`.

Feature vector: 776-dim (768 BERT + 8 NLP signals). These numbers cover the local Stage 2 classifier only — Stage 1 direct matches and post-hoc Gemini verdict changes are evaluated separately, not folded into these metrics.

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
    └── Hetzner Server (2 vCPU / 4 GB RAM / 80 GB SSD)
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

1,000+ commits. Spec-driven iterative development — each feature followed: design doc → implementation plan → code → git commit.

---

## License

All rights reserved. Live service at [nehaber.dev](https://nehaber.dev).
