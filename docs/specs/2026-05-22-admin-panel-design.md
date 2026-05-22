# Admin Panel — Tam Yeniden Yapılandırma Tasarım Dokümanı

**Tarih:** 2026-05-22  
**Durum:** Onaylandı — Implementation planına hazır  
**Yaklaşım:** Özellik özellik (backend + frontend birlikte), temiz yeniden yapılandırma

---

## 1. Genel Bakış

Mevcut 7 parçalı admin alanı (AdminUsers, AdminSecurity, AdminAnalytics, AdminForum, AdminModeration, AdminDataset, AdminABTest) tek bir tutarlı, güvenlik odaklı, fütüristik dark-theme admin paneline dönüştürülür. Yeni yapı 6 sayfadan oluşur.

**Tasarım dili:**
- Renk: `#070f12` zemin, `#0d1a1f` kart yüzeyi, `#00e5a0` neon yeşil vurgu, `#ff5555` kritik kırmızı
- Font: `JetBrains Mono` — teknik etiketler, sayılar, tarihler, kod; `Inter` — başlıklar, açıklamalar
- Animasyon: `animate-ping` kırmızı/sarı nokta — kritik uyarı için sidebar badge
- Sidebar: sabit dikey, 200px genişlik, daraltılabilir (52px icon-only modu)

---

## 2. Veri Modeli Değişiklikleri

### 2.1 DB Migration (Alembic)

```sql
-- Migration 1: shadow ban
ALTER TABLE users
  ADD COLUMN is_shadow_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 2: ground truth override
ALTER TABLE model_feedback
  ADD COLUMN is_ground_truth BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 3: sistem konfigürasyon tablosu
CREATE TABLE system_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB        NOT NULL,
  updated_by UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

### 2.2 Mevcut Kullanılan Modeller

| Model | Kullanım Yeri |
|---|---|
| `User` | Users, Community (shadow ban, XP, badge) |
| `UserReport` | Content — ihbar havuzu |
| `Article` + `AnalysisResult` | Content — dataset / override |
| `ModelFeedback` (+ `is_ground_truth`) | Content — admin override → model eğitimi |
| `ModelTrainingRun` | AI Control — model performans geçmişi |
| `SourceBias` | AI Control — kaynak güven endeksi |
| `ForumComment` + `ForumThread` | Community — moderasyon kuyruğu |
| `AuditLog` | Security — log görüntüleme |
| `system_config` (yeni) | AI Control — global NLP tolerance |
| `AbExperiment` + `AbVariantAssignment` | AI Control — A/B testler |

---

## 3. Rota ve Dosya Yapısı

### 3.1 Silinecek Dosyalar

```
frontend/src/pages/AdminAnalytics.jsx
frontend/src/pages/AdminForum.jsx
frontend/src/pages/AdminModeration.jsx
frontend/src/pages/AdminDataset.jsx
frontend/src/pages/AdminABTest.jsx
```

### 3.2 Yeniden Yazılacak Dosyalar

```
frontend/src/pages/AdminUsers.jsx     (yerinde kalır, upgrade)
frontend/src/pages/AdminSecurity.jsx  (yerinde kalır, upgrade)
frontend/src/layouts/AdminSidebar.jsx (nav yapısı güncellenir)
frontend/src/App.jsx                   (route'lar güncellenir)
```

### 3.3 Yeni Dosyalar

```
frontend/src/pages/AdminDashboard.jsx   → /admin (index)
frontend/src/pages/AdminContent.jsx     → /admin/content
frontend/src/pages/AdminCommunity.jsx   → /admin/community
frontend/src/pages/AdminAIControl.jsx   → /admin/ai-control

app/api/v1/endpoints/admin_content.py
app/api/v1/endpoints/admin_community.py
app/api/v1/endpoints/admin_ai.py
app/db/migrations/versions/xxxx_admin_panel_fields.py
```

### 3.4 App.jsx Route Yapısı

```jsx
<Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
  <Route index                  element={<AdminDashboard />}  />
  <Route path="users"           element={<AdminUsers />}      />
  <Route path="content"         element={<AdminContent />}    />
  <Route path="community"       element={<AdminCommunity />}  />
  <Route path="ai-control"      element={<AdminAIControl />}  />
  <Route path="security"        element={<AdminSecurity />}   />
</Route>
```

### 3.5 AdminSidebar Nav Yapısı

```
GENEL
  ⬡  Ana Panel        /admin
  👥  Kullanıcılar    /admin/users

İÇERİK
  📋  İçerik          /admin/content       [badge: bekleyen ihbar sayısı]
  💬  Topluluk        /admin/community     [badge: moderasyon kuyruğu]

SİSTEM
  🤖  AI Kontrol      /admin/ai-control
  🛡  Güvenlik        /admin/security      [ping: kritik alert varsa]
```

---

## 4. Backend API Endpoint Haritası

### 4.1 admin.py (mevcut, genişletilir)

```
GET    /admin/users                         — liste (arama + filtre eklenir)
PATCH  /admin/users/{id}                    — rol/aktiflik
DELETE /admin/users/{id}                    — soft delete
POST   /admin/users/{id}/restore            — geri yükle
PATCH  /admin/users/{id}/shadow-ban         — YENİ: shadow ban toggle
PATCH  /admin/users/{id}/xp                 — YENİ: XP manuel düzeltme (delta: int)
POST   /admin/users/{id}/sessions/terminate — YENİ: Redis blacklist ile force logout
PATCH  /admin/users/{id}/badge              — YENİ: rozet ata/geri al (badge_key: str, action: "assign"|"revoke")
```

### 4.2 admin_content.py (yeni)

```
GET    /admin/content/reports               — ihbar havuzu, itibar puanına göre öncelikli
POST   /admin/content/reports/{id}/trigger  — analiz tetikle (Celery task)
POST   /admin/content/reports/{id}/dismiss  — asılsız işaretle
POST   /admin/articles/{id}/override        — ground truth override → model_feedback + audit
GET    /admin/articles                       — dataset listesi (status filtreli)
PATCH  /admin/articles/{id}/classify        — sınıflandırma
```

### 4.3 admin_community.py (yeni)

```
GET    /admin/community/queue               — moderasyon kuyruğu (toxicity + flag_type)
POST   /admin/forum/comments/{id}/approve  — onayla
POST   /admin/forum/comments/{id}/remove   — kaldır
GET    /admin/community/threads            — flagged thread listesi
```

### 4.4 admin_ai.py (yeni)

```
GET    /admin/ai/model/performance         — accuracy, training runs geçmişi
POST   /admin/ai/model/retrain             — retrain tetikle (Celery)
GET    /admin/ai/tolerance                 — global NLP tolerance oku (Redis → system_config)
PATCH  /admin/ai/tolerance                 — global NLP tolerance yaz + audit log
GET    /admin/ai/sources                   — source_bias listesi (sayfalı)
PATCH  /admin/ai/sources/{domain}          — source bias güncelle (input doğrulamalı)
GET    /admin/ab/experiments               — A/B test listesi (admin.py'den taşınır)
GET    /admin/ab/experiments/{id}/results  — A/B test sonuçları
POST   /admin/ab/experiments/{id}/conclude — test sonlandır
```

### 4.5 admin_logs.py (mevcut, genişletilir)

```
GET    /admin/logs/security                — mevcut
GET    /admin/logs/alerts                  — mevcut
GET    /admin/logs/analytics/daily         — mevcut
GET    /admin/logs/system/health           — mevcut
GET    /admin/stats/overview               — YENİ: dashboard 4 metrik
WS     /ws/admin/live-log                  — YENİ: canlı log stream (JWT doğrulamalı)
```

---

## 5. Güvenlik Mimarisi

### 5.1 Genel Kurallar

- Tüm `/admin/*` endpoint'leri `require_admin` dependency'si kullanır (mevcut, korunur)
- Tüm `/ws/admin/*` WebSocket bağlantıları upgrade sırasında JWT token doğrular; admin değilse bağlantı `403` ile kapatılır
- Destructive her işlem (shadow ban, ground truth override, tolerance değişikliği, force logout) `AuditLog`'a `severity=WARNING` ile yazılır
- UUID parametreleri FastAPI'nin native `UUID` tipi ile otomatik valide edilir — SQL injection riski sıfır (SQLAlchemy ORM parameterized queries)

### 5.2 Shadow Ban — Bilgi Sızması Önleme

`is_shadow_banned=True` kullanıcının yorumları:
- `GET /forum/threads/{id}/comments` endpoint'inde yalnızca `request.user.id == yorum.user_id` olduğunda döner
- Genel listelere, arama sonuçlarına, bildirim akışlarına dahil edilmez
- Kullanıcıya **hiç sinyal verilmez** — ban'ı görmüyor gibi davranır
- Ban toggle edildiğinde `AuditLog` + `audit_log()` helper kullanılır

### 5.3 Ground Truth Override

`POST /admin/articles/{id}/override`:
1. `model_feedback` tablosuna `is_ground_truth=True`, `submitted_label=verdict`, `user_id=admin.id` yazar
2. `AuditLog`'a `event_type=USER_ACTION`, `severity=WARNING`, `details={article_id, verdict, previous_status}` yazar
3. `Article.status` alanını günceller
4. Response'da `{"locked": true, "verdict": "...", "locked_by": admin.username}` döner

### 5.4 Global NLP Tolerance

- Redis anahtarı: `system:global_nlp_tolerance` (string, float değer)
- Değer yoksa default `0.5` kullanılır (Redis çökmesine karşı güvenli)
- `PATCH /admin/ai/tolerance` body: `{"value": 0.7}` — `Field(ge=0.0, le=1.0)` Pydantic doğrulaması
- Değişiklik `system_config` tablosuna ve `AuditLog`'a yazılır
- Worker'lar bu değeri her analizde Redis'ten okur; mevcut `workers/tasks.py`'de ilgili noktaya enjekte edilir

### 5.5 Force Session Terminate

`POST /admin/users/{id}/sessions/terminate`:
1. Redis'e `blacklist:user:{user_id}` anahtarı yazar, TTL = 1800s (30dk JWT expiry)
2. Mevcut JWT middleware bu listeyi kontrol eder; listede varsa `401 token_revoked` döner
3. `AuditLog`'a `severity=WARNING` ile kaydedilir

### 5.6 Live Console WebSocket

- `WS /ws/admin/live-log`
- Upgrade sırasında `?token=<jwt>` query parametresi veya `Authorization: Bearer` header'ı okunur
- Token geçersiz veya admin değilse `websocket.close(code=4003)` çağrılır
- Yayınlanan loglarda PII maskeleme: `user_id` → ilk 8 karakter + `...`, `ip_hash` → ilk 12 karakter + `...`
- Sadece `event_type IN ('SECURITY', 'SYSTEM')` olayları yayınlanır

### 5.7 Source Bias Input Doğrulaması (Çift Katman)

| Alan | Pydantic | DB CheckConstraint |
|---|---|---|
| `political_lean` | `Field(ge=-1.0, le=1.0)` | ✅ Mevcut |
| `factual_accuracy` | `Field(ge=0.0, le=1.0)` | ✅ Mevcut |
| `clickbait_tendency` | `Field(ge=0.0, le=1.0)` | ✅ Mevcut |
| `domain` | `Field(max_length=255)`, regex `^[a-z0-9.-]+$` | — |

---

## 6. Sayfa Detayları

### 6.1 AdminDashboard (`/admin`)

**Bileşenler:**
- `MetricGrid` (4 kart): Anlık Aktif Kullanıcı (WebSocket bağlantı sayısı), Kuyruktaki Analizler (Celery), 24s Dezinformasyon Oranı, Kritik İhbarlar (pending UserReport sayısı)
- `RPSChart`: Son 60 saniyeye ait istek yoğunluğu, bar grafik, 5s polling
- `AIDecisionDonut`: Son 7 gün model karar dağılımı (AUTHENTIC/FAKE/unverified), CSS conic-gradient
- `RecentAnalysesFeed`: Son 5 analiz (10s polling — WebSocket bağlantısı karmaşıklığı haklı kılmaz)
- `CriticalReportsFeed`: Bekleyen en öncelikli 5 ihbar (itibar puanına göre)

**Veri kaynağı:** `GET /admin/stats/overview`

### 6.2 AdminUsers (`/admin/users`)

**Mevcut özelliklere ek:**
- Arama (username/email)
- Shadow ban toggle (kırmızı göz ikonu, tek tıkla, confirm dialog)
- XP manuel düzeltme (±delta input, `PATCH /admin/users/{id}/xp`)
- Rozet atama (badge listesi dropdown, `POST /admin/users/{id}/badge`)
- Force logout butonu (`POST /admin/users/{id}/sessions/terminate`)
- Tüm aksiyonlar onay dialogu gerektirir

### 6.3 AdminContent (`/admin/content`)

**İki sekme:**

*İhbar Havuzu:*
- `UserReport` listesi, `forum_trust_score`'a göre önceliklendirilmiş
- `forum_trust_score > 70` → kırmızı ⚠️ badge (yüksek öncelik)
- Aksiyon butonları: `[Analizi Tetikle]`, `[İncelemeye Al]`, `[Asılsız]`

*Dataset / Override:*
- Article listesi, mevcut AdminDataset UI'ı
- Her satırda "Kilitle" butonu → admin verdict override modalı
- Override yapılan makaleler kilitli ikonla gösterilir, `is_ground_truth=True`

### 6.4 AdminCommunity (`/admin/community`)

**İki sekme:**

*Moderasyon Kuyruğu:*
- Flagged yorumlar (AI + kullanıcı bildirimi), yorum önizlemesi
- Aksiyon: Onayla / Kaldır
- Shadow ban butonu → kullanıcı profiline yönlendirme

*İtibar Müdahalesi:*
- Kullanıcı arama
- `forum_trust_score` manuel ayar slider'ı
- Rozet atama / geri alma
- Tüm değişiklikler audit log'a yazılır

### 6.5 AdminAIControl (`/admin/ai-control`)

**Üç sekme:**

*Model Performansı:*
- `ModelTrainingRun` tablosundan accuracy trend grafik (son 10 run)
- Son eğitim tarihi, sample/feedback count
- "Yeniden Eğit" butonu (Celery task tetikler, onay dialog)

*Hassasiyet Kontrolü:*
- Global NLP Tolerance slider (0.0–1.0)
- Mevcut değer Redis'ten okunur
- Değişiklik audit log uyarısıyla birlikte kaydedilir
- Seçim döneminde "Yüksek Hassasiyet" / "Normal" / "Düşük Hassasiyet" preset butonları

*Kaynak Güven Endeksi:*
- `SourceBias` tablosu, sayfalı liste
- Her satır inline düzenlenebilir: `political_lean` slider (-1 sol / +1 sağ), `factual_accuracy`, `clickbait_tendency`
- Değişiklik `PATCH /admin/ai/sources/{domain}` ile kaydedilir

*A/B Testler:*
- Mevcut AdminABTest sayfası buraya taşınır

### 6.6 AdminSecurity (`/admin/security`)

**Mevcut içeriğe ek:**

*IP Tehdit Listesi:*
- Kısa sürede çok fazla başarısız giriş denemesi yapan IP hash listesi
- "Tüm Oturumları Kapat" butonu (ilgili user_id varsa)

*Canlı Konsol (Terminal View):*
- Sayfanın alt bölümünde sabit yükseklikli terminal penceresi
- WebSocket bağlantısı: `WS /ws/admin/live-log`
- Monospace font, yeşil/sarı/kırmızı satır renklendirmesi (severity'ye göre)
- Otomatik scroll, max 200 satır buffer
- Bağlantı kesilirse 3 saniyede bir yeniden bağlanma denemesi

---

## 7. İmplementasyon Sırası (Özellik Özellik)

1. **DB Migration** — `is_shadow_banned`, `is_ground_truth`, `system_config` tablosu
2. **AdminDashboard** — backend stats endpoint + frontend sayfa
3. **AdminUsers** — mevcut sayfa upgrade (shadow ban, XP, badge, force logout)
4. **AdminContent** — admin_content.py + frontend (ihbar havuzu + dataset/override)
5. **AdminCommunity** — admin_community.py + frontend (moderasyon + itibar)
6. **AdminAIControl** — admin_ai.py + frontend (model perf + tolerance + source bias + A/B)
7. **AdminSecurity** — upgrade (IP listesi + live console WebSocket)
8. **Sidebar + App.jsx** — nav yapısı güncelle, eski dosyaları sil, route'ları yaz
9. **Forum endpoint shadow ban filtresi** — forum API'sine `is_shadow_banned` kontrolü ekle

---

## 8. Tasarım Kararları ve Gerekçeler

| Karar | Gerekçe |
|---|---|
| Shadow ban server-side filtresi | Client-side filtre bypass edilebilir; ban bilgisi API response'una asla girmemeli |
| Ground truth `is_ground_truth` alanı | Kullanıcı feedbackinden ayrılmalı; retrain pipeline'ı bu flag'e göre weight belirler |
| `system_config` tablo + Redis çift katman | **Yazma:** önce DB'ye (`system_config`), sonra Redis'e yaz. **Okuma:** önce Redis'ten dene (`system:global_nlp_tolerance`), yoksa DB'den oku ve Redis'e set et. Redis çökerse DB fallback garantili. |
| WebSocket JWT query param | WS upgrade'de Authorization header bazı browser/proxy katmanlarında iletilmez |
| Pydantic + DB CheckConstraint çift doğrulama | Pydantic API seviyesinde hız, DB constraint son savunma hattı |
| Temiz yeniden yapılandırma (eski dosyaları sil) | Eski sayfalar yeni sayfayla çakışan endpoint'lere bağlı; karma bırakmak karışıklığa yol açar |
