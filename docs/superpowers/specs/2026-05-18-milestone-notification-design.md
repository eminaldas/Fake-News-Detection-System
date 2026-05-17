# Başarım Bildirim Sistemi — Milestone Notifications

**Tarih:** 2026-05-18  
**Stil:** Compact Bar — B (mevcut toast sistemiyle aynı form dili)  
**İletim:** WebSocket push (`xp_milestone` event)

---

## 1. Genel Prensipler

- Rutin XP kazanımları (analiz, yorum, oy) **bildirim göstermez**.
- Yalnızca **rozet kazanımı** ve **seviye atlama** tetikler.
- Başarım bildirimleri sistem toastlarından (hata/bilgi) **tamamen bağımsız** yığılır.
- Ses: Web Audio API ile programatik chime — dış kütüphane eklenmez.
- Backend → Redis pub/sub → WebSocket → Frontend akışı; her endpoint'i ayrı ayrı değiştirmeye gerek yok.

---

## 2. Tetikleyiciler

| Olay | Renk | İkon (Lucide) | Etiket |
|------|------|---------------|--------|
| Rozet kazanıldı | `#f59e0b` | `Award` | `YENI ROZET` |
| Seviye atlandı | `#10b981` | `TrendingUp` | `SEVİYE ATLADIN` |

Birden fazla rozet aynı anda kazanılabilir — her biri ayrı kart olarak yığılır.

---

## 3. Frontend — MilestoneContainer

### Dosyalar

| Dosya | İşlem | Sorumluluk |
|-------|--------|------------|
| `frontend/src/components/ui/MilestoneNotification.jsx` | Yeni | Tek milestone kartı |
| `frontend/src/components/ui/MilestoneContainer.jsx` | Yeni | Yığın yönetimi, WebSocket subscribe |
| `frontend/src/utils/milestoneSound.js` | Yeni | Web Audio API chime |
| `frontend/src/components/Layout.jsx` | Değiştir | `<MilestoneContainer />` ekle |

### Görünüm — MilestoneNotification

```
┌─ #1c2128 ──────────────────────────────── ┐
▌ gradient top line (var(--mc) → transparent) │
▌ [İkon kare]  YENI ROZET             [×]   │ ← border-left: 3px solid var(--mc)
▌              Kanıtçı                       │   border-radius: 4px
▌              10 kanıt ekledin             │   width: 280px, padding: 9px 12px
└──────────────────────────────────────────  ┘
```

- **İkon kare:** `26×26px`, `border-radius: 6px`, `background: rgba(mc, 0.12)`, `border: 1px solid rgba(mc, 0.25)`
- **Etiket:** `0.57rem`, `font-weight: 700`, `letter-spacing: 0.12em`, `text-transform: uppercase`, monospace, renkli
- **Başlık:** `0.76rem`, `font-weight: 600`, `#eef2f7`
- **Alt metin:** `0.67rem`, `#8b949e`
- **Üst gradient:** `height: 1px`, `linear-gradient(90deg, var(--mc), transparent)`, `opacity: 0.5`
- `box-shadow: 0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`

### Animasyon

- **Giriş:** `translateX(110%) → translateX(0)`, 250ms ease-out
- **Çıkış:** `translateX(0) → translateX(110%)`, 200ms ease-in, sonra DOM'dan kaldır
- Keyframe: `milestone-slide-in`, `milestone-slide-out` — `index.css`'e eklenir

### Otomatik Kapanma

- **6 saniye** → slide-out → remove
- Manuel × butonu ile erken kapatılabilir
- Progress bar YOK (milestone kalıcı hissini verir)

### Pozisyon & Z-index

```css
position: fixed;
bottom: 20px;
right: 328px;   /* sistem toastının (right: 20px, width: 300px) solunda + 8px boşluk */
z-index: 9100;  /* toast z-9000'in üstünde */
display: flex;
flex-direction: column-reverse; /* yeniler üste */
gap: 8px;
pointer-events: none; /* container */
/* Her kart: pointer-events: auto */
```

### Kuyruk Yönetimi — MilestoneContainer

- Max **5** milestone aynı anda görünür — 5 aşılırsa en eski düşer
- WebSocket'ten gelen `xp_milestone` event'i ayrıştırılır:
  ```js
  // payload shape:
  {
    type: 'xp_milestone',
    badges: [{ key, name, description }],  // kazanılan rozetler (0+)
    level_up: 6 | null,                    // yeni seviye (null = atlama yok)
    xp_gained: 15                          // bu aksiyondan kazanılan XP
  }
  ```
- Her rozet → ayrı milestone kartı
- `level_up` varsa → ayrı milestone kartı

---

## 4. Ses — milestoneSound.js

Web Audio API, dış kütüphane yok. `AudioContext` lazy-init edilir (kullanıcı etkileşimi sonrası).

```js
// Rozet sesi: 2 nota (880Hz → 1320Hz)
// Seviye sesi: 3 nota (660Hz → 880Hz → 1320Hz)
// Her nota: 0.15s, gain: 0.0 → 0.2 → 0.0 (envelope)
// Toplam süre: rozet ~0.5s, seviye ~0.7s
```

- `playMilestoneSound('badge')` / `playMilestoneSound('level_up')`
- Gain max `0.2` — sessiz, rahatsız etmez
- `AudioContext` not allowed öncesi çağrılırsa sessizce atlar (try/catch)

---

## 5. Backend — WebSocket Entegrasyonu

### Akış

```
award_xp() → new_badges?, level_up?
    ↓ (milestone varsa)
Redis PUBLISH milestone:{user_id}
    ↓
WebSocket manager subscriber
    ↓
ws.send({ type: 'xp_milestone', badges: [...], level_up: N, xp_gained: X })
    ↓
Frontend MilestoneContainer
```

### xp_service.py değişiklikleri

`award_xp` fonksiyonu sonunda, `new_keys` (yeni rozetler) veya level değişimi varsa:

```python
# Mevcut level hesabı
old_level = user_row.level or 1
user_row.level = level_from_xp(new_total_xp)
level_up = user_row.level if user_row.level > old_level else None

# Milestone payload
if new_keys or level_up:
    payload = {
        "type": "xp_milestone",
        "badges": [
            {"key": k, "name": BADGE_BY_KEY[k].name, "description": BADGE_BY_KEY[k].description}
            for k in new_keys if k in BADGE_BY_KEY
        ],
        "level_up": level_up,
        "xp_gained": xp_amount,
    }
    await redis.publish(f"milestone:{user_id}", json.dumps(payload))
```

### WebSocket manager

Mevcut WebSocket altyapısına `milestone:{user_id}` kanalını subscribe eden bir Redis listener eklenir. Kullanıcı bağlandığında channel'a subscribe, bağlantı kesilince unsubscribe.

Backend'deki mevcut WebSocket connection manager'ı (`app/api/v1/endpoints/` içinde bulunuyor) genişletilir:
- `subscribe_milestones(user_id, websocket)` 
- `unsubscribe_milestones(user_id)`

---

## 6. Layout.jsx Değişikliği

```jsx
import MilestoneContainer from './ui/MilestoneContainer';

// JSX içinde <Popup /> ile <ToastContainer /> yanına:
<MilestoneContainer />
```

---

## 7. Kapsam Dışı

- Rutin XP bildirimi (her aksiyonda toast) — yapılmaz
- Milestone geçmişi (görüntüleme sayfası) — kapsam dışı
- Push notification (browser notification API) — kapsam dışı
- Ses ayarı (kullanıcı ses kapatabilsin) — kapsam dışı, sonraki iterasyon
