# Spec: Public Profil Sayfası Redesign

**Tarih:** 2026-05-28  
**Hedef dosya:** `frontend/src/pages/Profile.jsx`  
**Kapsam:** Sadece public profil (`/users/:userId`). `ProfileLayout` ve `ProfileOverview` bu turda dokunulmaz.

---

## Motivasyon

Mevcut `Profile.jsx` tek sütun, minimal, bilgi yoğunluğu düşük. Stitch tasarım örneği temel alınarak projenin "Emerald Sentinel" tasarım diliyle uyumlu, görsel hiyerarşisi güçlü bir yeniden tasarım yapılacak. Yazılar gri olmayacak, light mode tam desteklenecek.

---

## Tasarım Dili Kuralları

- Tüm renkler CSS değişkenleri üzerinden: `--color-text-primary`, `--color-brand-primary`, `--color-fake-fill` vb.
- Ana metin: `--color-text-primary` (gri değil). Meta bilgi (tarih, yorum sayısı) için `--color-text-muted`.
- Kart aksanları: `<Corner />` pattern (4 köşe yeşil çizgi).
- Başlık etiketleri: `font-mono text-xs tracking-widest uppercase` — `// ETIKET` formatı, `--color-brand-primary` rengiyle.
- Butonlar: Birincil = brand dolgu, hover'da `box-shadow` glow. İkincil = border-only, hover'da border brand rengi.
- Light mode: CSS var token sistemi aracılığıyla otomatik.

---

## Bölüm 1 — Hero Section

### Cover Alanı
- `h-48` yüksekliğinde alan.
- Arka plan: `background: var(--color-bg-base)` + CSS `bg-tech-grid` class (mevcut `index.css`'de tanımlı).
- Üzerine `bg-gradient-to-t from-[var(--color-bg-surface)] to-transparent` overlay.
- Köşe aksan çifti: sol-üst ve sağ-alt (mevcut `Corner` componenti mantığı, inline div olarak).

### Avatar
- Boyut: `w-28 h-28`, `rounded-full`.
- Border: `border-4 border-[var(--color-brand-primary)]`.
- Cover altına `-mt-14` offset ile yerleştirilir.
- Fallback: mevcut `UserAvatar` komponenti korunur.

### Kullanıcı Bilgileri
```
[username]  [// Onaylı badge — sadece trust_tier >= 'trusted' ise]
// @handle  (font-mono, brand rengi)
[bio]       (--color-text-primary, max-w-2xl)
[📅 Mayıs 2026 tarihinden beri üye]  [🔗 instagram linki]  (font-mono xs, brand rengi)
```

### Aksiyon Butonları (kendi profili değilse)
- **Mesaj:** border-only, hover border brand, `font-mono text-sm`.
- **Takip Et / Takibi Bırak:** brand dolgu, `box-shadow: 0 0 15px rgba(brand, 0.3)`, hover glow artar.
- Kendi profilinde: "Profili Düzenle" butonu → `/profile/overview` linkine yönlendirir.

### Stats Strip
Tek yatay şerit, üst kenarda `border-t var(--color-terminal-border-raw)`:

| Tartışma | Takipçi | Takip | Analiz | Sahte Tespit | Seviye + XP |
|---|---|---|---|---|---|
| `thread_count` | `follower_count` | `following_count` | `analysis_count` — brand rengi | `fake_count` — `--color-fake-fill` | `Seviye N` — brand |

- Analiz ve Sahte sayıları `/users/{user_id}/analyses` endpoint'inden gelecek (pagination olmadan summary).
- Seviye + XP: `/users/{user_id}/gamification` endpoint'inden veya profil response'una eklenir.

---

## Bölüm 2 — İki Sütun Layout

```
[  Left Column — lg:w-2/3  ] [  Right Column — lg:w-1/3  ]
```

### Sol Sütun — Tab Sistemi

Tab çubuğu: alt kenarda `border-b var(--color-terminal-border-raw)`.  
Aktif tab: `border-b-2 border-[var(--color-brand-primary)]`, `font-mono font-bold`, brand rengi.  
Pasif tab: `--color-text-muted` → hover: `--color-text-primary`.

**Sekmeler:**
1. **Genel Bakış** — Son 3 thread + son 3 analiz kartını gösterir (önizleme, "tümünü gör" linkleri ile).
2. **Tartışmalar (N)** — Sayfalı thread listesi.
3. **Analizlerim (N)** — Sayfalı analiz listesi.

### Thread Kartı Tasarımı
```
┌─────────────────────────────────────────────┐  ← relative border, Corner aksanı
│ [KATEGORİ BADGE]                   [tarih]  │
│ Başlık font-headline bold primary           │
│ Gövde line-clamp-2 secondary                │
│──────────────────────────────────────────── │
│ 💬 N yorum                                  │
└─────────────────────────────────────────────┘
```
- Hover: `background` → `var(--color-terminal-surface)` + köşe aksan opaklık artar.
- Kategori badge: `font-mono text-[10px] border` — renkler `CAT_COLOR` map (mevcut proje pattern).
- Başlık hover: `--color-brand-primary` transition.

### Analiz Kartı Tasarımı
```
┌──────────────────────────────────────────────┐  ← sağ kenarda 3px dikey bant
│ [URL/METİN badge]  [Analiz Raporu]  [tarih]  │     AUTHENTIC→brand, FAKE→--color-fake-fill
│ Başlık font-headline bold primary             │
│──────────────────────────────────────────────│
│ [✓ Doğrulandı badge]        %N Güven         │
└──────────────────────────────────────────────┘
```
- Sağ kenardaki dikey bant: `absolute right-0 top-0 bottom-0 w-[3px]` + prediction rengine göre gradient.
- Verdict badge: AUTHENTIC → `--color-authentic-text` border, FAKE → `--color-fake-text` border.
- `TypeBadge` componenti: mevcut `ProfileOverview`'dan alınır.
- `PredictionBadge` componenti: mevcut `ProfileOverview`'dan alınır.

### Sağ Sütun — Widget'lar (Sırasıyla)

1. **Rozet Vitrini**
   - 3 slot grid.
   - Veri: `GamificationService.getPublicBadges(userId)` — yeni backend endpoint gerekir.
   - Kendi profilindeyken "Düzenle" butonu görünür.
   - Slot doluysa: rozet rengi border + isim. Boşsa: dashed border, "boş" metni.

2. **`RecommendedUsersWidget`** — mevcut, değişmez.

3. **`PopularThreadsWidget`** — mevcut, değişmez.

---

## Bölüm 3 — Backend Değişiklikleri

### Yeni Endpoint 1: Public Analiz Geçmişi
```
GET /users/{user_id}/analyses?page=1&size=10
```
Response:
```json
{
  "items": [
    {
      "title": "...",
      "prediction": "FAKE|AUTHENTIC|UNCERTAIN",
      "confidence": 0.87,
      "analysis_type": "url|text",
      "created_at": "2026-05-01T..."
    }
  ],
  "total": 42,
  "page": 1,
  "size": 10
}
```
Auth: `get_optional_user` (herkese açık).  
Sorgu: `AnalysisRequest.user_id = user_id` JOIN `AnalysisResult` üzerinden.

### Yeni Endpoint 2: Public Rozet Listesi
```
GET /users/{user_id}/badges
```
Response: Kullanıcının kazandığı ve showcase'e eklediği rozetler (sadece `is_showcased=True`).  
Auth: `get_optional_user`.

### Mevcut Endpoint Güncelleme: Profil Response
`GET /users/{user_id}/profile` — `UserProfileResponse`'a aşağıdaki alanlar eklenir:
- `analysis_count: int` — toplam analiz sayısı
- `fake_count: int` — FAKE sonuçlu analiz sayısı
- `level: int` — gamification level
- `total_xp: int` — toplam XP

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|------------|
| `frontend/src/pages/Profile.jsx` | Tamamen yeniden yazılır |
| `app/api/v1/endpoints/users.py` | 2 yeni endpoint + profil response güncelleme |
| `app/schemas/schemas.py` | `UserProfileResponse`'a 4 alan eklenir |

---

## Kabul Kriterleri

- [ ] Hero section cover + avatar + stats strip tüm ekran boyutlarında düzgün görünür
- [ ] Takip/takipten çık butonu çalışır
- [ ] 3 sekme arasında geçiş, URL değişmeden (local state ile) çalışır
- [ ] Analiz kartlarında prediction rengine göre sağ bant doğru gösterilir
- [ ] Light mode'da tüm elementler okunabilir (gri kaybolma yok)
- [ ] Kendi profil sayfasında "Profili Düzenle" butonu görünür, başkasında Takip Et görünür
- [ ] Rozet vitrini: 3 slot, kendi profilinde "Düzenle" butonu aktif
