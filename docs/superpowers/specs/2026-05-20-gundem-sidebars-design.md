# Gündem Sidebar'ları — Tasarım Dokümanı
**Tarih:** 2026-05-20

---

## Özet

Gündem sayfasına iki sidebar ekleniyor:

- **Sol** — Gemini tarafından günde 4 kez üretilen genel gündem özeti
- **Sağ** — Tıklama + kaynak bazlı, kişiselleştirilmiş trend listesi

---

## 1. Veri Modeli

### Yeni tablo: `daily_summaries`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | |
| `summary_date` | Date | Özet tarihi (YYYY-MM-DD) |
| `generated_at` | DateTime(tz) | Üretim zamanı |
| `summary_text` | Text | 3-4 cümlelik Türkçe özet |
| `topics` | JSONB | `["Ekonomi", "Teknoloji", ...]` (4-5 başlık) |
| `article_count` | Integer | Kaç haber başlığı kullanıldı |
| `slot` | String(5) | "09:00" / "13:00" / "17:00" / "21:00" |

Aynı gün + slot kombinasyonu için `UNIQUE(summary_date, slot)` constraint — yeniden çalışırsa `UPDATE` yapar.

---

## 2. Backend

### 2a. Celery Task — `workers/daily_digest_task.py`

**Zamanlama:** Her gün 09:00, 13:00, 17:00, 21:00 (UTC+3 için tasks.py'de ayarlanır)

**Adımlar:**
1. Bugünün haberlerini çek: `NewsArticle` → `pub_date >= today`, `source_count DESC`, limit 25
2. Prompt oluştur:
   ```
   Aşağıdaki haber başlıkları bugün Türkiye gündeminde öne çıkan haberlerin listesidir.
   Bunları tek tek özetleme. Bunun yerine: bugün genel gündem nasıldı, hangi konular öne çıktı —
   bunu 3-4 cümleyle anlat. Sonra 4-5 konu başlığı çıkar.
   
   Başlıklar:
   1. [başlık] (N kaynak)
   2. ...
   
   JSON formatında yanıt ver: {"summary": "...", "topics": ["...", "..."]}
   ```
3. Gemini Flash'a gönder (`ai_comment_task._get_gemini_client()` pattern'ini kullan)
4. Yanıtı parse et, `DailySummary` kaydına `INSERT OR UPDATE` yap
5. Hata varsa sessizce geç (bir sonraki slot'ta yeniden dener)

### 2b. API Endpoint — `GET /api/v1/digest/today`

- Auth gerekmez
- Bugünün en son `DailySummary` kaydını döner
- Kayıt yoksa `404` veya `{"summary": null, "topics": []}`
- Response: `{ summary_text, topics, generated_at, slot, article_count }`

### 2c. Trend Endpoint — mevcut `GET /api/v1/news`

`sort=popular&date_from=today&date_to=today&size=10` ile çalışır. Değişiklik gerekmez.

**Kişiselleştirme (opsiyonel, authenticated):**
Mevcut `sort=popular` sorgusu `UserPreferenceProfile.declared_interests` ile zaten çalışıyor. Yeni bir şey eklenmeyecek — mevcut filtre sistemi yeterli.

**Sıralama mantığı (sağ sidebar için):**
- Kategori seçiliyse: o kategori içinde `sort=popular`
- Kategori yoksa: tüm kategoriler `sort=popular`
- Önemli haberler (source_count ≥ 3) her zaman üstte (zaten mevcut day_weight formülü bunu sağlıyor)

---

## 3. Frontend

### 3a. Layout Değişikliği — `Gundem.jsx`

```
[Sol Sidebar 230px] [Haberler max-w-5xl flex-1] [Sağ Sidebar 195px]
```

3 sütunlu grid. Tablet/mobilde sol sidebar gizlenir, sağ sidebar altına kayar.

### 3b. Sol Bileşen — `DailySummaryPanel.jsx`

- `GET /api/v1/digest/today` çağırır (60 sn polling veya sayfa yenilemede)
- Yükleme: skeleton
- Veri yok: "Özet hazırlanıyor..." placeholder
- Gösterir: özet metni + topic chip'leri + üretim saati + sonraki slot
- **Tasarım:** `rounded-xl`, yeşil sol border (`border-left: 3px solid`), Sparkles ikonu + "Günün Özeti" başlığı

### 3c. Sağ Bileşen — `TrendingPanel.jsx`

- `GET /api/v1/news?sort=popular&date_from=today&size=10&category=...` çağırır
- 5 dakikada bir yenilenir (interval)
- Kategori değişince yeniden fetch
- Her madde: sıra numarası + başlık + tıklamaya orantılı progress bar + kaynak sayısı
- **Tasarım:** `rounded-xl`, mavi-mor sol border, TrendingUp ikonu + "Bugün Trend" başlığı

### 3d. Hook'lar

- `useDigest.js` — summary fetch + polling
- `useTrending.js` — trending fetch + 5dk interval + category dependency

---

## 4. Responsive

| Ekran | Davranış |
|-------|----------|
| `lg` (1024px+) | 3 sütun tam görünüm |
| `md` (768-1024px) | Sol sidebar gizli, sağ sidebar altına taşır |
| `sm` (768px altı) | Tek sütun, sağ sidebar en alta |

---

## 5. Kota & Maliyet

- Günde 4 çalışma × ~800 input token + ~300 output token = **~4400 token/gün**
- Gemini Flash fiyatı: ihmal edilebilir
- Hata durumunda (API down, parse hatası): sessizce geç, bir önceki özet gösterilmeye devam eder

---

## 6. Migration

```sql
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    summary_text TEXT NOT NULL,
    topics JSONB NOT NULL DEFAULT '[]',
    article_count INTEGER NOT NULL DEFAULT 0,
    slot VARCHAR(5) NOT NULL,
    UNIQUE(summary_date, slot)
);
CREATE INDEX idx_ds_date ON daily_summaries(summary_date DESC);
```

---

## 7. Dosya Listesi

**Yeni:**
- `app/models/models.py` — `DailySummary` modeli ekle
- `app/schemas/schemas.py` — `DailySummaryResponse` schema
- `app/api/v1/endpoints/digest.py` — `/digest/today` endpoint
- `workers/daily_digest_task.py` — Celery task
- `frontend/src/hooks/useDigest.js`
- `frontend/src/hooks/useTrending.js`
- `frontend/src/components/features/gundem/DailySummaryPanel.jsx`
- `frontend/src/components/features/gundem/TrendingPanel.jsx`

**Değişen:**
- `app/api/v1/router.py` — digest router ekle
- `workers/tasks.py` — 4 yeni beat schedule
- `frontend/src/pages/Gundem.jsx` — 3 sütun layout
