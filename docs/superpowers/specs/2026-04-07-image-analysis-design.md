# Görsel Analiz & Kota Düzeltmesi — Tasarım Spec'i

**Tarih:** 2026-04-07  
**Kapsam:** Görsel sahtelik analizi (3 katmanlı escalation) + profil sayfası günlük kota bug fix

---

## 1. Genel Bakış

Mevcut metin/URL analizine ek olarak kullanıcıların görsel yapıştırıp/yükleyerek sahtelik tespiti yapabilmesi sağlanır. Sistem üç katmanlı bir escalation mimarisi kullanır: yalnızca Gemini'ye gidilen katman (Layer 3) günlük kotadan düşer.

Aynı PR'da profil sayfasındaki kota gösterimi de düzeltilir: şu anda tüm zamanların toplam analiz sayısını günlük kota olarak gösteriyor, gerçek Redis sayacıyla değiştirilecek.

---

## 2. Veritabanı

### Yeni model: `ImageCache`

```python
# app/models/models.py
class ImageCache(Base):
    __tablename__ = "image_cache"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phash        = Column(String(64), nullable=False, index=True)  # perceptual hash (hex)
    exif_flags   = Column(JSONB, nullable=True)   # {"ai_software": "Midjourney", ...}
    gemini_result = Column(JSONB, nullable=True)  # Layer 3 sonucu
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
```

pHash karşılaştırması Hamming distance ile Python tarafında yapılır (pgvector gerekmez).  
Eşleşme eşiği: **Hamming distance ≤ 10** (≈%85 benzerlik, 64-bit hash üzerinde).

---

## 3. Backend

### 3.1 Yeni endpoint: `POST /analyze/image`

**Dosya:** `app/api/v1/endpoints/analysis.py`  
**Content-Type:** `multipart/form-data` (`file: UploadFile`)  
**Boyut limiti:** 25 MB (FastAPI middleware veya endpoint içi kontrol)

**Akış:**

```
1. Pillow ile aç
   └─ IOError/UnidentifiedImageError → HTTP 400 "Bu format desteklenmiyor, lütfen farklı bir görsel deneyin."

2. imagehash.phash(image) → 64-bit hex string

3. DB'de benzer hash ara (tüm kayıtlar çekilip Python'da Hamming hesaplanır)
   └─ distance ≤ 10 → ImageCacheHit response döner (kota düşmez)

4. EXIF oku (Pillow ile _getexif veya exifread)
   └─ "Software", "Make", "Model", "Artist", "XMP" alanlarında
      "midjourney", "stable diffusion", "dall-e", "firefly", "photoshop"
      gibi anahtar kelime varsa → exif_flags doldurulur

5. check_rate_limit(request, redis, current_user)  ← sadece bu noktada kota düşer

6. Görsel → base64 encode
7. Celery: analyze_image.delay(task_id, image_b64, phash, exif_flags)
8. AnalysisRequest DB'ye loglanır (analysis_type = "image")
9. AnalysisResponse(task_id=...) döner
```

**Response (anında / Layer 1-2 eşleşme):**
```json
{
  "task_id": "...",
  "is_direct_match": true,
  "message": "Bu görsel daha önce analiz edildi.",
  "direct_match_data": {
    "layer": 1,
    "gemini_result": { ... }
  }
}
```

**Response (Gemini kuyruğa alındı):**
```json
{
  "task_id": "...",
  "message": "Görsel analiz kuyruğa alındı.",
  "exif_flags": { "ai_software": "Midjourney" }
}
```
`exif_flags` varsa frontend Layer 2 bulgusunu hemen gösterir, Layer 3 gelene kadar polling yapar.

### 3.2 Yeni Celery task: `analyze_image`

**Dosya:** `workers/image_analysis_task.py`

```python
@celery_app.task(name="analyze_image")
def analyze_image(task_id: str, image_b64: str, phash: str, exif_flags: dict):
    # 1. Gemini 2.5 Flash multimodal prompt
    # 2. Sonucu parse et (verdict, explanation, bounding_boxes, reverse_search_links)
    # 3. image_cache tablosuna kaydet (phash + gemini_result + exif_flags)
    # 4. Sonucu Celery result backend'e yaz
```

**Gemini prompt yapısı:**
```
Sen bir dezenformasyon uzmanısın. Bu görseli incele:
1. AI tarafından üretildi mi? (anatomik hatalar, garip dokular, ışık uyumsuzlukları)
2. Manipülasyon izi var mı? (kopyalama, kesme-yapıştırma, arka plan değiştirme)
3. Bu görseli tersine görsel aramayla araştır — daha önce nerede, hangi bağlamda kullanıldı?
4. Şüpheli bölgeler varsa koordinatlarını [ymin, xmin, ymax, xmax] formatında JSON olarak ver.

Yanıtı şu JSON formatında döndür:
{
  "verdict": "AI_GENERATED|MANIPULATED|AUTHENTIC|UNCERTAIN",
  "confidence": 0.0-1.0,
  "explanation": "...",
  "bounding_boxes": [{"coords": [y1,x1,y2,x2], "label": "..."}],
  "reverse_search_links": [{"title": "...", "url": "...", "context": "..."}]
}
```

**Önemli:** `reverse_search_links`'teki URL'ler Gemini'nin döndürdüğü değerlerdir, backend doğrulamaz — frontend "Kaynağı doğrulayın" uyarısıyla gösterir.

**Not:** `exif_flags` hem ilk POST response'unda hem de task tamamlandığında Celery result içinde bulunmalıdır. Frontend'in polling sırasında Layer 2 bulgusunu koruyabilmesi için `useImageAnalysis.js` state'e ilk response'dan alınan `exif_flags`'i saklar ve polling boyunca kullanır.

### 3.3 Kota endpoint'i: `GET /users/me/quota`

**Dosya:** `app/api/v1/endpoints/users.py`

```python
@router.get("/me/quota")
async def my_quota(current_user, redis):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"rl:user:{current_user.id}:{today}"
    count = int(await redis.get(key) or 0)
    limit = settings.RATE_LIMIT_USER
    return {
        "used": count,
        "limit": limit,
        "remaining": max(0, limit - count),
        "reset_at": _midnight_epoch()  # rate_limit.py'den import
    }
```

### 3.4 AnalysisType enum güncellemesi

```python
class AnalysisType(str, enum.Enum):
    text  = "text"
    url   = "url"
    image = "image"   # yeni
```

### 3.5 requirements.txt

```
imagehash   # pHash hesaplama
Pillow      # zaten var olabilir — kontrol edilecek
exifread    # EXIF okuma (Pillow fallback olarak yeterli olabilir, ikisi de denenecek)
```

---

## 4. Frontend

### 4.1 AnalysisForm.jsx — sekme ekleme

Mevcut `[ Metin ] [ URL ]` sekme yapısına `[ Görsel ]` eklenir.  
Aktif sekmeye göre ilgili alt bileşen render edilir.

### 4.2 Yeni bileşen: `ImageDropZone.jsx`

**Özellikler:**
- Büyük noktalı-kenarlıklı drop alanı
- `onPaste` window event listener → `event.clipboardData.items` içinden `image/*` türünü yakalar
- `<input type="file" accept="image/*">` → dosya seçimi
- 25 MB frontend kontrolü → aşılırsa "Görsel 25 MB'dan büyük olamaz" hatası
- Seçilen görsel → `<img>` thumbnail önizleme + "Analiz Et" butonu aktif
- Sürükle-bırak desteği (`onDragOver`, `onDrop`)

### 4.3 Yeni bileşen: `ImageResultCard.jsx`

Üç bölümlü kart:

```
┌─ KATMAN 1: Veritabanı Eşleşmesi ──────────────────┐
│ ✅ Yeni görsel  /  ⚠️ Daha önce analiz edildi      │
└────────────────────────────────────────────────────┘

┌─ KATMAN 2: EXIF Metadata ─────────────────────────┐
│ 🟡 Şüpheli: "Midjourney" yazılım izi bulundu       │
│ ✅ Temiz: Metadata şüphe içermiyor                  │
└────────────────────────────────────────────────────┘

┌─ KATMAN 3: Gemini AI Analizi ─────────────────────┐
│ [Yükleniyor... / Sonuç]                            │
│                                                    │
│ Karar: AI_GENERATED | MANIPULATED | AUTHENTIC      │
│ Güven: %87                                         │
│                                                    │
│ 🖼 Görsel + bounding box overlay (varsa)           │
│    Hover → açıklama tooltip                        │
│                                                    │
│ Açıklama: "..."                                    │
│                                                    │
│ Tersine Arama Kaynakları:                          │
│  • [Başlık] — bağlam açıklaması  (⚠️ doğrulayın) │
└────────────────────────────────────────────────────┘
```

**Bounding box overlay:**
- `<canvas>` görsel üzerine `position: absolute` ile bindirme
- Gemini koordinatları `[ymin, xmin, ymax, xmax]` normalize edilir (0-1000 scale → gerçek px)
- Her kutu kırmızı kenarlık, hover'da `title` tooltip
- Koordinat yoksa canvas render edilmez

### 4.4 Yeni hook: `useImageAnalysis.js`

`useAnalysis.js` ile aynı polling mantığı:
- `submitImage(file)` → `FormData` ile `POST /analyze/image`
- `exif_flags` varsa hemen state'e yaz (Layer 2 anında gösterilir)
- `task_id` varsa `/status/{task_id}` polling başlar (2 sn aralık, max 60 sn)

### 4.5 Profile.jsx — kota fix

**Mevcut (hatalı):**
```jsx
// historyTotal = tüm zamanların toplam analiz sayısı
<p>Günlük kota: {Math.min(historyTotal, 20)}/20</p>
```

**Yeni:**
```jsx
// GET /users/me/quota → { used, limit, remaining }
const [quota, setQuota] = useState(null);
useEffect(() => { AuthService.getQuota().then(setQuota); }, []);
<p>Günlük kota: {quota ? `${quota.used}/${quota.limit}` : '…'}</p>
```

`AuthService.getQuota()` → `GET /users/me/quota` çağrısı.

---

## 5. Hata Yönetimi

| Durum | Katman | Davranış |
|---|---|---|
| Pillow açamadı | Backend | HTTP 400 "Bu format desteklenmiyor, lütfen farklı bir görsel deneyin." |
| >25 MB | Frontend | Anında red, backend'e gidilmez |
| Kota dolu | Backend Layer 3 | HTTP 429 "Günlük görsel analiz limitinize ulaştınız." |
| Gemini koordinat dönmez | Task | `bounding_boxes: []` → overlay render edilmez |
| Gemini timeout/hata | Task | `FAILED` → "Analiz tamamlanamadı, tekrar deneyin." |
| Reverse link güvenilirliği | Frontend | Her linkin yanında "⚠️ Kaynağı doğrulayın" uyarısı |

---

## 6. Değişen Dosyalar

```
backend:
  app/models/models.py                      ImageCache model, AnalysisType.image
  app/schemas/schemas.py                    ImageAnalysisResponse schema
  app/api/v1/endpoints/analysis.py          POST /analyze/image
  app/api/v1/endpoints/users.py             GET /me/quota
  workers/image_analysis_task.py            (yeni) analyze_image Celery task
  app/main.py                               router/task kaydı (gerekirse)
  requirements.txt                          imagehash, exifread kontrolü

frontend:
  src/features/analysis/AnalysisForm.jsx    Görsel sekmesi ekleme
  src/features/analysis/ImageDropZone.jsx   (yeni)
  src/features/analysis/ImageResultCard.jsx (yeni)
  src/hooks/useImageAnalysis.js             (yeni)
  src/services/auth.service.js              getQuota() metodu
  src/pages/Profile.jsx                     kota fix
```

---

## 7. Kapsam Dışı (Bu Spec'te Yok)

- Görsel moderasyon / NSFW filtresi
- Görsel thumbnail'ın DB'ye kaydedilmesi
- Kullanıcı geçmişinde görsel analizlerin listelenmesi (text/url ile aynı tablo ama UI gösterimi yok)
- Batch görsel analizi
