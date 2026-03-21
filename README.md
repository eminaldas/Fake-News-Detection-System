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
| ML |  scikit-learn |
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
git clone https://github.com/eminaldas/Fake-News-Detection-System.git
cd Fake-News-Detection-System

# Tüm servisleri başlat
docker compose up -d
```



## Veri Seti ve Model Eğitimi

Sistemin çalışması için önce veritabanına doğrulanmış haber verisi yüklenmeli ve sınıflandırıcı modeli eğitilmelidir.


Kullanılan veri setleri:
- **Anadolu Ajansı (AA)** — doğrulanmış haberler (AUTHENTIC)
- **HaberTürk** — kategorilendirilmiş haberler(AUTHENTIC)
- **Teyit** — profesyonel doğrulama kuruluşu etiketleri (FAKE/AUTHENTIC)



Bu proje akademik ve araştırma amaçlı geliştirilmiştir.
