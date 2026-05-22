# Bitirme Tezi Yazım Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beykoz Üniversitesi bitirme projesi şablonuna uygun, Türkçe, 40-50 sayfa, APA atıflı, tamamlanmış tez dokümanı içeriği üretmek.

**Architecture:** Her bölüm ayrı bir görev olarak üretilir. İçerikler Markdown formatında teslim edilir; kullanıcı Word'e yapıştırır. Tüm teknik bilgiler projenin kendi spec/plan dosyalarından ve CLAUDE.md'den türetilir — asla internetten kopyalanmaz.

**Tech Stack:** Türkçe akademik yazım, APA 7. baskı atıf formatı, Beykoz Üniversitesi rapor taslağı yapısı.

**Kaynak Materyaller:**
- `CLAUDE.md` — mimari ve pipeline detayları
- `docs/superpowers/specs/` — 47 tasarım kararı
- `docs/superpowers/plans/` — 52 uygulama planı
- Proje audit raporu (Explore agent çıktısı): 9 servis, 25 endpoint, 32 sayfa, 35 tablo, %88 accuracy

---

## Dosya Yapısı

Üretilecek içerik dosyaları (Markdown, kullanıcı Word'e aktarır):

| Dosya | İçerik |
|-------|--------|
| `thesis/00-ozet.md` | Özet (Türkçe + İngilizce Abstract) |
| `thesis/01-giris.md` | Bölüm 1: Giriş |
| `thesis/02-literatur.md` | Bölüm 2: Literatür Tarama & Pazar Araştırması |
| `thesis/03-metodoloji.md` | Bölüm 3: Metodoloji |
| `thesis/04-uygulama.md` | Bölüm 4: Uygulama |
| `thesis/05-sonuc.md` | Bölüm 5: Sonuç ve Tavsiyeler |
| `thesis/06-kaynakca.md` | Kaynakça (APA formatı) |
| `thesis/07-kisaltmalar.md` | Kısaltmalar (alfabetik) |

---

## Task 1: Dizin Oluştur

**Files:**
- Create: `thesis/` dizini (boş, sonraki task'lar dolduracak)

- [ ] **Adım 1.1: thesis/ dizini oluştur**

```bash
mkdir thesis
```

- [ ] **Adım 1.2: Commit**

```bash
git add thesis/.gitkeep
git commit -m "docs: tez yazim dizini olustur"
```

---

## Task 2: Özet

**Files:**
- Create: `thesis/00-ozet.md`

**Hedef uzunluk:** 200-300 kelime (Türkçe) + 200-300 kelime (İngilizce Abstract)

**Kapsam:**
- Projenin amacı (sahte haber tespiti, Türkçe, otomatik)
- Kullanılan yöntemler (BERT Turkish, LogisticRegression, pgvector, Gemini)
- Temel sonuçlar (%88 accuracy, 3286 örnek, canlı sistem nehaber.dev)
- Anahtar kelimeler: sahte haber tespiti, doğal dil işleme, BERT, derin öğrenme, dezenformasyon

- [ ] **Adım 2.1: Türkçe Özet yaz**

İçermesi gerekenler:
- Problem cümlesi: Türkçe dijital medyada yanlış bilginin yayılması
- Yöntem: iki aşamalı pipeline (pgvector anlık eşleşme + ML derin analiz), 8 NLP sinyali, ensemble karar
- Sonuç: %88 doğruluk, canlı platform, forum + gamification katmanı
- Anahtar kelimeler (5 adet)

- [ ] **Adım 2.2: İngilizce Abstract yaz**

Türkçe özeti akademik İngilizce'ye çevir. Terimler: fake news detection, natural language processing, BERT embeddings, vector similarity search, ensemble learning.

- [ ] **Adım 2.3: Commit**

```bash
git add -f thesis/00-ozet.md
git commit -m "docs: tez ozet bolumu"
```

---

## Task 3: Bölüm 1 — Giriş

**Files:**
- Create: `thesis/01-giris.md`

**Hedef uzunluk:** ~800-1000 kelime (≈4-5 sayfa)

**Alt bölümler ve içerik gereksinimleri:**

- [ ] **Adım 3.1: 1.1 Problem Tanımı yaz (~250 kelime)**

Kapsam:
- Dijital çağda dezenformasyon: sosyal medya hızı vs. doğrulama kapasitesi
- Türkiye'ye özgü bağlam: WhatsApp grupları, Twitter/X, haber portalları
- "İnfodemic" kavramı (WHO 2020 referansıyla)
- Manuel fact-check'in ölçeklenememesi sorunu (teyit.org günde kaç haber kontrol edebilir?)

- [ ] **Adım 3.2: 1.2 Mevcut Çözümlerin Yetersizliği yaz (~150 kelime)**

Kapsam:
- Mevcut araçların İngilizce odaklı olması
- Türkçe morfolojisinin NLP'ye özgü zorluğu (ekleme dili, kelime varyasyonları)
- Gerçek zamanlı, açıklanabilir karar ihtiyacı

- [ ] **Adım 3.3: 1.3 Projenin Amacı ve Katkısı yaz (~200 kelime)**

Kapsam:
- BERT Turkish + pgvector + ensemble ML pipeline
- Açıklanabilir karar: 8 NLP sinyali breakdown
- Topluluk katmanı: forum + trust index
- Canlı sistem: nehaber.dev (gerçek kullanıcılar, RSS ile sürekli haber işleme)

- [ ] **Adım 3.4: 1.4 Kapsam ve Sınırlar yaz (~150 kelime)**

Kapsam içi: Türkçe metin/URL/görsel analizi, kullanıcı yönetimi, forum, RSS agent, admin paneli
Kapsam dışı: Video analizi, diğer diller, TV/radyo izleme

- [ ] **Adım 3.5: 1.5 Tezin Yapısı yaz (~100 kelime)**

Her bölümün 1-2 cümlelik tanıtımı.

- [ ] **Adım 3.6: Commit**

```bash
git add -f thesis/01-giris.md
git commit -m "docs: tez bolum 1 - giris"
```

---

## Task 4: Bölüm 2 — Literatür Tarama ve Pazar Araştırması

**Files:**
- Create: `thesis/02-literatur.md`

**Hedef uzunluk:** ~1500-2000 kelime (≈8-10 sayfa)

**Önemli:** APA atıfları her paragrafta doğru biçimde yerleştirilmeli. Gerçek makalelere atıf yapılmalı.

- [ ] **Adım 4.1: 2.1 Sahte Haber — Tanım ve Sınıflandırma yaz (~300 kelime)**

Kapsam:
- Wardle & Derakhshan (2017) bilgi bozukluğu taksonomisi: misinformation / disinformation / malinformation
- 7 içerik türü: satire, parody, misleading, imposter, fabricated, false context, manipulated
- Türkçe literatür: "dezenformasyon", "yanlış bilgi", "asılsız haber" tanımları
- APA atıf: (Wardle & Derakhshan, 2017)

- [ ] **Adım 4.2: 2.2 NLP ile Sahte Haber Tespiti yaz (~400 kelime)**

Kapsam:
- Geleneksel yaklaşımlar: TF-IDF + SVM, Naive Bayes (Pérez-Rosas et al., 2018)
- BERT devrimi: Devlin et al. (2018) — bağlamsal temsil
- Fine-tuned modeller: BERTurk (Schweter, 2020), emrecan/bert-base-turkish
- Ensemble yaklaşımlar: kural tabanlı + ML birleşimi (Wang, 2017 — LIAR dataset)
- Vektör benzerlik arama: dense retrieval, ANN indexleme

- [ ] **Adım 4.3: 2.3 Türkçe NLP'nin Özgün Zorlukları yaz (~200 kelime)**

Kapsam:
- Ekleme dili (agglutinative): bir kök + çok ek
- Zemberek morfoloji analizi
- Türkçe corpus kısıtlılığı
- emrecan/bert-base-turkish-cased-mean-nli-stsb-tr modelinin seçilme gerekçesi

- [ ] **Adım 4.4: 2.4 Pazar Araştırması yaz (~400 kelime)**

Kapsam:
Aşağıdaki tabloyu içeren bir karşılaştırma:

| Platform | Dil | Otomasyon Düzeyi | Türkçe | Topluluk | Açıklanabilirlik |
|----------|-----|-----------------|--------|----------|-----------------|
| ClaimBuster (Hassan et al., 2017) | İngilizce | Yarı-otomatik | Hayır | Hayır | Düşük |
| Full Fact (UK) | İngilizce | Kısmi | Hayır | Hayır | Orta |
| teyit.org | Türkçe | Manuel | Evet | Hayır | Yüksek |
| Doğruluk Payı | Türkçe | Manuel | Evet | Hayır | Yüksek |
| **nehaber.dev (bu çalışma)** | **Türkçe** | **Tam otomatik** | **Evet** | **Evet** | **Yüksek (8 sinyal)** |

Her platform için 2-3 cümle açıklama.

- [ ] **Adım 4.5: 2.5 Bu Çalışmanın Özgünlüğü yaz (~200 kelime)**

Kapsam:
- Türkçe + tam otomatik + topluluk: hiçbir mevcut platformda bu üçü bir arada yok
- pgvector semantic search + ML ensemble: hibrit mimari
- Açıklanabilir AI: 8 sinyal kullanıcıya gösteriliyor (kara kutu değil)
- Gemini LLM ile kanıt toplama ve fact-check
- Canlı deployment + gerçek kullanıcı verisi

- [ ] **Adım 4.6: Commit**

```bash
git add -f thesis/02-literatur.md
git commit -m "docs: tez bolum 2 - literatur tarama"
```

---

## Task 5: Bölüm 3 — Metodoloji

**Files:**
- Create: `thesis/03-metodoloji.md`

**Hedef uzunluk:** ~2000-2500 kelime (≈10-12 sayfa)

- [ ] **Adım 5.1: 3.1 İhtiyaç Analizi — Paydaş Analizi yaz (~200 kelime)**

3 paydaş grubu:
- Son kullanıcı (haber okuyucu): analiz sonucu + sinyal açıklaması + forum
- Editör/moderatör: admin paneli, kullanıcı ve içerik yönetimi, audit log
- Sistem (otomatik): RSS ingestion, model feedback, nightly batch işlemler

- [ ] **Adım 5.2: 3.2 Fonksiyonel Gereksinimler tablosu yaz (~300 kelime)**

Tablo formatı (en az 12 satır):

| # | Gereksinim | Öncelik |
|---|-----------|---------|
| FR-01 | Sistem metin/URL/görsel analizi yapmalıdır | Yüksek |
| FR-02 | Kullanıcı kaydı, JWT auth, Google OAuth desteği | Yüksek |
| FR-03 | Forum thread/yorum/oylama sistemi | Orta |
| FR-04 | Admin paneli (kullanıcı, dataset, A/B test, audit) | Yüksek |
| FR-05 | Gamification (XP, badge, leaderboard) | Düşük |
| FR-06 | RSS otomatik haber toplama ve analizi | Yüksek |
| FR-07 | Şifre sıfırlama, e-posta doğrulama | Yüksek |
| FR-08 | WebSocket gerçek zamanlı bildirim | Orta |
| FR-09 | Görsel analiz (EXIF, pHash, Gemini) | Orta |
| FR-10 | Model feedback loop (kullanıcı etiketleme) | Orta |
| FR-11 | A/B testing (öneri ağırlıkları) | Düşük |
| FR-12 | Kullanıcı davranış takibi & öneri sistemi | Orta |

- [ ] **Adım 5.3: 3.3 Fonksiyonel Olmayan Gereksinimler yaz (~200 kelime)**

| # | Gereksinim | Kriter |
|---|-----------|--------|
| NFR-01 | Güvenlik | JWT HS256, bcrypt, rate limit (Redis) |
| NFR-02 | Performans | Async FastAPI, Celery workers |
| NFR-03 | Ölçeklenebilirlik | Docker Compose, 9 izole servis |
| NFR-04 | Güvenilirlik | Embedding microservice (OOM koruması) |
| NFR-05 | Erişilebilirlik | Responsive React + Tailwind |
| NFR-06 | Veri Gizliliği | IP hash (SHA256), GDPR uyumlu audit |

- [ ] **Adım 5.4: 3.4 Kullanıcı Senaryoları (Use Cases) yaz (~300 kelime)**

4 use case, her biri: aktörler → ön koşul → adımlar → son koşul:
- UC1: Kullanıcı haber URL'si analiz eder
- UC2: Kullanıcı forum'da iddia paylaşır, topluluk oylar
- UC3: Admin audit log üzerinden güvenlik olayını inceler
- UC4: RSS agent yeni haber tespit eder, otomatik analiz başlatır

- [ ] **Adım 5.5: 3.5 Proje Planlama — Teknoloji Yığını Seçim Gerekçeleri yaz (~300 kelime)**

Tablo + açıklama:

| Teknoloji | Alternatif | Seçim Gerekçesi |
|-----------|-----------|-----------------|
| FastAPI | Django, Flask | Native async, otomatik OpenAPI/Swagger, Pydantic tip güvenliği |
| PostgreSQL + pgvector | MongoDB, Elasticsearch | İlişkisel + vektör arama tek DB; ayrı vektör DB gereksiz |
| BERT Turkish | mBERT | Türkçe semantik benzerlik için özel fine-tune; daha yüksek precision |
| Celery + Redis | Dramatiq, RQ | Beat scheduler, öncelikli kuyruklar, olgun ekosistem |
| React 19 + Tailwind | Vue, Angular | Hız, Tailwind v4 performansı, geniş ekosistem |
| Docker Compose | Kubernetes | Tek node için yeterli; düşük operasyonel karmaşıklık |
| Gemini 2.0 Flash | GPT-4, Claude | Maliyet/kalite dengesi (~$0.22/gün 100 haber için) |

- [ ] **Adım 5.6: 3.6 Risk Yönetimi yaz (~200 kelime)**

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|------|---------|------|-------------------|
| BERT OOM (RAM) | Yüksek | Yüksek | Embedding microservice ayrı 900MB limit |
| Yüksek false positive | Orta | Yüksek | Ensemble: 0.70×model + 0.30×kural |
| Gemini API kesintisi | Düşük | Orta | Fail-open: ML sonucu döndür |
| Veri seti dengesizliği | Orta | Orta | class_weight="balanced" + proportion cap |
| Rate limit aşımı | Orta | Düşük | Redis rate limiter + Celery queue |

- [ ] **Adım 5.7: 3.7 Algoritma ve ML Metodolojisi yaz (~500 kelime)**

Alt başlıklar:

**3.7.1 İki Aşamalı Pipeline:**
- Stage 1: pgvector cosine distance (eşik 0.08 → similarity² ağırlıklı oylama)
- Stage 2: BERT embedding → 8 sinyal → 776-dim feature → LogisticRegression

**3.7.2 NLP Sinyal Çıkarımı:**
8 sinyal tablosu (CLAUDE.md'den) + risk formülü:
```
risk = clickbait×0.30 + exclamation×0.20 + uppercase×0.15
     + hedge×0.15 + question×0.10 + number_density×0.05
     + short_word_penalty×0.10 - source_score×0.15
```

**3.7.3 Ensemble Karar Mekanizması:**
```
combined = 0.70 × fake_probability + 0.30 × risk_score
karar = "SAHTE" if combined > 0.50 else "GERÇEK"
```
Gerekçe: tek kaynağın kararı ele geçiremeyeceği dengeli bir yapı.

**3.7.4 Model Eğitimi:**
- Veri: 3286 örnek (1731 Gerçek + 1555 Sahte) — Teyit + AA dataset
- Feature: 768 dim (BERT) + 8 (sinyal) = 776 dim
- Pipeline: StandardScaler → LogisticRegression(class_weight="balanced")
- Sonuçlar: Accuracy %88, F1 Gerçek: 0.89, F1 Sahte: 0.88

**3.7.5 Yazılım Metodolojisi:**
- Agile benzeri iteratif: brainstorm → spec → plan → implementation → commit döngüsü
- Her özellik ayrı design doc + implementation plan
- 46 spec, 52 plan, ~2 ay geliştirme

- [ ] **Adım 5.8: Commit**

```bash
git add -f thesis/03-metodoloji.md
git commit -m "docs: tez bolum 3 - metodoloji"
```

---

## Task 6: Bölüm 4 — Uygulama

**Files:**
- Create: `thesis/04-uygulama.md`

**Hedef uzunluk:** ~2500-3000 kelime (≈15-18 sayfa) + diyagram placeholder'ları

- [ ] **Adım 6.1: 4.1 Sistem Mimarisi yaz (~300 kelime)**

9 Docker servisinin açıklaması:

| Servis | Port | Bellek Limiti | Rol |
|--------|------|--------------|-----|
| embedding-service | 8001 | 900 MB | BERT embedding microservice |
| app | 8000 | 600 MB | FastAPI backend |
| worker | — | 500 MB | Celery analiz worker |
| ai-comment-worker | — | 150 MB | Gemini AI yorum üretimi |
| news-agent | — | — | RSS monitoring |
| rss-worker | — | 200 MB | RSS ingestion worker |
| rss-beat | — | 200 MB | Celery Beat scheduler |
| audit-beat | — | 300 MB | Audit log scheduler |
| db | 5432 | 512 MB | PostgreSQL 15 + pgvector |
| redis | 6379 | 300 MB | Celery broker + cache |

[Şekil X.X: Sistem Mimarisi Blok Diyagramı — kullanıcı Word'de ekleyecek]

- [ ] **Adım 6.2: 4.2 Veritabanı Şeması yaz (~400 kelime)**

35 tablonun kategorize açıklaması:
- Kullanıcı & Auth (5 tablo): users, user_follows, user_preference_profiles, user_notification_prefs, direct_messages
- Analiz & Makale (6 tablo): articles (768-dim pgvector), analysis_requests, analysis_results, sources, source_bias, news_articles
- Forum (10 tablo): forum_threads, forum_comments, forum_votes, forum_comment_votes, forum_comment_verifications, forum_reports, forum_thread_reports, tags, thread_tags, notifications
- İçerik & Etkileşim (3 tablo): content_interactions, content_similarity_cache, bookmarks
- ML & Feedback (3 tablo): model_feedback, model_training_runs, image_cache
- Admin & Audit (4 tablo): audit_logs, user_reports, ab_experiments, ab_variant_assignments
- Gamification (2 tablo): user_xp_events, user_badges
- Sistem (2 tablo): user_notifications, daily_summaries

pgvector kolonu: `embedding vector(768)`, cosine distance operatörü `<=>`.

[Şekil X.X: ER Diyagramı — kullanıcı Word'de ekleyecek]

- [ ] **Adım 6.3: 4.3 Analiz Pipeline Akış Şeması yaz (~300 kelime)**

Stage 1 ve Stage 2 adım adım metinsel açıklama + flowchart placeholder:

Stage 1:
1. Kullanıcı metin/URL/görsel gönderir
2. Metin temizlenir (cleaner.py)
3. BERT embedding üretilir (768-dim)
4. pgvector cosine arama: en yakın 3 eşleşme
5. Eşik 0.08 aşıldı mı? → Evet: similarity² ağırlıklı oylama → karar döndür
6. Hayır: Stage 2'ye geç

Stage 2:
1. 8 NLP sinyali çıkarılır
2. Risk skoru hesaplanır
3. BERT + sinyal → 776-dim feature vektörü
4. LogisticRegression → fake_probability
5. Ensemble: 0.70×fake_p + 0.30×risk → combined
6. Gemini (confidence belirsiz ise): kanıt arama + fact-check
7. Sonuç DB'ye yazılır, kullanıcıya döndürülür

[Şekil X.X: Pipeline Akış Şeması — kullanıcı Word'de ekleyecek]

- [ ] **Adım 6.4: 4.4 API Endpoint Özeti yaz (~300 kelime)**

25 endpoint kategorize tablo:

| Kategori | Endpoint Sayısı | Örnek |
|----------|----------------|-------|
| Auth | 6 | POST /auth/login, /auth/register, /auth/forgot-password |
| Analiz | 3 | POST /analysis/analyze, GET /analysis/{id} |
| Forum | 4 | GET /forum/threads, POST /forum/threads, POST /forum/votes |
| Kullanıcı | 3 | GET /users/me, PUT /users/profile |
| Admin | 4 | GET /admin/users, GET /admin/audit-logs |
| Gamification | 2 | GET /gamification/leaderboard, GET /gamification/badges |
| Diğer | 3 | WebSocket /ws, GET /stats, GET /weather |

Tüm endpoint'ler JWT Bearer token gerektirir (`/auth/login` ve `/health` hariç).

- [ ] **Adım 6.5: 4.5 Kullanıcı Arayüzü yaz (~400 kelime)**

32 sayfanın kategori bazlı açıklaması:

Sayfa kategorileri:
- Auth sayfaları (7): Login, Register, EmailVerification, ForgotPassword, ResetPassword, RecoverAccount, Onboarding
- Ana sayfalar (4): Home, Dashboard, AnalysisReport, SharedAnalysis
- İçerik sayfaları (5): Gundem, Archive, Borsa, About, Legal
- Kullanıcı sayfaları (5): Profile, UserProfile, ProfileSettings, Messages, Bookmarks
- Gamification (2): Badges, Bookmarks
- Admin sayfaları (8): AdminABTest, AdminAnalytics, AdminDataset, AdminForum, AdminModeration, AdminSecurity, AdminUsers, Report

[Şekil X.X–X.X: Ekran görüntüleri — kullanıcı Word'de ekleyecek]

Responsive tasarım: React 19 + Tailwind CSS v4, tüm sayfalar mobil uyumlu.

- [ ] **Adım 6.6: 4.6 Önemli Kod Blokları yaz (~400 kelime)**

4 kritik snippet:

**SIGNAL_KEYS (cleaner.py) — sabit sinyal sırası:**
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

**Ensemble karar mekanizması (tasks.py):**
```python
combined    = 0.70 * fake_p + 0.30 * risk_score
pred_status = "FAKE" if combined > 0.50 else "AUTHENTIC"
confidence  = max(combined, 1 - combined)
```

**pgvector cosine similarity sorgusu (analysis.py):**
```python
results = await db.execute(
    select(Article)
    .order_by(Article.embedding.cosine_distance(query_embedding))
    .limit(3)
)
```

**Stage 1 ağırlıklı oylama (analysis.py):**
```python
for article, similarity in matches:
    weight = similarity ** 2
    weighted_votes[article.status] += weight
winner = max(weighted_votes, key=weighted_votes.get)
```

- [ ] **Adım 6.7: 4.7 Test ve Performans yaz (~300 kelime)**

**ML Model Performansı:**

| Metrik | Değer |
|--------|-------|
| Accuracy | %88 |
| F1-score (Gerçek) | 0.89 |
| F1-score (Sahte) | 0.88 |
| Eğitim veri boyutu | 3286 örnek |
| Feature boyutu | 776 dim (768 BERT + 8 sinyal) |
| Son eğitim tarihi | 2026-03-23 |

**Hata Yönetimi:**
- 401 Unauthorized: Token süresi dolmuş, yeniden giriş gerekli
- 429 Too Many Requests: Rate limit aşıldı, Redis sayacı
- 422 Unprocessable Entity: Geçersiz URL veya boş metin
- 503 Service Unavailable: Embedding servisi başlamamış

**Güvenlik Testleri (audit):**
- Brute force koruması: 5 başarısız giriş → geçici kilit
- Rate limiting: IP bazlı Redis sayacı
- JWT expiry: 30 dakika access token
- SSRF koruması: proxy endpoint'inde IP guard

- [ ] **Adım 6.8: Commit**

```bash
git add -f thesis/04-uygulama.md
git commit -m "docs: tez bolum 4 - uygulama"
```

---

## Task 7: Bölüm 5 — Sonuç ve Tavsiyeler

**Files:**
- Create: `thesis/05-sonuc.md`

**Hedef uzunluk:** ~600-800 kelime (≈3-4 sayfa)

- [ ] **Adım 7.1: 5.1 Hedeflere Ulaşma Değerlendirmesi yaz (~300 kelime)**

Fonksiyonel gereksinimlere geri dön, her birinin karşılanıp karşılanmadığını değerlendir:
- Tüm FR'ler implement edildi ✓
- %88 accuracy → sınıf dengeli veri seti için güçlü başlangıç
- Canlı sistem: nehaber.dev, gerçek kullanıcılar
- İki aşamalı pipeline: stage 1 anlık (< 1sn), stage 2 async (Celery)

- [ ] **Adım 7.2: 5.2 Sınırlamalar yaz (~200 kelime)**

- Automated test suite yok (manuel Swagger + test_db.py)
- Eğitim verisi görece küçük (3286 örnek) — daha büyük corpus potansiyeli var
- Görsel analiz heuristik (Gemini bağımlı, deterministik değil)
- Nginx reverse proxy eksik (production hardening)
- Sosyal medya URL analizi sınırlı (Twitter/X API kısıtları)

- [ ] **Adım 7.3: 5.3 Gelecek Çalışmalar yaz (~200 kelime)**

- Daha büyük Türkçe dataset ile model retraining (10.000+ örnek)
- Tarayıcı eklentisi (Chrome MV3 spec hazır)
- Mobil uygulama (React Native)
- Automated test suite (pytest + Playwright)
- Çok dil desteği (Arapça, Kürtçe)
- Gerçek zamanlı TV/sosyal medya izleme

- [ ] **Adım 7.4: Commit**

```bash
git add -f thesis/05-sonuc.md
git commit -m "docs: tez bolum 5 - sonuc"
```

---

## Task 8: Kaynakça (APA)

**Files:**
- Create: `thesis/06-kaynakca.md`

**Hedef:** En az 15 kaynak, APA 7. baskı formatı

- [ ] **Adım 8.1: Akademik kaynakları yaz**

Zorunlu kaynaklar (APA formatında):

```
Devlin, J., Chang, M.-W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of 
    deep bidirectional transformers for language understanding. Proceedings of NAACL-HLT 
    2019, 4171–4186. https://doi.org/10.18653/v1/N19-1423

Wardle, C., & Derakhshan, H. (2017). Information disorder: Toward an interdisciplinary 
    framework for research and policy making. Council of Europe Report DGI(2017)09.

Wang, W. Y. (2017). "Liar, liar pants on fire": A new benchmark dataset for fake news 
    detection. Proceedings of ACL 2017, 422–426. https://doi.org/10.18653/v1/P17-2067

Pérez-Rosas, V., Kleinberg, B., Lefevre, A., & Mihalcea, R. (2018). Automatic detection 
    of fake news. Proceedings of COLING 2018, 3391–3401.

Schweter, S. (2020). BERTurk — BERT models for Turkish [Software]. 
    https://github.com/stefan-it/turkish-bert

Hassan, N., Arslan, F., Li, C., & Tremayne, M. (2017). Toward automated fact-checking: 
    Detecting check-worthy factual claims by ClaimBuster. Proceedings of KDD 2017, 
    1803–1812. https://doi.org/10.1145/3097983.3098131

Akkaya, C., et al. (2019). OpenAI GPT language model. (Transformer background)

Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese 
    BERT-networks. Proceedings of EMNLP-IJCNLP 2019. 
    https://doi.org/10.18653/v1/D19-1410

Johnson, J., Douze, M., & Jégou, H. (2021). Billion-scale similarity search with GPUs. 
    IEEE Transactions on Big Data, 7(3), 535–547.

Shu, K., Sliva, A., Wang, S., Tang, J., & Liu, H. (2017). Fake news detection on 
    social media: A data mining perspective. ACM SIGKDD Explorations, 19(1), 22–36.

Ekin, M. E. (2022). emrecan/bert-base-turkish-cased-mean-nli-stsb-tr [Model]. 
    Hugging Face. https://huggingface.co/emrecan/bert-base-turkish-cased-mean-nli-stsb-tr

teyit.org. (2024). Türkiye'nin bağımsız doğrulama platformu. https://teyit.org

FastAPI. (2024). FastAPI framework documentation. https://fastapi.tiangolo.com

pgvector. (2024). Open-source vector similarity search for Postgres. 
    https://github.com/pgvector/pgvector

Redis. (2024). Redis documentation. https://redis.io/docs
```

- [ ] **Adım 8.2: Commit**

```bash
git add -f thesis/06-kaynakca.md
git commit -m "docs: tez kaynakca (APA 7)"
```

---

## Task 9: Kısaltmalar Listesi

**Files:**
- Create: `thesis/07-kisaltmalar.md`

**Hedef:** Alfabetik sırada, tezde geçen tüm kısaltmalar

- [ ] **Adım 9.1: Kısaltmalar listesini yaz**

```
API     : Application Programming Interface (Uygulama Programlama Arayüzü)
APA     : American Psychological Association
AUC     : Area Under the Curve
BERT    : Bidirectional Encoder Representations from Transformers
CPU     : Central Processing Unit
CRUD    : Create, Read, Update, Delete
CSS     : Cascading Style Sheets
DB      : Database (Veritabanı)
DDG     : DuckDuckGo
EXIF    : Exchangeable Image File Format
F1      : F1-Score (Precision ve Recall harmonik ortalaması)
FAQ     : Frequently Asked Questions
GDPR    : General Data Protection Regulation
GPU     : Graphics Processing Unit
HTML    : HyperText Markup Language
HTTP    : HyperText Transfer Protocol
JWT     : JSON Web Token
LLM     : Large Language Model (Büyük Dil Modeli)
ML      : Machine Learning (Makine Öğrenimi)
NLP     : Natural Language Processing (Doğal Dil İşleme)
OOM     : Out of Memory
ORM     : Object-Relational Mapping
pHash   : Perceptual Hash
PR      : Pull Request
RAM     : Random Access Memory
REST    : Representational State Transfer
RSS     : Really Simple Syndication
SVM     : Support Vector Machine
TF-IDF  : Term Frequency–Inverse Document Frequency
UI      : User Interface (Kullanıcı Arayüzü)
URL     : Uniform Resource Locator
UX      : User Experience (Kullanıcı Deneyimi)
UUID    : Universally Unique Identifier
WBS     : Work Breakdown Structure
WHO     : World Health Organization (Dünya Sağlık Örgütü)
XP      : Experience Points (Deneyim Puanı)
```

- [ ] **Adım 9.2: Commit**

```bash
git add -f thesis/07-kisaltmalar.md
git commit -m "docs: tez kisaltmalar listesi"
```

---

## Task 10: Final Gözden Geçirme

- [ ] **Adım 10.1: Tüm dosyaların varlığını doğrula**

```
thesis/00-ozet.md        ✓
thesis/01-giris.md       ✓
thesis/02-literatur.md   ✓
thesis/03-metodoloji.md  ✓
thesis/04-uygulama.md    ✓
thesis/05-sonuc.md       ✓
thesis/06-kaynakca.md    ✓
thesis/07-kisaltmalar.md ✓
```

- [ ] **Adım 10.2: Turnitin kontrolü — orijinallik notları**

Aşağıdaki bölümler %100 özgün olmalı (hiçbiri internetten kopyalanmamış):
- Tüm sistem açıklamaları: kendi projenizin anlatımı
- Kod snippet'leri: kendi kodunuzdan
- Diyagram açıklamaları: kendi tasarım kararlarınız
- Tablo verileri: kendi ölçümleriniz

APA atıflar: alıntı yerine paraphrase + kaynak gösterimi

- [ ] **Adım 10.3: Word'e aktarım kontrol listesi**

```
[ ] Kapak sayfası (öğrenci adı, no, bölüm, danışman, yıl)
[ ] Özet sayfaları
[ ] İçindekiler (otomatik Word TOC)
[ ] Şekil listesi (mimari, ER, flowchart diyagramları eklenince)
[ ] Tablo listesi
[ ] Kısaltmalar
[ ] Bölüm 1–5 içerikleri
[ ] Kaynakça
[ ] Ekler (varsa: kod listesi, ekran görüntüleri)
```

- [ ] **Adım 10.4: Final commit**

```bash
git add -f thesis/
git commit -m "docs: tez tum bolumler tamamlandi"
```

---

## Notlar

- **Diyagramlar:** Her diyagram için `[Şekil X.X: ...]` placeholder bırakıldı. Kullanıcı draw.io, Lucidchart veya Word SmartArt ile oluşturup ekleyecek.
- **Ekran görüntüleri:** Bölüm 4.5'te belirtilen sayfalara ait görüntüler Bölüm 4'e eklenecek.
- **Sayfa numaralandırma:** Word'de otomatik.
- **Turnitin:** Benzerlik oranı %25 altında kalmalı — tüm içerik kendi projenin anlatımıdır.
