# Sosyal Paylaşım + Forum Public Access — Tasarım Spec

**Tarih:** 2026-04-13  
**Durum:** Onaylandı — Implementasyona Hazır  
**Kapsam:** Forum public erişim, login nudge, analiz/forum paylaşım linkleri, OG meta tag'leri.

---

## 1. Genel Bakış

İki bağımsız ama birlikte gönderilecek özellik:

1. **Forum Public Access** — Giriş yapmadan forum içeriği okunabilir; eylemler (yorum, oy, bildir) auth gerektirir. 5 görüntülemeden sonra login nudge modal.
2. **Paylaşım** — Analiz sonucu ve forum thread'leri için kopyala/Twitter/WhatsApp dropdown'u + OG meta tag endpoint'leri.

---

## 2. Forum Public Access

### 2.1 Endpoint Değişiklikleri

`app/api/v1/endpoints/forum.py`'de yalnızca GET endpoint'leri değişir:

| Endpoint | Değişiklik |
|----------|-----------|
| `GET /forum/threads` | `get_current_user` → `get_optional_user` |
| `GET /forum/threads/{thread_id}` | `get_current_user` → `get_optional_user` |
| `GET /forum/comments/{thread_id}` | `get_current_user` → `get_optional_user` |

Auth gerektiren endpoint'ler **değişmez**: `POST /forum/threads`, `POST /forum/comments`, `POST /forum/.../vote`, `POST /forum/.../report`, tüm admin endpoint'leri.

`get_optional_user` zaten `app/api/deps.py:35`'te tanımlı — import yeterli.

### 2.2 Public Modda Davranış

- `current_user is None` → kullanıcıya özel alanlar (`user_vote`, kendi yorumları için ekstra flag vb.) atlanır veya `None` döner.
- Moderasyon: `moderation_status == "removed"` olan yorumlar yine gizlenir (public erişimde de).

---

## 3. Login Nudge Modal

### 3.1 Mantık

- `localStorage` anahtarı: `forum_view_count` (integer)
- Giriş yapılmamış kullanıcı her forum sayfası yüklenişinde +1 artar.
- `forum_view_count >= 5` → modal gösterilir, sayaç sıfırlanır.
- Giriş yapılmışsa sayaç hiç artmaz, modal hiç gösterilmez.

### 3.2 Modal İçeriği

```
Daha fazla analiz için giriş yap

Forum tartışmalarına katılmak, oy vermek ve
analiz sonuçlarını paylaşmak için hesap oluştur.

[Giriş Yap]   [Şimdi Değil]
```

- **Giriş Yap** → `/login` sayfasına yönlendirir.
- **Şimdi Değil** → modal kapanır, sayaç sıfırlanır.

### 3.3 Nereye Eklenir

`ForumFeed.jsx` ve `ForumThread.jsx`'e `useEffect` ile view counter hook'u eklenir. Modal bileşeni: `frontend/src/components/ui/LoginNudgeModal.jsx`.

---

## 4. Paylaşım Linkleri

### 4.1 Analiz Sonucu — Yeni Public Endpoint

`GET /analysis/share/{article_id}` — auth gerektirmez.

**Response:**
```json
{
  "article_id": "uuid",
  "title": "İddia metni (50 karakter)",
  "prediction": "FAKE",
  "confidence": 0.87,
  "risk_score": 0.72,
  "clickbait_score": 0.45,
  "created_at": "2026-04-13T..."
}
```

Kullanıcı bilgisi dönmez. Makale bulunamazsa 404.

### 4.2 Forum Thread

Ekstra endpoint gerekmez — mevcut URL (`/forum/thread/{id}`) zaten public olacak.

---

## 5. Share Dropdown Bileşeni

`frontend/src/components/ui/ShareDropdown.jsx` — yeniden kullanılabilir dropdown.

**Props:**
```jsx
<ShareDropdown url="https://..." text="SAHTE (%87) — İddia metni..." />
```

**İçerik:**
```
📋 Link Kopyala
🐦 Twitter'da Paylaş
💬 WhatsApp'ta Paylaş
```

- **Link Kopyala:** `navigator.clipboard.writeText(url)` → "Kopyalandı!" feedback (1.5s).
- **Twitter:** `https://twitter.com/intent/tweet?text=<text>&url=<url>`
- **WhatsApp:** `https://wa.me/?text=<text>%20<url>`

Dropdown dışına tıklanınca kapanır (`useEffect` + `mousedown` listener).

### 5.1 Nereye Entegre Edilir

- `frontend/src/features/analysis/AnalysisResultCard.jsx` — mevcut kart aksiyonlarına "Paylaş" butonu eklenir. URL: `/s/analysis/{article_id}`, text: `"${prediction} (%${confidence}) — ${title} | Sahte Haber Dedektifi"`
- `frontend/src/features/forum/ForumThread.jsx` — thread header'ına "Paylaş" butonu. URL: `window.location.href`

---

## 6. OG Meta Tag Endpoint'leri

### 6.1 Yeni Router: `app/api/v1/endpoints/share.py`

İki endpoint, auth gerektirmez, `text/html` döner:

**`GET /s/analysis/{article_id}`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="Sahte Haber Dedektifi — {PREDICTION} (%{CONFIDENCE})">
  <meta property="og:description" content="'{TITLE}' başlıklı içerik analiz edildi.">
  <meta property="og:image" content="{BASE_URL}/static/og-default.png">
  <meta property="og:url" content="{BASE_URL}/s/analysis/{article_id}">
  <meta name="twitter:card" content="summary">
  <meta http-equiv="refresh" content="0;url={FRONTEND_URL}/analysis/{article_id}">
</head>
<body><script>window.location.href="{FRONTEND_URL}/analysis/{article_id}"</script></body>
</html>
```

**`GET /s/forum/{thread_id}`**

```html
<meta property="og:title" content="Forum — {THREAD_TITLE}">
<meta property="og:description" content="{THREAD_BODY[:150]}">
<meta property="og:image" content="{BASE_URL}/static/og-default.png">
<meta http-equiv="refresh" content="0;url={FRONTEND_URL}/forum/thread/{thread_id}">
```

404 durumunda minimal HTML ile "İçerik bulunamadı" mesajı.

### 6.2 `app/main.py` Değişiklikleri

```python
from app.api.v1.endpoints import share as share_router

app.include_router(share_router.router, prefix="/s", tags=["share"])
app.mount("/static", StaticFiles(directory="static"), name="static")
```

### 6.2.1 Frontend Analiz Paylaşım Sayfası

OG redirect'i `/analysis/share/{article_id}` frontend route'una yönlendirir. Bu route yeni bir public sayfa (`frontend/src/pages/SharedAnalysis.jsx`) render eder — auth gerektirmez, `GET /analysis/share/{article_id}` endpoint'inden veri çeker, sonucu salt okunur gösterir (analiz formu olmadan, yalnızca FAKE/AUTHENTIC + güven skoru + sinyaller).

### 6.3 Statik OG Görseli

`static/og-default.png` — 1200×630px, indigo arkaplan, "Sahte Haber Dedektifi" yazısı. PIL ile tek seferlik oluşturulur; commit edilir.

---

## 7. `FRONTEND_URL` Ayarı

`app/core/config.py`'e yeni ayar:

```python
FRONTEND_URL: str = "http://localhost:5173"
```

Production'da `.env`'den override edilir.

---

## 8. Dosya Haritası

| Dosya | İşlem |
|-------|-------|
| `app/api/v1/endpoints/forum.py` | 3 GET endpoint → `get_optional_user` |
| `app/api/v1/endpoints/analysis.py` | `GET /analysis/share/{id}` ekle |
| `app/api/v1/endpoints/share.py` | Yeni — OG HTML endpoint'leri |
| `app/core/config.py` | `FRONTEND_URL` ayarı |
| `app/main.py` | `/s` router + `/static` mount |
| `static/og-default.png` | Yeni — OG varsayılan görsel |
| `frontend/src/components/ui/ShareDropdown.jsx` | Yeni |
| `frontend/src/components/ui/LoginNudgeModal.jsx` | Yeni |
| `frontend/src/features/analysis/AnalysisResultCard.jsx` | Share butonu ekle |
| `frontend/src/features/forum/ForumThread.jsx` | Share butonu + view counter |
| `frontend/src/features/forum/ForumFeed.jsx` | View counter |
| `frontend/src/pages/SharedAnalysis.jsx` | Yeni — public analiz sonuç sayfası |

---

## 9. Kapsam Dışı

- Server-side OG görsel üretimi (dinamik PNG)
- Facebook / LinkedIn paylaşım butonları
- Analiz sonucuna özel paylaşım sayacı/istatistiği
- Forum thread embed (iframe/widget)
