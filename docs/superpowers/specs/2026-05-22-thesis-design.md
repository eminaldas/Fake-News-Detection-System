# Bitirme Tezi — Tasarım Dokümanı

**Tarih:** 2026-05-22  
**Durum:** Onaylandı  
**Format:** Word (.docx) — öğrenci üretilecek dosyaya ekler  
**Şablon:** Beykoz Üniversitesi Bitirme Projesi Rapor Taslağı  
**Hedef uzunluk:** 40-50 sayfa  
**Atıf formatı:** APA  
**Turnitin limiti:** %25 benzerlik

---

## Proje Özeti (Tez için)

**Başlık:** Türkçe Sahte Haber Tespiti için BERT Tabanlı Hibrit Bir Sistem: nehaber.dev

**Kapsam:**
- FastAPI backend, React 19 frontend
- PostgreSQL 15 + pgvector (768-dim BERT embedding)
- İki aşamalı analiz pipeline (semantic search + deep ML)
- 8 NLP sinyali + ensemble model (%88 accuracy, 3286 örnek)
- Celery async worker sistemi (9 Docker servisi)
- Forum, gamification, RSS agent, Gemini fact-check entegrasyonu
- Canlı deployment: nehaber.dev

---

## Bölüm Tasarımı

---

### BÖLÜM 1: GİRİŞ (~4-5 sayfa)

**1.1 Problem Tanımı**
- Dijital çağda dezenformasyon ve "infodemic" kavramı
- Türkiye'de sosyal medya ve sahte haber yayılımı (istatistikler + kaynak)
- Manuel fact-check'in ölçeklenememesi

**1.2 Mevcut Çözümlerin Yetersizliği**
- Mevcut araçların İngilizce odaklı olması
- Otomasyonsuz, insan-bağımlı yaklaşımlar
- Gerçek zamanlı, Türkçe bir çözüm boşluğu

**1.3 Projenin Amacı ve Katkısı**
- Türkçe metinleri otomatik analiz eden platform
- Kullanıcıya açıklanabilir karar (8 sinyal breakdown)
- Topluluk katmanı (forum + trust index)
- Canlı sistem: nehaber.dev

**1.4 Kapsam ve Sınırlar**
- Kapsam içi: Türkçe metin/URL/görsel analizi, forum, RSS
- Kapsam dışı: Diğer diller, video analizi, gerçek zamanlı TV/radyo izleme

**1.5 Tezin Yapısı**
- Her bölümün kısa özeti

---

### BÖLÜM 2: LİTERATÜR TARAMA VE PAZAR ARAŞTIRMASI (~8-10 sayfa)

**2.1 Sahte Haber: Tanım ve Sınıflandırma**
- Wardle (2017) taksonomisi: fabricated, manipulated, imposter, satire, misleading, false context
- Türkçe literatürdeki tanımlar

**2.2 NLP ile Sahte Haber Tespiti**
- Transformer öncesi yaklaşımlar: TF-IDF + SVM, Naive Bayes
- BERT ve varyantları (Devlin et al., 2018)
- Türkçe BERT modelleri: BERTurk, emrecan/bert-base-turkish (seçilen model)
- Ensemble yaklaşımlar: kural tabanlı + model birleşimi

**2.3 pgvector ve Vektör Benzerlik Arama**
- Dense retrieval vs sparse retrieval
- Cosine similarity, ANN indexleme
- PostgreSQL ile pgvector entegrasyonu

**2.4 Pazar Araştırması**

| Platform | Dil | Otomasyon | Türkçe | Topluluk |
|----------|-----|-----------|--------|----------|
| ClaimBuster | İngilizce | Yarı | Hayır | Hayır |
| Full Fact | İngilizce | Kısmi | Hayır | Hayır |
| teyit.org | Türkçe | Manuel | Evet | Hayır |
| Doğruluk Payı | Türkçe | Manuel | Evet | Hayır |
| **nehaber.dev** | **Türkçe** | **Tam** | **Evet** | **Evet** |

**2.5 Bu Çalışmanın Özgünlüğü**
- Türkçe NLP pipeline + pgvector semantic search kombinasyonu
- Açıklanabilir karar (explainable AI — 8 sinyal)
- Forum + trust index ile topluluk doğrulaması
- Gemini LLM entegrasyonu ile kanıt toplama

---

### BÖLÜM 3: METODOLOJİ (~10-12 sayfa)

**3.1 İhtiyaç Analizi**

*3.1.1 Paydaş Analizi*
- Son kullanıcı (haber okuyucu): analiz sonucu + açıklama
- Editör/moderatör: admin paneli + içerik yönetimi
- Sistem: otomatik RSS ingestion + model güncelleme

*3.1.2 Fonksiyonel Gereksinimler*
- Metin / URL / görsel analizi
- Kullanıcı kaydı, JWT auth, Google OAuth
- Forum (thread, yorum, oylama)
- Admin paneli (kullanıcı, dataset, A/B test, audit log)
- Gamification (XP, badge, leaderboard)
- RSS otomatik haber toplama
- Şifremi unuttum, e-posta doğrulama

*3.1.3 Fonksiyonel Olmayan Gereksinimler*
- Güvenlik: JWT HS256, bcrypt, rate limiting (Redis), audit log
- Performans: async FastAPI, Celery workers, embedding microservice
- Ölçeklenebilirlik: Docker Compose, servis izolasyonu
- Erişilebilirlik: Responsive React + Tailwind CSS

*3.1.4 Kullanıcı Senaryoları (Use Cases)*
- UC1: Kullanıcı haber URL'i giriyor → sistem analiz ediyor → karar + sinyal breakdown döndürüyor
- UC2: Kullanıcı forum'da iddia paylaşıyor → topluluk oylama → trust tier güncelleniyor
- UC3: Admin sahte haber oranı istatistiklerini izliyor → audit log inceliyor
- UC4: RSS agent yeni haber tespit ediyor → otomatik embedding + analiz

**3.2 Proje Planlama**

*3.2.1 Proje Kapsamı (Scope Statement)*
- Yapılanlar: yukarıdaki tüm özellikler
- Yapılmayanlar: video analizi, mobil native app, çok dil desteği

*3.2.2 İş Kırılım Yapısı (WBS)*
Ana modüller:
1. ML Pipeline (BERT embedding, classifier, signals)
2. Backend API (auth, analysis, forum, admin, gamification)
3. Frontend (32 sayfa)
4. Veri Toplama (RSS, scraper, dataset ingestion)
5. Altyapı (Docker, Redis, PostgreSQL, pgvector)
6. Güvenlik (JWT, rate limit, audit)

*3.2.3 Gantt Chart*
- Hafta 1-4 (Mar 24 - Apr 13): Core pipeline, auth, RSS, NLP iyileştirme
- Hafta 5-8 (Apr 13 - May 1): Forum, deep report, evidence, gamification
- Hafta 9-12 (May 1 - May 21): UI polish, admin, settings, performance, bug fix
- (Görsel olarak Word'de tablo/Gantt eklenecek)

*3.2.4 Teknoloji Yığını Seçim Gerekçeleri*

| Teknoloji | Alternatif | Seçim Gerekçesi |
|-----------|-----------|-----------------|
| FastAPI | Django, Flask | Async destek, otomatik OpenAPI, tip güvenliği |
| PostgreSQL + pgvector | MongoDB, Elasticsearch | İlişkisel + vektör arama tek DB'de |
| BERT Turkish | mBERT, multilingual | Türkçe semantik benzerlik için özel fine-tune |
| Celery | Dramatiq, RQ | Olgun ekosistem, beat scheduler, öncelikli kuyruklar |
| React 19 + Tailwind | Vue, Angular | Hız, bileşen ekosistemi, Tailwind v4 performansı |
| Docker Compose | Kubernetes | Tek node için yeterli, düşük operasyonel karmaşıklık |

*3.2.5 Risk Yönetimi*

| Risk | Olasılık | Etki | Azaltma |
|------|---------|------|---------|
| BERT OOM (RAM) | Yüksek | Yüksek | Embedding microservice (izole 900MB) |
| False positive oranı | Orta | Orta | Ensemble (0.70 model + 0.30 kural) |
| Turnitin benzerlik | Düşük | Yüksek | Özgün sistem açıklaması, kendi diyagramlar |
| API rate limit aşımı | Orta | Düşük | Redis rate limiter, Celery queue |

**3.3 Algoritma ve ML Metodolojisi**

*3.3.1 İki Aşamalı Pipeline*
- Stage 1: pgvector cosine similarity (threshold 0.08 → direkt eşleşme)
- Stage 2: BERT embedding → 8 sinyal → 776-dim feature → LogisticRegression

*3.3.2 NLP Sinyal Çıkarımı*
- 8 sinyal tanımları ve risk formülü (CLAUDE.md'deki tablo)

*3.3.3 Ensemble ve Karar Mekanizması*
- `combined = 0.70 × fake_p + 0.30 × risk_score`
- Stage 1 multi-match oylama (similarity² ağırlıklı)

*3.3.4 Model Eğitimi*
- Veri: 3286 örnek (Teyit + AA dataset)
- Feature: 768 (BERT) + 8 (sinyal) = 776 dim
- Pipeline: StandardScaler → LogisticRegression(class_weight="balanced")
- Sonuç: %88 accuracy, F1 Authentic: 0.89, F1 Fake: 0.88

*3.3.5 Yazılım Metodolojisi*
- Agile benzeri iteratif geliştirme (46 spec → plan → implementation döngüsü)
- Her özellik: design doc → implementation plan → kod → commit

---

### BÖLÜM 4: UYGULAMA (~15-18 sayfa)

**4.1 Sistem Mimarisi**
- 9 Docker servisinin blok diyagramı
- Servisler arası veri akışı
- (Diyagram Word'e eklenecek)

**4.2 Veritabanı Şeması**
- 35 tablonun ER diyagramı (kategorize: user, analysis, forum, ml, admin)
- pgvector kolonu (768-dim) ve cosine search operatörü `<=>`
- (ER diyagramı Word'e eklenecek)

**4.3 Analiz Pipeline Akış Şeması**
- Stage 1 ve Stage 2 flowchart
- Celery task akışı

**4.4 API Endpoint Özeti**
- 25 endpoint kategorize tablo

**4.5 Kullanıcı Arayüzü**
- Ekran görüntüleri: Login, Anasayfa, Analiz Sonucu, Forum, Profil, Admin Panel
- Navigasyon haritası (hangi sayfa nereye bağlanıyor)
- Responsive tasarım (mobil/masaüstü)

**4.6 Önemli Kod Blokları**
- SIGNAL_KEYS ve risk formülü (`cleaner.py`)
- Ensemble karar mekanizması (`tasks.py`)
- pgvector cosine similarity sorgusu (`analysis.py`)
- BERT embedding endpoint (`vectorizer.py`)

**4.7 Test ve Performans**
- ML model accuracy tablosu (confusion matrix değerleri)
- Swagger UI üzerinden manuel test örnekleri
- Hata yönetimi (JWT expired, rate limit, invalid URL)

---

### BÖLÜM 5: SONUÇ VE TAVSİYELER (~3-4 sayfa)

**5.1 Hedeflere Ulaşma Değerlendirmesi**
- Tüm fonksiyonel gereksinimler karşılandı
- %88 accuracy (class-balanced, 3286 örnek)
- Canlı sistem: nehaber.dev, gerçek kullanıcılar

**5.2 Sınırlamalar**
- Automated test suite yok (manuel Swagger + test_db.py)
- Eğitim verisi görece küçük (3286 örnek)
- Görsel analiz heuristik (Gemini bağımlı)
- Nginx reverse proxy eksik (production hardening)

**5.3 Gelecek Çalışmalar**
- Daha büyük Türkçe dataset ile model retraining
- Tarayıcı eklentisi (Chrome/Firefox)
- Mobil uygulama
- Automated test suite (pytest)
- Çok dil desteği

---

## Üretim Planı

Tez içeriği bölüm bölüm üretilecek:

1. **Bölüm 1** — Giriş metni (TR, akademik dil)
2. **Bölüm 2** — Literatür ve pazar araştırması (TR, APA atıflı)
3. **Bölüm 3** — Metodoloji (tablo + metin, TR)
4. **Bölüm 4** — Uygulama (kod snippet + tablo + diyagram açıklamaları, TR)
5. **Bölüm 5** — Sonuç (TR)
6. **Özet** — 200-300 kelime (TR)
7. **Kaynakça** — APA formatı
8. **Kısaltmalar listesi** — alfabetik

Her bölüm için kullanıcı kapak/kişisel bilgilerini Word'de ekler.  
Diyagramlar (mimari blok, ER, flowchart) kullanıcı Word'de oluşturur veya draw.io/Mermaid ile üretilir.

---

## Notlar

- `.env` dosyası teze eklenmeyecek (credentials içeriyor)
- Turnitin için: kendi sistem açıklaması + kendi diyagramlar → benzerlik düşük kalır
- APA atıflar için: Devlin et al. (2018) BERT, Wardle (2017) fake news taxonomy, emrecan/BERT GitHub
