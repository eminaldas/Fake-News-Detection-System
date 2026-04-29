# Gündem Sayfası — Popüler Haberler + Forum Trend Bandı

**Tarih:** 2026-04-29  
**Kapsam:** Gündem sayfası yeniden tasarımı

---

## Özet

Gündem sayfasındaki "Size Özel" akışı kaldırılıyor. Yerine:
1. Karma skorla sıralanan 10 popüler haber kartı (1 büyük + 9 grid)
2. Son 6 saatin en aktif forum threadlerini gösteren otomatik kayan trend bandı

---

## 1. Backend Değişiklikleri

### 1a. `/api/v1/news` — `sort=popular` parametresi

`sort` query parametresi eklenir. Değer `popular` olduğunda mevcut `pub_date DESC` sıralaması yerine karma skor kullanılır.

**Karma skor formülü (SQL'de hesaplanır):**
```
popularity = (source_count × 0.5)
           + (community_views × 0.3)
           + (1.0 / (hours_since_pub + 1) × 0.2)
```

- `source_count`: zaten `NewsArticle` modelinde mevcut
- `community_views`: mevcut `ContentInteraction` aggregate sorgusu (`community_map`) — ekstra DB sorgusu yok
- `hours_since_pub`: `EXTRACT(EPOCH FROM (NOW() - pub_date)) / 3600`

Diğer parametreler (`category`, `size`, `page`, `date_from`, `date_to`) değişmez.

### 1b. `/api/v1/forum/trending` — `hours` + `velocity` parametreleri

İki opsiyonel query parametresi eklenir:

| Parametre | Default | Açıklama |
|-----------|---------|----------|
| `hours` | 168 (7 gün) | Kaç saatlik pencere |
| `velocity` | `false` | Hız skoru hesaplansın mı |

**Limit:** 5 → 10 olarak güncellenir.

**Velocity hesabı** (`velocity=true` olduğunda):
```
velocity_ratio = votes_last_1h / max(votes_last_6h, 1)
is_rising = velocity_ratio > 0.50
```
`votes_last_1h` ve `votes_last_6h`: `ForumThread.vote_*` alanları zaten toplam olarak tutuluyor. Velocity için `ForumVote` tablosuna `created_at` bazlı aggregate sorgu atılır.

**Response'a eklenen alan:**
```json
{
  "trending_threads": [
    {
      "id": 1,
      "title": "...",
      "category": "gündem",
      "comment_count": 12,
      "total_votes": 34,
      "created_at": "2026-04-29T10:00:00Z",
      "is_rising": true
    }
  ]
}
```

---

## 2. Frontend Değişiklikleri

### 2a. Yeni dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/hooks/usePopularNews.js` | `/news?sort=popular` fetch + 3dk polling |
| `src/hooks/useForumTrends.js` | `/forum/trending?hours=6&velocity=true&limit=10` fetch |
| `src/components/features/gundem/PopularNewsGrid.jsx` | 1 büyük + 9 grid kart |
| `src/components/features/gundem/ForumTrendBand.jsx` | Auto-scroll trend bandı |

### 2b. `Gundem.jsx` değişimi

- "Size Özel" akışı (`/recommendations` çağrısı, `ForYouSection` veya benzeri) kaldırılır
- Kategori filtresi + arama korunur
- `sort=popular` her zaman gönderilir, kullanıcı sıralama seçemez
- Sayfa yapısı:

```
<Gundem>
  <CategoryBar />        ← mevcut, korunur
  <SearchBar />          ← mevcut, korunur
  <PopularNewsGrid />    ← yeni
  <ForumTrendBand />     ← yeni
</Gundem>
```

### 2c. `PopularNewsGrid` bileşeni

**Layout:**
```
┌─────────────────────────────────────┐
│           BÜYÜK KART (ilk)          │  ← tam genişlik, büyük görsel
│  Başlık (büyük), Kaynak, Tarih,     │
│  NLP Skor rozeti, Source count,     │
│  "Analiz Et" butonu                 │
└─────────────────────────────────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Kart 2  │ │  Kart 3  │ │  Kart 4  │   ← 3×3 grid
│  görsel  │ │  görsel  │ │  görsel  │
│  başlık  │ │  başlık  │ │  başlık  │   metin clamp yok
│  kaynak  │ │  kaynak  │ │  kaynak  │
└──────────┘ └──────────┘ └──────────┘
... (3 satır, 9 kart)
```

**Büyük kart içeriği:**
- Görsel (16:9 oranı, `object-cover`)
- Kategori rozeti (sol üst, görsel üzerinde)
- Başlık: `text-2xl font-bold`, tam görünür
- Kaynak adı + yayın zamanı ("X dakika önce")
- NLP skoru renk kodlu (yeşil/sarı/kırmızı)
- `source_count > 1` ise "X kaynakta" rozeti
- "Analiz Et →" butonu

**Küçük kart içeriği:**
- Görsel (`aspect-video`, `object-cover`)
- Başlık: tam görünür, `text-sm font-semibold`, clamp yok
- Kaynak + tarih + NLP skoru alt kısımda

**Skeleton:** Yüklenirken büyük kart + 9 grid skeleton gösterilir.

### 2d. `ForumTrendBand` bileşeni

**Yapı:**
```
<section>
  <h2>Forum Trendleri</h2>          ← "Son 6 Saatte" alt başlık
  <div class="scroll-container">
    [fade-left]  [kart][kart][kart]...  [fade-right]
  </div>
</section>
```

**Auto-scroll davranışı:**
- CSS `@keyframes scroll` ile `translateX(0)` → `translateX(-50%)` animasyonu
- İçerik DOM'da iki kez çoğaltılır (seamless loop için)
- `animation-duration`: `card_count × 3s` (10 kart = 30s)
- `animation-play-state: paused` on hover/touch

**Snap scrolling (manuel):**
- `scroll-snap-type: x mandatory` wrapper'da
- `scroll-snap-align: start` her kartta
- Otomatik scroll aktifken snap geçici olarak devre dışı

**Gradient fade:**
```jsx
// Sol kenar
<div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10"
     style={{ background: 'linear-gradient(to right, var(--color-bg-base), transparent)' }} />
// Sağ kenar  
<div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10"
     style={{ background: 'linear-gradient(to left, var(--color-bg-base), transparent)' }} />
```

**Kart içeriği:**
- Başlık (`text-sm font-semibold`, max 2 satır clamp)
- Kategori rozeti (renkli pill)
- Oy sayısı (toplam)
- Yorum sayısı
- "X dakika/saat önce"
- `is_rising: true` ise 🔥 kırmızı "Trend" rozeti (sağ üst köşe)

---

## 3. Veri Akışı

```
Gündem açılır
  ↓
usePopularNews(category) → GET /news?sort=popular&size=10&category=...
  ↓ (3dk polling)
PopularNewsGrid render

useForumTrends() → GET /forum/trending?hours=6&velocity=true&limit=10
  ↓ (5dk polling)
ForumTrendBand render
```

---

## 4. Değiştirilmeyen Şeyler

- Kategori filtresi (URL query params ile çalışır)
- Arama (client-side)
- Tarih filtresi
- Risk banner (NLP skoru yüksek haber oranı)
- Analiz modali (`AnalysisModal`)
- 3 dakikalık polling mimarisi
- Tüm mevcut kart alt bileşenler (`ScoreCircle`, `SourceBadge`, vb.)

---

## 5. Riskler / Varsayımlar

- `ForumVote` modelinde `created_at` alanının var olduğu varsayılıyor (velocity hesabı için zorunlu). Backend incelemesinde doğrulanmalı; yoksa `ForumThread.updated_at` fallback olarak kullanılır.
- `community_views` aggregate sorgusu büyük tablolarda yavaşlayabilir — gerekirse `LIMIT 10` öncesinde subquery ile optimize edilir.

---

## 6. Kapsam Dışı

- "Size Özel" / recommendations sistemi (kaldırılıyor, backend endpoint'i silinmiyor — sadece Gündem sayfasında kullanılmıyor)
- Sayfalama (ilk aşamada sadece ilk 10)
- Gerçek zamanlı WebSocket güncellemesi ForumTrendBand için (polling yeterli)
