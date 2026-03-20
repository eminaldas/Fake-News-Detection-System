# Türkçe Sahte Haber Tespit Sistemi

Türkçe haber içeriklerini analiz ederek gerçek mi yoksa sahte mi olduğunu tespit eden hibrit yapay zeka sistemi. BERT tabanlı semantik arama, stilometrik analiz ve kural tabanlı NLP sinyallerini birleştirerek 0-100 arası bir **Doğruluk Skoru** üretir.

---

## Özellikler

- **Metin Analizi** — Ham metin yapıştırarak anında analiz
- **URL Analizi** — Haber linki girerek otomatik scrape + tam pipeline
- **Hibrit Skor Motoru** — Semantic (pgvector) + Sınıflandırıcı + Linguistik + Stilometri
- **Semantik Eşleşme** — pgvector cosine distance ile doğrulanmış haber tabanı karşılaştırması
- **Türkçe Stilometri** — Clickbait, korku/acele ve kesin ifade örüntülerini tespit eder
- **Asenkron İşleme** — Celery + Redis ile arka planda kuyruk yönetimi
- **JWT Auth** — Tüm API endpoint'leri token korumalı

---

## Mimari

```
Kullanıcı
  │
  ├─ Metin girişi ──► POST /analyze ──► Anlık semantik arama (pgvector)
  │                                      └─► Doğrudan eşleşme varsa → sonuç
  │                                      └─► Yoksa → Celery kuyruğu
  │
  └─ URL girişi ───► POST /analyze/url ──► Celery kuyruğu
                                            │
                                     [Celery Worker]
                                            │
                                     1. Web Scraper (requests + BS4)
                                     2. NewsCleaner (zemberek + regex)
                                     3. TurkishVectorizer (BERT)
                                     4. pgvector cosine search
                                     5. TurkishStylometrics
                                     6. LogisticRegression classifier
                                     7. Weighted truth_score (0-100)
                                     8. PostgreSQL kayıt
```

### Doğruluk Skoru Formülü

| Bileşen | Ağırlık | Kaynak |
|---------|---------|--------|
| Semantic | %40 | pgvector cosine benzerliği |
| Classifier | %35 | BERT embedding + LogisticRegression |
| Linguistik | %15 | ünlem, büyük harf, soru yoğunluğu |
| Stilometri | %10 | clickbait, korku, mutlak ifade örüntüleri |

**≥ 65** → AUTHENTIC · **≤ 35** → FAKE · Arada → UNCERTAIN

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | FastAPI + SQLAlchemy (async) + asyncpg |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Veritabanı | PostgreSQL + pgvector |
| ML | sentence-transformers (`emrecan/bert-base-turkish-cased-mean-nli-stsb-tr`) + scikit-learn |
| Kuyruk | Celery + Redis |
| Scraper | requests + BeautifulSoup4 |
| Altyapı | Docker Compose |

---

## Kurulum

### Gereksinimler

- Docker & Docker Compose
- Python 3.11+ (sadece veri ingestion için)

### Başlatma

```bash
git clone https://github.com/<kullanici>/Fake-News-Detection-System.git
cd Fake-News-Detection-System

# .env dosyasını oluştur
cp .env.example .env   # yoksa aşağıdaki değişkenleri manuel gir

# Tüm servisleri başlat
docker compose up -d
```

Servisler:

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### .env Değişkenleri

```env
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/fakenews
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<gizli-anahtar>
GEMINI_API_KEY=<google-gemini-api-anahtari>
SIMILARITY_THRESHOLD=0.08
CELERY_RATE_LIMIT=10/s
```

---

## Veri Seti ve Model Eğitimi

Sistemin çalışması için önce veritabanına doğrulanmış haber verisi yüklenmeli ve sınıflandırıcı modeli eğitilmelidir.

```bash
# Docker üzerinden Python çalıştır
docker compose exec worker bash

# Veri setlerini yükle
python scripts/ingest_aa_data.py     # Anadolu Ajansı (AUTHENTIC)
python scripts/ingest_ht_data.py     # Hoax Tutorial (FAKE/AUTHENTIC)

# pgvector indeks oluştur
python scripts/create_index.py

# ML sınıflandırıcısını eğit
python scripts/train_classifier.py
```

Kullanılan veri setleri:
- **Anadolu Ajansı (AA)** — doğrulanmış haberler (AUTHENTIC)
- **HaberTürk** — kategorilendirilmiş haberler
- **Teyit** — profesyonel doğrulama kuruluşu etiketleri (FAKE/AUTHENTIC)

---

## API Kullanımı

### Kimlik Doğrulama

```bash
# Token al
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "sifre"}'
```

Tüm isteklerde `Authorization: Bearer <token>` header'ı gereklidir.

### Metin Analizi

```bash
curl -X POST http://localhost:8000/api/v1/analysis/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Analiz edilecek haber metni buraya..."}'
```

### URL Analizi

```bash
# Görevi kuyruğa al
curl -X POST http://localhost:8000/api/v1/analysis/analyze/url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://haber-sitesi.com/makale"}'

# Sonucu sorgula
curl http://localhost:8000/api/v1/analysis/status/<task_id> \
  -H "Authorization: Bearer <token>"
```

### Örnek Yanıt (URL Analizi)

```json
{
  "prediction": "AUTHENTIC",
  "truth_score": 73.94,
  "confidence": 0.7394,
  "scraped_title": "Haberin Başlığı",
  "signals": {
    "exclamation_ratio": 0.001,
    "uppercase_ratio": 0.042,
    "semantic_component": 0.72,
    "classifier_authentic_score": 0.81,
    "ling_component": 0.94,
    "style_style_score": 0.05
  }
}
```

---

## Proje Yapısı

```
├── app/                    # FastAPI backend
│   ├── api/v1/endpoints/   # Analysis, auth endpoint'leri
│   ├── models/             # SQLAlchemy ORM modelleri
│   └── core/               # Config, JWT
├── ml_engine/              # ML pipeline
│   ├── vectorizer.py       # BERT embedding üretimi
│   └── processing/
│       ├── cleaner.py      # Metin temizleme + linguistik sinyaller
│       └── stylometric.py  # Türkçe stilometrik analiz
├── workers/                # Celery görev tanımları
│   ├── tasks.py            # Metin analiz görevi
│   └── link_analysis_task.py  # URL analiz görevi
├── scrapers/               # Web scraper
├── scripts/                # Veri ingestion + model eğitim
├── frontend/               # React + Vite + Tailwind
└── docker-compose.yml
```

---

## Lisans

Bu proje akademik ve araştırma amaçlı geliştirilmiştir.
