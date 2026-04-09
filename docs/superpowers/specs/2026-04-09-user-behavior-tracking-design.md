# Kullanıcı Davranış Takibi & Kişiselleştirme Sistemi

**Tarih:** 2026-04-09  
**Durum:** Onaylandı — Implementasyona Hazır  
**Kapsam:** Tracking altyapısı, öneri motoru, kullanıcı yüzü özellikler, güvenlik

---

## 1. Genel Bakış

Mevcut sistem HTTP isteklerini ve güvenlik olaylarını logluyor; içerik bazlı kullanıcı davranışı hiç izlenmiyor. Bu spec:

- Kullanıcının hangi haberlere ilgi gösterdiğini yakalar (tıklama, görüntüleme, geri bildirim)
- Collaborative filtering + semantic similarity hibrit öneri motoru kurar
- Kişisel risk raporu, kaynak güven skoru, topluluk zekası gibi platforma özgü kullanıcı değeri üretir
- Gelecek fazlar için genişletilebilir altyapı bırakır

Mevcut `audit_log` pipeline'ı (Redis buffer → Celery flush → PostgreSQL) aynen korunur. `content_interactions` bu altyapının üstüne ayrı, yapısal bir tablo olarak eklenir.

---

## 2. Veri Katmanı

### 2.1 `content_interactions`

Ham event stream — hiçbir şey kaybolmaz.

```sql
CREATE TABLE content_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_hash         VARCHAR(64) NOT NULL,          -- anonim kullanıcılar için
    content_id      UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(32) NOT NULL,          -- enum aşağıda
    category        VARCHAR(64),
    source_domain   VARCHAR(128),
    nlp_score_at_time FLOAT,                        -- tıklama anındaki sahtelik skoru
    visibility_weight FLOAT DEFAULT 1.0,            -- 0.3=yarı görüldü, 1.0=tam görüldü
    details         JSONB,                          -- yalnızca sayısal/enum değerler
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- interaction_type değerleri:
-- click                → habere tıkladı
-- feedback_positive    → 👍 verdi
-- feedback_negative    → 👎 verdi
-- filter_used          → kategori filtresi seçti
-- impression           → görüntülendi (Intersection Observer)

CREATE INDEX idx_ci_user_created   ON content_interactions (user_id, created_at DESC);
CREATE INDEX idx_ci_content        ON content_interactions (content_id);
CREATE UNIQUE INDEX uq_ci_feedback ON content_interactions (user_id, content_id)
    WHERE interaction_type IN ('feedback_positive', 'feedback_negative');
```

### 2.2 `user_preference_profiles`

Kullanıcı başına özet profil — öneri sırasında tek satır okuma, join yok.

```sql
CREATE TABLE user_preference_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    category_weights    JSONB DEFAULT '{}',   -- {"ekonomi": 0.72, "spor": 0.31}
    avg_nlp_tolerance   FLOAT DEFAULT 0.5,    -- yüksek riskli haberlere tolerans
    preferred_sources   JSONB DEFAULT '[]',   -- ["aa.com.tr", "bbc.com/turkce"]
    declared_interests  JSONB DEFAULT '{}',   -- kayıt sırasında beyan (zamanla eriyecek)
    interaction_count   INTEGER DEFAULT 0,    -- soğuk start eşiği için
    last_updated        TIMESTAMPTZ DEFAULT now()
);
```

`declared_interests` her 5 etkileşimde %20 ağırlık kaybeder. 20 etkileşimden sonra tamamen silinir, yerini gerçek davranış alır.

### 2.3 `content_similarity_cache`

pgvector sorgularını önceden hesaplar — her öneri isteğinde tarama yapmaz.

```sql
CREATE TABLE content_similarity_cache (
    content_id   UUID PRIMARY KEY REFERENCES news_articles(id) ON DELETE CASCADE,
    similar_ids  JSONB NOT NULL,    -- [uuid, uuid, ...] top-10
    computed_at  TIMESTAMPTZ DEFAULT now()
);
```

Günlük Celery Beat task'ı yeni içerikler için cache'i yeniler (24s TTL).

### 2.4 `onboarding_interests` (Kayıt Formu)

Kullanıcı kayıt sırasında seçtiği ilgi alanları burada saklanır, `declared_interests`'i besler.

```sql
-- users tablosuna ek alan (migration):
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
-- declared interests user_preference_profiles.declared_interests'te yaşar
```

---

## 3. Tracking Pipeline

### 3.1 Veri Akışı

```
Kullanıcı habere tıklar / görüntüler / feedback verir
    ↓
Frontend: fire-and-forget POST /api/v1/interactions/track  (< 50ms)
    ↓
FastAPI: validation → content_interactions tablosuna yazar (async)
    ↓
Celery Beat (gece 02:00): preference_profile_updater
    → content_interactions gruplar
    → category_weights, avg_nlp_tolerance, preferred_sources günceller
    → declared_interests ağırlığını eritir
    ↓
Celery Beat (günde 1x, 03:00): similarity_cache_builder
    → yeni / güncellenmiş NewsArticle'lar için pgvector top-10 hesaplar
    → content_similarity_cache yazar
```

### 3.2 Endpoint

```
POST /api/v1/interactions/track
Authorization: Bearer <token>  (anonim: ip_hash kullanılır)
Rate limit: kullanıcı başına 60/dk, anonim 20/dk

Body:
{
  "content_id": "uuid",
  "interaction_type": "click | feedback_positive | feedback_negative | filter_used | impression",
  "category": "ekonomi",
  "nlp_score_at_time": 0.43,
  "visibility_weight": 1.0,
  "details": {}   -- yalnızca sayısal veya enum değerler
}

Response: 202 Accepted  -- sonucu bekleme
```

### 3.3 Görünürlük Takibi (Intersection Observer)

```javascript
// Gündem sayfasında her kart için
const observer = new IntersectionObserver(
  (entries) => entries.forEach(entry => {
    if (entry.intersectionRatio >= 0.5 && visibleFor(entry) >= 3000) {
      trackInteraction({ ..., interaction_type: 'impression', visibility_weight: 1.0 })
    } else if (entry.intersectionRatio >= 0.25 && visibleFor(entry) >= 1000) {
      trackInteraction({ ..., interaction_type: 'impression', visibility_weight: 0.3 })
    }
  }),
  { threshold: [0.25, 0.5] }
)

// Tekrar gösterim kuralı (frontend cache):
// visibility_weight 1.0 → 48 saat gösterme
// visibility_weight 0.3 → 24 saat gösterme
// sadece geçildi      → 6 saat sonra tekrar gösterilebilir
```

---

## 4. Öneri Motoru

### 4.1 Üç Mod

```
interaction_count < 5   → Soğuk Başlangıç
interaction_count 5–20  → Isınma
interaction_count > 20  → Kişisel Mod
```

### 4.2 Soğuk Başlangıç

Kayıtta beyan edilen ilgiler + platform geneli trending:

```
skor = 0.50 × declared_interest_match
     + 0.30 × recency_score
     + 0.20 × (1 - nlp_score)
```

Kayıt yapmamış kullanıcılar için `declared_interest_match = 0`, trending öne çıkar.

### 4.3 Isınma Modu (5–20 etkileşim)

Collaborative filtering devreye girer:

```
benzer_kullanıcılar = category_weights kosinüs benzerliği → top-5 kullanıcı
ortak_içerikler    = bu kullanıcıların feedback_positive verdiği haberler

skor = 0.40 × collaborative_score
     + 0.35 × category_match        -- kendi category_weights
     + 0.25 × recency_score
```

### 4.4 Kişisel Mod (20+ etkileşim)

Tam hibrit:

```
skor = 0.35 × semantic_similarity     -- pgvector: son 3 tıklamanın embedding ortalaması
     + 0.25 × category_match          -- user_preference_profiles.category_weights
     + 0.20 × collaborative_score     -- benzer kullanıcı sinyali
     + 0.10 × feedback_boost          -- positive feedback verilen içeriklere benzerler
     + 0.10 × (1 - nlp_score)         -- sahtelik cezası
     - 0.15 × already_seen_penalty    -- daha önce tıklananlar için ceza
```

### 4.5 Öneri Cache

```
GET /api/v1/recommendations?limit=10&context=feed|post_analysis

Cache: user_id başına 1 saatlik Redis TTL
Invalidation: feedback verildiğinde o kullanıcının cache'i anında silinir
Fallback: cache miss → hesapla (max 200ms)
```

---

## 5. Kullanıcı Yüzü Özellikler (Fazlara Göre)

### Faz 1 — Altyapı + Temel UX

**Kayıt Onboarding**
Kayıt formuna 2. adım eklenir: "Hangi konuları takip etmek istersin?" — kategori çoklu seçim. Zorunlu değil, atlanabilir. Seçimler `declared_interests`'e yazılır.

**Gündem Sayfası Tıklama Tracking**
Her kart tıklaması `/interactions/track` çağırır. Kullanıcı bunu fark etmez, UX değişmez.

**Analiz Sonrası Feedback**
Analiz result kartının altında animasyonlu slide-in bar:
```
┌─────────────────────────────────────────────────┐
│  Bu analiz faydalı mıydı?        👍   👎        │
└─────────────────────────────────────────────────┘
```
Tıklanınca bar kaybolur, feedback `/interactions/track`'e gönderilir.

---

### Faz 2 — Zeka Katmanı

**"Sizin için" Feed**
Gündem sayfasında kategori filtresinin üstünde, giriş yapmış kullanıcılar için "Sizin için" toggle'ı. Aktifken haberler öneri skoruna göre sıralanır. Her kartta neden önerildiğini gösteren küçük etiket:
- `Çok okuduğun kaynak`
- `İlgi alanın: Teknoloji`
- `Toplulukta gündem`
- `Benzer kullanıcılar okudu`

**Analiz Sonrası "İlgili Haberler"**
Analiz result kartının altında, feedback bar'ın hemen altında animasyonlu panel:
```
┌─────────────────────────────────────────────────┐
│  📰 İlgili Haberler                             │
│  ─────────────────────────────────────────────  │
│  • [Başlık]  %23 risk   aa.com.tr    2s önce    │
│  • [Başlık]  %61 risk   bbc.com/tr   5s önce    │
│  • [Başlık]  %08 risk   trt.net      1g önce    │
└─────────────────────────────────────────────────┘
```
Analiz metninin embedding'ine pgvector benzerliği + son 7 gün filtresi ile gelir.

---

### Faz 3 — Platform Değeri

**Kişisel Risk Raporu**
Profil sayfasında "Risk Özeti" kartı:
- "Bu hafta ilgi alanlarında X sahte haberle karşılaştın"
- Kategori bazında risk oranı (çubuk grafik)
- En çok maruz kaldığın sahtelik türü (clickbait / iddia / yanlış bilgi)

**Kaynak Güven Skoru (Kişisel)**
Profil sayfasında "Kaynak Takibim":
- Kullanıcının tıkladığı kaynaklardan sahte çıkanların oranı
- "Bu kaynaktan 8 haber okudun, 6'sı sahte çıktı — dikkat"

**Topluluk Zekası Rozeti**
Gündem sayfasında haber kartlarında:
```
👥 142 kişi inceledi · %88 sahte
```
AnalysisResult tablosundan `content_id` bazında aggregate.

**İlgi Alanı Uyarı Banner'ı**
Gündem sayfası açılışında, eğer kullanıcının ilgi kategorisinde son 24 saatte yüksek riskli haber yoğunluğu varsa:
```
⚠️ Ekonomi gündeminde bugün yoğun dezenformasyon tespit edildi. Dikkatli ol.
```
Kapat butonu ile kapatılabilir, oturum boyunca tekrar gösterilmez.

---

## 6. Gelecek Fazlar (Genişletilebilirlik)

Spec'e alındı, şu an implemente edilmeyecek:

**Faz 4 — Bildirimler**
- "İlgi alanında yeni sahte haber" bildirimi (uygulama içi + isteğe bağlı email)
- Haftalık kişisel özet email digest
- Kullanıcı bildirim tercihlerini kontrol eder, kapatabilir

**Faz 5 — Kullanıcı Kontrolü**
- "Bu kaynağı gösterme" — feed'den kaynak bazlı engelleme
- "Bu konuyu istemiyorum" — kategori bazlı gizleme
- Preference override: "İlgi alanımı sıfırla"
- KVKK/GDPR: "Benim hakkımda ne biliyorsunuz?" → JSON export, hesap silinince tüm interaction verisi silinir

**Faz 6 — Sosyal & Dış Platform**
- Tarayıcı uzantısı — platform dışında haber okurken analiz
- "Arkadaşların bunu okudu" — isteğe bağlı sosyal sinyal (opt-in)
- Paylaşım: analiz sonucunu sosyal medyada paylaş

**Faz 7 — A/B & Gelişmiş ML**
- Feed algoritması A/B testi altyapısı (hangi ağırlık kombinasyonu daha iyi?)
- Model feedback loop: kullanıcı "bu yanlış sonuç" derse training signal
- Gerçek zamanlı öneri (WebSocket ile anlık güncelleme)

---

## 7. Güvenlik Kısıtları

Uygulama sırasında bu kurallara uyulur, her biri kod review'da kontrol edilir:

| # | Risk | Kural |
|---|------|-------|
| 1 | PII sızması | `details` JSONB yalnızca sayısal/enum değerler alır. Analiz metni, kullanıcı adı, email hiçbir zaman loglanmaz |
| 2 | Log injection | `event_name`, `interaction_type` kod içinde sabit string. `f"event.{user_input}"` formatı yasak |
| 3 | Token URL'de | Middleware path loglarken query string'den `token=`, `key=`, `secret=` parametreleri temizlenir |
| 4 | Interaction flood | `/interactions/track` mevcut rate limiter'a bağlanır. Kullanıcı 60/dk, anonim 20/dk |
| 5 | Feedback manipülasyonu | `UNIQUE(user_id, content_id)` kısıtı — aynı içeriğe tek feedback. DB seviyesinde enforce edilir |
| 6 | Inference attack | `user_preference_profiles` hiçbir kullanıcı endpoint'inde dönmez. Yalnızca backend öneri hesabında kullanılır |
| 7 | Anonim takip | `ip_hash` SHA-256, raw IP asla yazılmaz. Anonim kullanıcılar profil almaz, yalnızca impression sayılır |
| 8 | Veri saklama | `content_interactions` 90 gün sonra silinir (Celery Beat monthly cleanup task) |

---

## 8. Implementasyon Sırası

```
Faz 1:  DB migration (3 tablo) → /interactions/track endpoint →
        Gündem tıklama tracking → Feedback UI → Onboarding adımı

Faz 2:  preference_profile_updater Celery task → similarity_cache_builder →
        /recommendations endpoint → "Sizin için" feed toggle →
        Analiz sonrası "İlgili Haberler" paneli

Faz 3:  Kişisel Risk Raporu → Kaynak Güven Skoru →
        Topluluk Zekası rozeti → İlgi alanı uyarı banner'ı

Faz 4+: Bildirimler, kullanıcı kontrolü, sosyal özellikler, A/B testi
```

Her faz önceki fazın veriye ihtiyaç duyar. Faz 1 olmadan Faz 2 çalışmaz.
