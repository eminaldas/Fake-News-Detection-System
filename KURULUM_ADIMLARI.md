# Fake News Detection System (FNDS) - Kurulum ve Geliştirme Adımları

Bu belgede proje için şu ana kadar gerçekleştirilen kurulum ve geliştirme adımları listelenmektedir.

## 1. Aşama: Altyapı ve Veri Tabanı Kurulumu
- **Proje Dizin Yapısı:** `app`, `scrapers`, `ml_engine` ve `workers` klasörleri (ve alt modülleri) oluşturuldu.
- **Docker ve Orkestrasyon:** 
  - `docker-compose.yml` dosyası oluşturuldu. PostgreSQL (`pgvector` destekli) ve Redis servisleri yapılandırıldı.
  - `Dockerfile` ile FastAPI backend ve Worker (Celery) için ortak bir konteyner imajı tanımlandı.
- **Bağımlılıklar (Requirements):** FastAPI, SQLAlchemy, asyncpg, Celery, Redis ve Makine Öğrenmesi (Transformers, Spacy vb.) kütüphaneleri `requirements.txt` dosyasına eklendi. (İlerleyen süreçte çıkan `bcrypt` ve `python-multipart` paket uyuşmazlıkları giderildi).
- **Veri Tabanı Modelleri:** SQLAlchemy 2.0 asenkron yapısı ile `Articles` (UUID ve Vector embedding dahil) ve `Sources` tabloları (`app/models/models.py`) Pydantic / SQLAlchemy kullanılarak oluşturuldu.

## 2. Aşama: API Katmanı, Güvenlik ve Asenkron Görevler
- **Kimlik Doğrulama (Auth):** `app/core/security.py` içerisinde JWT tabanlı token üretim ve doğrulama fonksiyonları ile şifreleme altyapısı kuruldu. Kullanıcıların token alabilmesi için `POST /api/v1/auth/login` endpoint'i yazıldı.
- **Veri Doğrulama ve Güvenlik:** `app/schemas/schemas.py` içerisine, SQL Enjeksiyonu ve XSS saldırılarına karşı temel metin temizleme (sanitization) işlemleri yapan yardımcı fonksiyonlar ve Pydantic modelleri eklendi.
- **Asenkron Görev Yönetimi:** 
  - `workers/tasks.py` oluşturularak Celery konfigürasyonu yapıldı. Redis broker olarak bağlandı ve analiz işlemleri asenkron olarak arka planda çalışacak şekilde (`analyze_article` task'i) sınırlandırıldı.
  - `POST /api/v1/analysis/analyze` (görevi kuyruğa ekler ve task_id döner) ve `GET /api/v1/analysis/status/{task_id}` (görev durumunu kontrol eder) endpoint'leri eklendi.
- **Ana Uygulama (Main):** Tüm bu alt rotalar (router'lar) `app/main.py` içerisine aktarıldı, CORS ayarları yapıldı ve Swagger UI dokümantasyonu yayınlandı.
