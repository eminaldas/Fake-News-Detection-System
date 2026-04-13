# Tarayıcı Uzantısı — Tasarım Spec

**Tarih:** 2026-04-13  
**Durum:** Onaylandı — Implementasyona Hazır  
**Kapsam:** Chrome Manifest V3 extension — iki katmanlı analiz, popup + floating badge.

---

## 1. Genel Bakış

Kullanıcı başka haber sitelerini okurken analiz yapabilsin. İki katman:

1. **Anlık sinyal** — Sayfa yüklenince başlık NLP'den geçer, badge renk alır (~100ms).
2. **Detaylı analiz** — Kullanıcı isteğe bağlı tetikler, tam pipeline çalışır.

---

## 2. Dosya Yapısı

```
extension/
├── manifest.json
├── background.js          # service worker — API çağrıları, token yönetimi
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── content.js         # floating badge
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 3. Auth

`POST /auth/login` isteğine opsiyonel `client` alanı eklenir:

```json
{ "email": "...", "password": "...", "client": "extension" }
```

`client == "extension"` → JWT expiry **7 gün** (normal: 30 dakika).  
Token `chrome.storage.local`'da saklanır. Süresi dolunca popup login formuna düşer.

---

## 4. Popup — 3 State

| State | İçerik |
|-------|--------|
| **Login** | Email + şifre formu, "Giriş Yap" butonu |
| **Analiz** | Mevcut URL gösterilir, "Anlık Sonuç" varsa badge gösterilir, "Detaylı Analiz Et" butonu |
| **Sonuç** | FAKE / GERÇEĞİ YANSITMIYOR + güven % + tek satır açıklama + "Yeniden Analiz" |

Popup'tan sonuç gelince `chrome.tabs.sendMessage` → content script badge'i günceller.

---

## 5. Content Script & Floating Badge

**Heuristik:** Sayfada `<article>` veya uzun `<p>` blokları varsa haber sayfası sayılır.

**Badge** — `position: fixed`, sağ alt, 48×48px, `z-index: 9999`:

| State | Görünüm |
|-------|---------|
| Başlangıç | Gri, "?" — tıklayınca popup açılır |
| Katman 1 analiz ediliyor | Spinner |
| Katman 1 sonucu — temiz | Gri-yeşil |
| Katman 1 sonucu — şüpheli | Sarı |
| Katman 2 sonucu | Kırmızı (FAKE) veya Yeşil (GERÇEK) + skor |

Hover → kısa açıklama tooltip. Her sekme kendi state'ini tutar.

---

## 6. İki Katmanlı Analiz Akışı

### Katman 1 — Anlık Sinyal (otomatik)

1. Content script çalışır, heuristik geçerse `document.title` okunur.
2. Background worker'a mesaj gönderilir.
3. Background worker: `POST /analyze/signals` → `{ "text": "<başlık>" }`
4. Response: NLP sinyalleri (clickbait_score, uppercase_ratio, vs.) + genel risk skoru
5. Badge güncellenir (gri/sarı).

### Katman 2 — Detaylı Analiz (kullanıcı tetikler)

1. Popup'ta "Detaylı Analiz Et" tıklanır veya badge'e tıklanır.
2. Background worker: `POST /analyze/url` → `{ "url": "<current_url>" }`
3. Polling: `/analysis/status/{task_id}` her 2 saniyede (max 30s).
4. Sonuç popup'a + badge'e yazılır.

---

## 7. Backend Değişiklikleri

### 7.1 Yeni endpoint: `POST /analyze/signals`

`app/api/v1/endpoints/analysis.py`'ye eklenir.

```python
class SignalsRequest(BaseModel):
    text: str  # sayfa başlığı, max 500 karakter

class SignalsResponse(BaseModel):
    clickbait_score:   float
    uppercase_ratio:   float
    exclamation_ratio: float
    risk_score:        float   # hesaplanmış genel risk (0-1)
    label:             str     # "clean" | "suspicious"
```

Mevcut `cleaner.py`'deki sinyal fonksiyonlarını çağırır. Auth gerekir. BERT/ML çalışmaz.

### 7.2 Login — extension token

`POST /auth/login` response'unda `client=extension` ise `exp = now + 7 days`.

### 7.3 CORS

`app/main.py`'deki `ALLOWED_ORIGINS`'e eklenir:

```python
"chrome-extension://*"
```

---

## 8. Kapsam Dışı

- Firefox desteği
- Refresh token altyapısı
- Sayfa görseli analizi (image analysis extension'da yok)
- Otomatik Katman 2 analiz (her zaman kullanıcı tetikler)
