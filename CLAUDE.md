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
2. Signal extraction: 8 signals (see NLP improvements below)
3. BERT embedding: single vector via `get_embedding(cleaned_text)`
4. scikit-learn classifier (`ml_engine/models/fake_news_classifier.pkl`)
5. Weighted ensemble: `combined = MODEL_WEIGHT × fake_p + (1-MODEL_WEIGHT) × risk_score`; `MODEL_WEIGHT = settings.ENSEMBLE_MODEL_WEIGHT` (default **1.0** as of 2026-07-28 — empirically the best Macro-F1 in `scripts/decision_policy_ablation.py`'s 5-fold sweep; effectively the risk term contributes 0 to the final decision, see note below); threshold 0.50. (A rule-based `strong_manipulative` override existed here until 2026-07-28 — removed after the same script measured it never improved fake recall and slightly worsened the false-positive rate; see `docs/decision_policy_ablation_report.md`.)

---

## NLP İyileştirme Raporu — 2026-03-23

### 1. Sinyal Zenginleştirme (`ml_engine/processing/cleaner.py`)

**Önceki durum:** 3 sinyal — `exclamation_ratio`, `uppercase_ratio`, `question_density`

**Yeni durum:** 8 sinyal

| Sinyal | Açıklama | Sahtelik Katkısı |
|--------|----------|-----------------|
| `exclamation_ratio` | Ünlem yoğunluğu | Pozitif |
| `uppercase_ratio` | Büyük harf oranı | Pozitif |
| `question_density` | Soru işareti yoğunluğu | Pozitif |
| `clickbait_score` | "şok", "bomba", "flaş" gibi ~30 Türkçe kelime | **Pozitif (ağırlık: 0.30)** |
| `hedge_ratio` | "iddia edildi", "söyleniyor" gibi belirsizlik ifadeleri | Pozitif |
| `source_score` | Resmi kaynak referansı | **Negatif** (riski düşürür) |
| `avg_word_length` | Kısa kelime ortalaması → sensasyonel dil | Pozitif |
| `number_density` | Yüksek rakam yoğunluğu | Pozitif |

Risk formülü:
```
risk = clickbait×0.30 + exclamation×0.20 + uppercase×0.15
     + hedge×0.15 + question×0.10 + number_density×0.05
     + short_word_penalty×0.10 - source_score×0.15
risk = clamp(risk, 0.0, 1.0)
```

### 2. Hibrit Eşik Düzeltmesi (`workers/tasks.py`)

**Önceki hata (bug):**
```python
if max_p < 0.60 and risk > 0.03:
    pred_status = "FAKE"   # model %55 AUTHENTIC dese bile FAKE üretiyordu
```
Bu mantık, düşük güvenli AUTHENTIC tahminlerini minimal kural sinyaliyle FAKE'e çekiyordu. Yanlış pozitif oranını artırıyor.

**Yeni yaklaşım (ağırlıklı ensemble):**
```python
combined    = MODEL_WEIGHT × fake_p  +  (1-MODEL_WEIGHT) × risk
pred_status = "FAKE" if combined > 0.50 else "AUTHENTIC"
confidence  = max(combined, 1 - combined)
```
`MODEL_WEIGHT` = `settings.ENSEMBLE_MODEL_WEIGHT`. Tarihçesi: ilk yazıldığında 0.70, sonra kodda sessizce 0.55'e kaymıştı (makale/CLAUDE.md hâlâ 0.70 diyordu — kod/doküman çelişkisiydi), 2026-07-28'de `scripts/decision_policy_ablation.py` ile 0.0-1.0 arası 5-fold CV tarandı ve **1.0** en iyi Macro-F1'i verdi (0.8724). Yani risk skorunun ayrı bir ensemble terimi olarak katkısı ölçülemedi — 8 sinyal zaten classifier'ın 776-dim feature vektörünün içinde (bkz. `docs/ablation_signal_study_report.md`, orada fayda gösterildi). "Hibrit" iddiası bu iki deneyle birlikte şöyle çerçevelenmeli: sinyaller **feature olarak** katkı sağlıyor, **ayrı bir kural-tabanlı oylama katmanı olarak değil**. `compute_risk()` kod tabanında kalmaya devam ediyor çünkü (a) classifier yüklenemezse fallback kararı için kullanılıyor, (b) SignalPanel/HighlightedText ile kullanıcıya şeffaflık için gösteriliyor.

Not (2026-07-28): Bu ensemble'dan önce çalışan bir `strong_manipulative` kural override'ı vardı (belirli clickbait/hedge/caps eşik kombinasyonlarında sınıflandırıcı hiç çalıştırılmadan doğrudan `FAKE` üretiliyordu). Aynı script ile ölçüldü: override açıkken/kapalıyken fake recall **birebir aynı** çıktı (0.7751=0.7751) — yani override hiçbir zaman modelin kaçırdığı bir sahteyi yakalamıyordu, sadece FP rate'i hafifçe kötüleştiriyordu (0.0841→0.0858). Bu ölçüm sonucu kaldırıldı — artık ensemble tek karar yolu. Detay: `docs/decision_policy_ablation_report.md`.

### 3. Başlık/İçerik Embedding Ayrımı — UYGULANMADI

**Gerekçe:** Bu yaklaşım mevcut veri yapısıyla uyumsuz.

Teyit verilerinde `content` (detayli_analiz) alanı orijinal haber gövdesi **değil**, fact-checker'ın doğrulama analizidir ("Bu iddia yanlıştır çünkü..."). Bu metne `0.40` ağırlık vermek modele ters sinyal üretir — sahte iddianın üstüne gerçeklik analizini bindirmiş oluruz.

`get_weighted_embedding` metodu `vectorizer.py`'de **utility olarak korunmuştur**; yalnızca gerçek haber başlığı + haber gövdesi çiftinin kesin olarak bilindiği senaryolarda (ör. gelecekteki URL scraping pipeline) kullanılmalıdır. Ana pipeline `get_embedding` kullanmaya devam eder.

### 4. Sinyal-Augmented Classifier (`scripts/train_classifier.py` + `workers/tasks.py`)

**Feature boyutu:** 768 (BERT) + 8 (sinyaller) = **776 boyut**

Eğitim ve inference'da sinyal sırası `SIGNAL_KEYS` sabiti üzerinden senkronize edilir (`ml_engine/processing/cleaner.py`). `avg_word_length`, `/ 10.0` ile [0,1] aralığına normalize edilir.

Pipeline yapısı:
```python
Pipeline([
    ("scaler", StandardScaler()),   # tüm 776 boyutu normalize eder
    ("lr",     LogisticRegression(class_weight="balanced")),
])
```
Tüm pipeline tek `.pkl` dosyasına kaydedilir — inference'da ayrı scaler gerekmez.

`signals_to_vector(signals)` fonksiyonu hem `train_classifier.py` hem `tasks.py` tarafından import edilir. Sinyallere yeni ekleme yapılırsa `SIGNAL_KEYS` güncellendikten sonra **yeniden eğitim zorunludur**.

**✅ Model 2026-03-23 tarihinde yeniden eğitildi. 3286 örnek (1731 Doğru + 1555 Yanlış), 776-dim feature, %88 accuracy (F1: Authentic 0.89 / Fake 0.88).**

Not: Eski filtre (`metadata_info->>'source' IS NOT NULL`) yalnızca AUTHENTIC kayıtları seçiyordu (Teyit/FAKE verisinde `source` key'i yok, `baslik` var). Filtre `status IN (valid_statuses)` olarak düzeltildi.

### 5. Stage 1 Multi-Match Oylama (`app/api/v1/endpoints/analysis.py`)

**Önceki:** Top-3 eşleşmeden yalnızca `[0]` (en yakın) kullanılıyordu.

**Yeni:** Benzerlik-kare ağırlıklı oylama sistemi:
```python
weight = similarity²   # yakın eşleşmeler üstel olarak daha fazla oy taşır
winner = argmax(weighted_votes["FAKE"], weighted_votes["AUTHENTIC"])
```
Response'a `match_count` ve `vote_agreement` alanları eklendi (adı `vote_confidence`'tan değiştirildi — bu değer gerçek tahmin güveni değil, kazanan sınıfın oy uzlaşma oranıdır). Kanıt (`evidence`), en yakın eşleşmeden değil, kazanan sınıftaki en yüksek benzerlikli eşleşmeden seçilir. Tek eşleşmede davranış değişmez.

Not: Ensemble ağırlığı (`combined = MODEL_WEIGHT×fake_p + (1-MODEL_WEIGHT)×risk`) artık `settings.ENSEMBLE_MODEL_WEIGHT` üzerinden okunur (varsayılan **1.0**, ölçülen argmax — bkz. yukarıdaki "Stage 2" bölümü), hardcoded 0.70/0.30 değil — bkz. `workers/tasks.py`.

### Sınıflandırma Terminolojisi — Üç Ayrı Taksonomi

Kod tabanında üç farklı, birbirine dönüştürülmeyen sınıflandırma sistemi bulunuyor. Bunlar aynı kavramın tutarsız isimleri değil, **kasıtlı olarak farklı üç bileşen**dir:

| Taksonomi | Değerler | Nerede | Ne anlama gelir |
|-----------|----------|--------|------------------|
| ML/kural karar sistemi | `FAKE` / `AUTHENTIC` / `UNKNOWN` | `AnalysisResult.status`, `Article.status`, `workers/tasks.py`, `app/api/v1/endpoints/analysis.py` | Otomatik pipeline'ın (Stage 1 + Stage 2) ürettiği makine kararı |
| Forum topluluk oylaması | `suspicious` / `authentic` / `investigate` (`ck_forum_vote_type`, `app/models/models.py`) | Forum thread modelleri, `forum.py` | İnsan kullanıcıların oyladığı, ML kararından bağımsız bir topluluk-doğrulama sinyali — ML sonucunu geçersiz kılmaz, ayrı bir katmandır |
| Gemini/görsel LLM verdict'i | `AI_GENERATED` / `MANIPULATED` / `AUTHENTIC` / `UNCERTAIN`, ayrıca `TRUE`/`FALSE`/`MISLEADING` gibi serbest metin çıktılar | `workers/image_analysis_task.py`, `workers/ai_comment_task.py` | LLM'in kendi ürettiği, serbest formatlı bir değerlendirme; DB'ye yapılandırılmış şekilde yazılmaz (JSONB, `gemini_result`/`ai_comment`) |

Bu üç sistemi **tek bir enum'a birleştirmek/rename etmek yapılmadı** çünkü `status` alanları DB'de zaten canlı veri içeriyor (rename bir migration + tüm eski kayıtların dönüştürülmesini gerektirir, yüksek risk/düşük fayda). Makalede/tez metninde üçünün ayrı taksonomiler olduğu açıkça belirtilmeli; "sistemde 4 farklı sınıflandırma şeması var, tutarsız" eleştirisine karşı savunma budur — aslında 3 farklı **bileşen** var, her biri kendi amacına göre isimlendirilmiş.

### Key Components

| Path | Role |
|------|------|
| `app/main.py` | FastAPI app entry point, router registration |
| `app/api/v1/endpoints/analysis.py` | Core analysis endpoint (Stage 1 vote + Stage 2 dispatch, task_id/result_id provenance) |
| `app/models/models.py` | Article (768-dim pgvector embedding), AnalysisResult, AnalysisRequest, AnalysisMatch, ModelTrainingRun, Source ORM models |
| `ml_engine/vectorizer.py` | Turkish sentence embedding generation (`emrecan/bert-base-turkish-cased-mean-nli-stsb-tr`) |
| `ml_engine/processing/cleaner.py` | Text preprocessing & linguistic signal extraction |
| `ml_engine/scoring/decision_policy.py` | **Tek karar mekanizması** — risk skoru, ensemble kararı; `workers/tasks.py` ve `scripts/decision_policy_ablation.py` bunu kullanır (bkz. "Sınıflandırma Terminolojisi" üstündeki not) |
| `workers/tasks.py` | Main Celery analysis tasks — model hot-reload (`_maybe_reload_classifier`) burada |
| `workers/retrain_task.py` | Nightly model retraining — atomik dosya değişimi + 3'lü regresyon guard (accuracy/macro_f1/fake_recall) |
| `workers/agent_tasks.py` | AI News Agent (RSS monitoring + fact-checking pipeline) |
| `scrapers/rss_monitor.py` | RSS feed monitoring for automated ingestion |
| `scripts/decision_policy_ablation.py` | Ensemble ağırlığı/override etkisini 5-fold CV ile ölçen script → `docs/decision_policy_ablation_report.md` |
| `scripts/count_infra.py` | Docker servis sayısı + gerçek API route sayısını otomatik sayar (makaledeki rakamlar elle güncellenmemeli) |

### Database

PostgreSQL with pgvector. Articles store 768-dimensional BERT embeddings; cosine similarity search uses the `<=>` operator. Metadata is JSONB (evidence, fact-check sources, radar search results).

`AnalysisResult` artık karar sürecinin tam izini tutuyor: `model_probability`, `risk_score`, `combined_score`, `model_version` (classifier `.pkl` dosyasının mtime'ı), `policy_version` (bkz. `decision_policy.POLICY_VERSION`), `decision_path` (`"ensemble"` | `"classifier_error"` | `"no_classifier"`). `AnalysisRequest.result_id` ilgili sonuca işaret eder (işlem sürerken NULL). `AnalysisMatch` tablosu Stage 1 oylamasına giren en fazla 3 eşleşmenin tamamını (rank/similarity/vote_weight/is_winner) saklar — önceden yalnızca en iyi eşleşme (evidence) tutuluyordu. Bkz. migration `d1a2p3o4l5c6`, `e2b3m4a5t6c7`, `f3g4t5r6a7i8` (2026-07-28, hakem-PDF revizyonu sonrası).

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
