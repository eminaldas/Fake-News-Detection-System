# BÖLÜM 4: UYGULAMA

## 4.1 Sistem Mimarisi

Platform, birbirinden bağımsız sorumluluklara sahip dokuz Docker servisinden oluşan bir mikro-servis mimarisiyle hayata geçirilmiştir. Docker Compose orkestrasyon aracı olarak kullanılmış; her servise bellek limiti tanımlanmış ve kaynak rekabeti önlenmiştir.

**Tablo 4.1.** Docker servisleri

| Servis | Port | Bellek Limiti | Rol |
|--------|------|--------------|-----|
| embedding-service | 8001 | 900 MB | BERT Turkish modeli; /embed HTTP endpoint'i sunar |
| app | 8000 | 600 MB | FastAPI backend; tüm API endpoint'lerini barındırır |
| worker | — | 500 MB | Celery analiz worker; analiz ve deep_report kuyruklarını işler |
| ai-comment-worker | — | 150 MB | Gemini AI yorum üretimi; ai_comment kuyruğunu işler |
| news-agent | — | — | RSS monitoring; 65 kaynaktan besleme izler |
| rss-worker | — | 200 MB | RSS ingestion worker; rss kuyruğunu işler |
| rss-beat | — | 200 MB | Celery Beat zamanlayıcı; günde 6 kez RSS görevini tetikler |
| audit-beat | — | 300 MB | Denetim günlüğü zamanlayıcı; periyodik flush ve temizlik |
| db | 5432 | 512 MB | PostgreSQL 15 + pgvector; veri kalıcılığı ve vektör araması |
| redis | 6379 | 300 MB | Celery broker/backend; oturum cache ve rate limit sayaçları |

Embedding servisini ana uygulamadan ayırmanın temel gerekçesi bellek yönetimidir. BERT modeli 600–900 MB RAM tüketmekte; bu yükü ana servise dahil etmek, analiz worker'ı için yeterli bellek kalmamasına neden olmaktaydı. Bağımsız bir HTTP microservice olarak çalıştırılması, her iki servisin de kendi bellek bütçesi içinde kalmasını sağlamaktadır.

*[Şekil 4.1: Sistem Mimarisi Blok Diyagramı — servisler arası veri akışını gösterir]*

## 4.2 Veritabanı Şeması

Veritabanı olarak PostgreSQL 15 kullanılmış; pgvector uzantısıyla vektör benzerlik araması yerel SQL sorguları içinde mümkün kılınmıştır. Toplam 35 tablo, işlevsel gruplara ayrılmıştır.

### 4.2.1 Kullanıcı ve Kimlik Doğrulama Tabloları

`users` tablosu sistemin merkezi varlığıdır. Kullanıcı adı, e-posta, bcrypt hashlenmiş parola, Google OAuth kimliği, forum trust tier, XP puanı ve seviye bilgilerini barındırmaktadır. `user_follows` takip ilişkisini, `user_preference_profiles` kişiselleştirme için kategori ağırlıklarını ve kullanıcı tercihlerini, `user_notification_prefs` bildirim tercihlerini, `direct_messages` ise özel mesajlaşma kayıtlarını tutmaktadır.

### 4.2.2 Analiz ve İçerik Tabloları

`articles` tablosu, bilgi tabanının temelini oluşturmaktadır. Her kayıt, 768 boyutlu BERT gömme vektörü (`embedding vector(768)`) ve doğrulama durumu (SAHTE/GERÇEK) içermektedir. Cosine benzerlik araması `<=>` operatörüyle gerçekleştirilmektedir.

`analysis_requests` kullanıcının gönderdiği ham içeriği (metin/URL/görsel), `analysis_results` ise pipeline'ın ürettiği karar, güven skoru, NLP sinyal dökümleri, Gemini açıklaması ve tam raporu saklamaktadır. `news_articles` tablosu, RSS kaynaklı haberleri içermekte ve her kayıt bir kategori, küme kimliği ve NLP skoru taşımaktadır.

### 4.2.3 Forum Tabloları

Forum modülü 10 tablodan oluşmaktadır: `forum_threads` (başlık, iddia türü, topluluk kararı), `forum_comments` (en fazla 3 derinlikli iç içe yanıtlar, moderasyon durumu), `forum_votes` (şüpheli/gerçek/araştırılmalı oyları), `forum_comment_votes`, `forum_comment_verifications`, `forum_reports`, `forum_thread_reports`, `tags`, `thread_tags` ve `notifications`.

### 4.2.4 ML ve Gamification Tabloları

`model_feedback` kullanıcı etiketlerini, `model_training_runs` her model eğitim çalışmasının başarım metriklerini, `image_cache` görsel analiz sonuçlarını (pHash, EXIF, Gemini) depolar. `user_xp_events` XP kazanım olaylarını, `user_badges` kullanıcı rozetlerini tutar.

### 4.2.5 Admin ve Denetim Tabloları

`audit_logs` güvenlik ve sistem olaylarını olay tipi, önem düzeyi ve ayrıntılarıyla birlikte saklar. `ab_experiments` ve `ab_variant_assignments` A/B testi altyapısını destekler.

*[Şekil 4.2: ER Diyagramı — tablo ilişkileri ve birincil/yabancı anahtarlar]*

## 4.3 Analiz Pipeline Akış Şeması

Kullanıcının bir analiz talebi göndermesiyle başlayan süreç aşağıdaki adımlarla ilerler:

**Birinci Aşama:**
1. Kullanıcı metin, URL veya görsel göndererek analiz başlatır
2. Metin temizleme (URL kaldırma, HTML ayıklama, Türkçe normalizasyon)
3. embedding-service HTTP endpoint'i üzerinden 768 boyutlu vektör üretimi
4. pgvector `<=>` operatörüyle bilgi tabanında en yakın 3 sonuç aranır
5. Cosine uzaklığı eşik değeri (0,08) karşılaştırılır
   - **Eşleşme varsa:** Benzerlik karesi ağırlıklı oylama → karar + güven skoru → yanıt döndürülür
   - **Eşleşme yoksa:** Stage 2'ye geçilir

**İkinci Aşama (Celery Worker):**
1. Analiz görevi kuyruğa eklenir
2. 8 NLP sinyali çıkarılır, risk skoru hesaplanır
3. BERT vektörü ve sinyal vektörü birleştirilerek 776 boyutlu öznitelik oluşturulur
4. StandardScaler normalizasyonu + LogisticRegression sınıflandırması
5. Ensemble hesaplaması: combined = 0,70 × fake_p + 0,30 × risk
6. Güven 0,40–0,65 aralığındaysa Gemini devreye girer: web kanıtı toplama + fact-check
7. Analiz sonucu veritabanına yazılır, WebSocket üzerinden kullanıcıya iletilir

*[Şekil 4.3: İki Aşamalı Pipeline Akış Şeması]*

## 4.4 API Endpoint Özeti

Platform, JWT kimlik doğrulama gerektiren 25 REST API endpoint'i ve bir WebSocket uç noktası sunmaktadır. `/auth/login`, `/auth/register` ve `/health` endpoint'leri kimlik doğrulama gerektirmez.

**Tablo 4.2.** API endpoint'leri

| Kategori | Adet | Örnek Endpoint'ler |
|----------|------|-------------------|
| Kimlik Doğrulama | 6 | POST /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password |
| Analiz | 3 | POST /analysis/analyze, GET /analysis/{id}, GET /analysis/history |
| Forum | 4 | GET /forum/threads, POST /forum/threads, POST /forum/votes, DELETE /forum/comments/{id} |
| Kullanıcı | 3 | GET /users/me, PUT /users/profile, GET /users/{username} |
| Admin | 4 | GET /admin/users, GET /admin/audit-logs, POST /admin/ab-experiments, GET /admin/stats |
| Gamification | 2 | GET /gamification/leaderboard, GET /gamification/badges |
| Diğer | 3 | WebSocket /ws, GET /stats/platform, GET /weather |

## 4.5 Kullanıcı Arayüzü

Frontend, React 19 ve Tailwind CSS v4 ile geliştirilmiş olup 32 sayfa ve bunlara ait bileşen ağacından oluşmaktadır. Vite build aracı kullanılmış; tüm sayfalar mobil, tablet ve masaüstü çözünürlüklere uyarlanmıştır.

**Kimlik Doğrulama Sayfaları (7 sayfa):** Giriş, kayıt, e-posta doğrulama, şifremi unuttum, şifre sıfırlama, hesap kurtarma ve yeni kullanıcı karşılama (onboarding) sayfaları yer almaktadır. Kayıt akışında yasal onay modalı bulunmakta; Google OAuth alternatif giriş seçeneği olarak sunulmaktadır.

**Ana Sayfalar (4 sayfa):** Anasayfa, dashboard, analiz raporu ve paylaşılmış analiz sayfaları temel kullanım senaryolarını karşılar. Dashboard, kullanıcının analiz geçmişini, topluluk istatistiklerini ve kişisel öneri akışını görüntüler.

**İçerik Sayfaları (5 sayfa):** Gündem sayfası RSS besleme verilerini kategorize biçimde listeler; analiz başlatma butonu her kart üzerinde mevcuttur. Borsa sayfası BIST ve döviz kuru verilerini widget olarak sunar.

**Kullanıcı Profili ve Mesajlaşma (5 sayfa):** Profil sayfası, kullanıcının analiz sayısı, forum katkısı, XP puanı ve rozetlerini tek ekranda sunar. Doğrudan mesajlaşma, yer işaretleri ve profil ayarları da bu gruba dahildir.

**Admin Paneli (8 sayfa):** AdminUsers (kullanıcı yönetimi), AdminAnalytics (platform istatistikleri), AdminModeration (forum denetim kuyruğu), AdminSecurity (güvenlik olayları), AdminDataset (model eğitim veri kümesi yönetimi), AdminForum, AdminABTest ve Rapor sayfalarından oluşmaktadır.

*[Şekil 4.4–4.9: Ekran görüntüleri — Giriş, Anasayfa, Analiz Sonucu, Forum, Profil, Admin Paneli]*

## 4.6 Proje Dizin Yapısı

Projenin kaynak kod organizasyonu işlevsel sorumluluklara göre ayrıştırılmıştır. Temel dizin yapısı aşağıda gösterilmektedir:

```
Fake-News-Detection-System/
├── app/                        # FastAPI backend
│   ├── api/v1/endpoints/       # 25 REST endpoint dosyası
│   ├── core/                   # Güvenlik, yapılandırma, loglama
│   ├── db/                     # Veritabanı oturumu, Redis
│   ├── models/                 # SQLAlchemy ORM modelleri (35 tablo)
│   └── schemas/                # Pydantic istek/yanıt şemaları
├── ml_engine/                  # Makine öğrenimi katmanı
│   ├── processing/
│   │   ├── cleaner.py          # SIGNAL_KEYS, metin ön işleme
│   │   └── stylometric.py      # Stilometrik özellikler
│   ├── models/
│   │   └── fake_news_classifier.pkl  # Eğitilmiş model
│   └── vectorizer.py           # BERT embedding üretimi
├── workers/                    # Celery async görev işçileri
│   ├── tasks.py                # Ana analiz pipeline
│   ├── agent_tasks.py          # RSS agent + fact-check
│   ├── image_analysis_task.py  # Görsel analiz
│   └── deep_report_task.py     # Derinlemesine rapor
├── scrapers/                   # Veri toplama
│   ├── rss_monitor.py          # RSS besleme izleme
│   └── web_scraper.py          # URL içerik çekme
├── scripts/                    # Yardımcı betikler
│   ├── train_classifier.py     # Model eğitimi
│   └── ingest_aa_data.py       # Veri seti yükleme
├── frontend/                   # React 19 + Tailwind CSS v4
│   └── src/
│       ├── pages/              # 32 sayfa bileşeni
│       └── components/         # Yeniden kullanılabilir bileşenler
├── docker-compose.yml          # 9 Docker servisi
└── requirements.txt            # Python bağımlılıkları
```

Bu yapı, her katmanın bağımsız olarak geliştirilebilmesini ve test edilebilmesini sağlamaktadır. Backend, ML katmanı ve frontend arasındaki bağımlılıklar API sözleşmesiyle sınırlandırılmıştır.

## 4.7 Önemli Kod Bileşenleri

### 4.7.1 SIGNAL_KEYS — Sinyal Sıra Sabiti

`ml_engine/processing/cleaner.py` dosyasında tanımlanan SIGNAL_KEYS listesi, eğitim ve çıkarım aşamalarında sinyal vektörünün sırasını garanti eder. Yeni bir sinyal eklenmesi durumunda hem bu liste hem de model yeniden eğitilmelidir:

```python
SIGNAL_KEYS = [
    "exclamation_ratio",
    "caps_ratio",
    "question_density",
    "clickbait_score",
    "hedge_ratio",
    "source_score",
    "avg_word_length",
    "number_density",
]
```

### 4.7.2 Ensemble Karar Mekanizması

`workers/tasks.py` dosyasındaki ensemble mantığı, model olasılığını ve kural skorunu dengeleyen ağırlıklı bir birleşim uygular:

```python
combined    = 0.70 * fake_p + 0.30 * risk_score
pred_status = "FAKE" if combined > 0.50 else "AUTHENTIC"
confidence  = max(combined, 1 - combined)
```

### 4.7.3 pgvector Cosine Benzerlik Sorgusu

`app/api/v1/endpoints/analysis.py` dosyasında Stage 1 araması şu şekilde gerçekleştirilmektedir:

```python
results = await db.execute(
    select(Article)
    .order_by(Article.embedding.cosine_distance(query_embedding))
    .limit(3)
)
```

### 4.7.4 Stage 1 Ağırlıklı Oylama

Birden fazla eşleşme bulunduğunda benzerlik karesi ağırlıklı oylama uygulanır; bu sayede yakın eşleşmeler üstel olarak daha fazla söz hakkı taşır:

```python
weighted_votes = {"FAKE": 0.0, "AUTHENTIC": 0.0}
for article, similarity in matches:
    weight = similarity ** 2
    weighted_votes[article.status] += weight
winner = max(weighted_votes, key=weighted_votes.get)
```

## 4.8 Test ve Performans

### 4.8.1 Model Performansı

**Tablo 4.3.** Sınıflandırıcı test sonuçları

| Metrik | Gerçek (AUTHENTIC) | Sahte (FAKE) | Ortalama |
|--------|-------------------|-------------|---------|
| Precision | 0,88 | 0,89 | 0,88 |
| Recall | 0,90 | 0,87 | 0,89 |
| F1-skoru | 0,89 | 0,88 | 0,88 |
| Doğruluk (Accuracy) | — | — | %88 |

Model, 3.286 örnekten oluşan dengeli test bölümünde %88 doğruluk oranına ulaşmıştır. Sınıf başına F1 değerlerinin birbirine yakın olması (0,89 ve 0,88), class_weight="balanced" parametresinin dengesiz sınıf dağılımını başarıyla telafi ettiğini göstermektedir.

### 4.8.2 API Hata Yönetimi

Sistem, kullanıcıya anlamlı geri bildirim sağlamak amacıyla HTTP standart hata kodlarını tutarlı biçimde kullanmaktadır:

| HTTP Kodu | Durum | Kullanıcıya Mesaj |
|-----------|-------|-------------------|
| 401 Unauthorized | Token süresi dolmuş | Oturumunuzun süresi doldu, lütfen tekrar giriş yapın |
| 422 Unprocessable Entity | Geçersiz URL veya boş metin | Lütfen geçerli bir metin veya URL giriniz |
| 429 Too Many Requests | Günlük analiz limiti aşıldı | Günlük analiz limitinize ulaştınız |
| 503 Service Unavailable | Embedding servisi başlamamış | Analiz servisi geçici olarak kullanılamıyor |

### 4.8.3 Güvenlik Testleri

Sistem, aşağıdaki güvenlik mekanizmaları manuel olarak test edilmiş ve doğrulanmıştır:

- **Kaba kuvvet koruması:** 5 ardışık başarısız giriş girişiminin ardından hesap geçici olarak kilitlenmektedir
- **Rate limiting:** Redis tabanlı IP başına sayaç; anonim kullanıcı günde 3, kayıtlı kullanıcı günde 20 analiz hakkına sahiptir
- **SSRF koruması:** Proxy endpoint'inde özel IP aralıklarına (RFC 1918) yönlendirme engellenmektedir
- **JWT güvenliği:** Access token 30 dakika, "beni hatırla" modu için 30 gün geçerliliğe sahiptir; her istekte veritabanı aktiflik kontrolü yapılmaktadır
