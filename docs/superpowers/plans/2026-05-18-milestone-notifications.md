# Milestone Notification System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozet kazanımı ve seviye atlamada WebSocket üzerinden sağdan kayan bildirim kartı + ses efekti göster.

**Architecture:** `award_xp()` fonksiyonu milestone tespit ettiğinde `publish_async()` ile `user:{user_id}:events` Redis kanalına mesaj yayınlar. Mevcut WS endpoint bu mesajı frontend'e iletir. `MilestoneContainer` `xp_milestone` event'ini dinleyip bağımsız bir yığında bildirim gösterir.

**Tech Stack:** FastAPI + Redis pub/sub (backend), React 19 + Web Audio API + Lucide React (frontend)

---

## Dosya Yapısı

| Dosya | İşlem | Sorumluluk |
|-------|--------|------------|
| `app/services/xp_service.py` | Değiştir | award_xp sonunda milestone publish et |
| `frontend/src/utils/milestoneSound.js` | Yeni | Web Audio API chime |
| `frontend/src/components/ui/MilestoneNotification.jsx` | Yeni | Tek milestone kartı |
| `frontend/src/components/ui/MilestoneContainer.jsx` | Yeni | Yığın yönetimi + WS subscribe |
| `frontend/src/index.css` | Değiştir | milestone-slide-in/out keyframe'leri |
| `frontend/src/components/Layout.jsx` | Değiştir | MilestoneContainer ekle |

---

## Task 1: Backend — award_xp milestone publish

**Files:**
- Modify: `app/services/xp_service.py`

Mevcut `award_xp` fonksiyonu rozet ve level bilgisini zaten hesaplıyor ama WebSocket'e göndermiyor. `old_level`'ı flush öncesi kaydet, badge check sonrası milestone varsa Redis'e publish et.

- [ ] **Adım 1: `xp_service.py`'yi oku**

`app/services/xp_service.py` dosyasının 192–242. satırlarını oku. Özellikle şu üç satırı bul:
```python
new_total_xp = (user_row.total_xp or 0) + xp_amount
user_row.total_xp = new_total_xp
user_row.level = level_from_xp(new_total_xp)
```

- [ ] **Adım 2: `old_level` satırını ekle**

`new_total_xp` hesabının HEMEN ÖNÜNE şunu ekle:
```python
old_level = user_row.level or 1
```

- [ ] **Adım 3: Fonksiyon sonunu güncelle**

`new_badges` listesi oluşturulan satırların hemen altında (return'den önce) şu bloğu ekle:

```python
    # Milestone varsa WebSocket üzerinden kullanıcıya bildir
    level_up = user_row.level if user_row.level > old_level else None
    if new_keys or level_up:
        from app.core.pubsub import publish_async
        await publish_async(
            f"user:{user_id}:events",
            "xp_milestone",
            {
                "badges": new_badges,
                "level_up": level_up,
                "xp_gained": xp_amount,
            },
        )
```

- [ ] **Adım 4: Dosyanın son halini doğrula**

Fonksiyon şu sırayla çalışmalı:
1. `old_level = user_row.level or 1`
2. `new_total_xp` hesabı
3. `user_row.total_xp = new_total_xp`
4. `user_row.level = level_from_xp(new_total_xp)`
5. `await db.flush()`
6. `new_keys = await check_and_unlock_badges(...)`
7. `new_badges = [...]`
8. `level_up = ...` + `publish_async` bloğu
9. `return {"xp_gained": ..., "new_badges": ...}`

- [ ] **Adım 5: Syntax kontrolü**

```bash
python -c "import ast; ast.parse(open('app/services/xp_service.py').read()); print('OK')"
```

Beklenen: `OK`

- [ ] **Adım 6: Docker içinde import testi**

```bash
docker exec fake-news-detection-system-app-1 python -c "from app.services.xp_service import award_xp; print('OK')"
```

Beklenen: `OK`

- [ ] **Adım 7: Commit**

```bash
git add app/services/xp_service.py
git commit -m "feat: publish xp_milestone WebSocket event on badge/level-up"
```

---

## Task 2: Frontend — milestoneSound.js

**Files:**
- Create: `frontend/src/utils/milestoneSound.js`

Web Audio API ile dış kütüphane olmadan chime sesi. `AudioContext` lazy-init — kullanıcı ilk etkileşiminden sonra çalışır.

- [ ] **Adım 1: Dosyayı oluştur**

```js
// frontend/src/utils/milestoneSound.js
let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

function playNote(ctx, freq, startTime, duration) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Rozet: 2 nota (yükselen)
export function playBadgeSound() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    playNote(ctx, 880,  t,        0.25);
    playNote(ctx, 1320, t + 0.18, 0.30);
  } catch { /* AudioContext henüz izin verilmedi — sessizce atla */ }
}

// Seviye: 3 nota (daha uzun, daha kutlama hissi)
export function playLevelSound() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    playNote(ctx, 660,  t,        0.20);
    playNote(ctx, 880,  t + 0.15, 0.20);
    playNote(ctx, 1320, t + 0.30, 0.35);
  } catch { /* sessizce atla */ }
}
```

- [ ] **Adım 2: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "milestoneSound" | head -5
```

Beklenen: çıktı yok (hata yok).

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/utils/milestoneSound.js
git commit -m "feat: add Web Audio API milestone sound utility"
```

---

## Task 3: Frontend — MilestoneNotification.jsx

**Files:**
- Create: `frontend/src/components/ui/MilestoneNotification.jsx`

- [ ] **Adım 1: Dosyayı oluştur**

```jsx
// frontend/src/components/ui/MilestoneNotification.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Award, TrendingUp, X } from 'lucide-react';

const CONFIG = {
  badge:    { color: '#f59e0b', Icon: Award,      label: 'YENİ ROZET'      },
  level_up: { color: '#10b981', Icon: TrendingUp,  label: 'SEVİYE ATLADIN' },
};

export default function MilestoneNotification({ item, onRemove }) {
  const { color, Icon, label } = CONFIG[item.kind] ?? CONFIG.badge;
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const dismiss = () => {
    setExiting(true);
    setTimeout(onRemove, 200);
  };

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, 6000);
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        background:    '#1c2128',
        borderLeft:    `3px solid ${color}`,
        borderRadius:   4,
        padding:       '9px 12px',
        display:       'flex',
        alignItems:    'center',
        gap:            9,
        width:          280,
        boxShadow:     '0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        position:      'relative',
        overflow:      'hidden',
        animation:      exiting ? 'milestone-slide-out 0.2s ease-in forwards' : 'milestone-slide-in 0.25s ease-out',
        pointerEvents: 'auto',
      }}
    >
      {/* Üst gradient çizgi */}
      <div style={{
        position:   'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        opacity:     0.5,
      }} />

      {/* İkon kare */}
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `rgba(${hexToRgb(color)}, 0.12)`,
        border:     `1px solid rgba(${hexToRgb(color)}, 0.25)`,
      }}>
        <Icon size={14} color={color} />
      </div>

      {/* Metin */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color, fontFamily: 'monospace', marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#eef2f7', lineHeight: 1.3 }}>
          {item.title}
        </div>
        {item.sub && (
          <div style={{ fontSize: '0.67rem', color: '#8b949e', marginTop: 1 }}>
            {item.sub}
          </div>
        )}
      </div>

      {/* Kapat */}
      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#484f58', padding: 0, flexShrink: 0, display: 'flex',
        }}
        aria-label="Kapat"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
```

- [ ] **Adım 2: index.css'e keyframe'leri ekle**

`frontend/src/index.css` içindeki `@keyframes` bloklarının yanına ekle:

```css
@keyframes milestone-slide-in {
  from { opacity: 0; transform: translateX(110%); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes milestone-slide-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(110%); }
}
```

- [ ] **Adım 3: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "MilestoneNotification" | head -5
```

Beklenen: çıktı yok.

- [ ] **Adım 4: Commit**

```bash
git add frontend/src/components/ui/MilestoneNotification.jsx frontend/src/index.css
git commit -m "feat: add MilestoneNotification card component"
```

---

## Task 4: Frontend — MilestoneContainer.jsx

**Files:**
- Create: `frontend/src/components/ui/MilestoneContainer.jsx`

WebSocket `xp_milestone` event'ini dinler, her rozet/level-up için ayrı `MilestoneNotification` oluşturur, sesi çalar.

- [ ] **Adım 1: Dosyayı oluştur**

```jsx
// frontend/src/components/ui/MilestoneContainer.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import wsService from '../../services/websocket';
import MilestoneNotification from './MilestoneNotification';
import { playBadgeSound, playLevelSound } from '../../utils/milestoneSound';

const MAX = 5;
let _counter = 0;

function makeId() { return `ms-${++_counter}`; }

export default function MilestoneContainer() {
  const [items, setItems] = useState([]);
  const addRef = useRef(null);

  const add = useCallback((item) => {
    setItems(prev => {
      const next = prev.length >= MAX ? prev.slice(1) : prev;
      return [...next, item];
    });
  }, []);

  // ref'e kaydet ki event handler'da stale closure olmasın
  addRef.current = add;

  const remove = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  useEffect(() => {
    const unsub = wsService.subscribe('xp_milestone', (payload) => {
      // Level-up bildirimi
      if (payload.level_up) {
        playLevelSound();
        addRef.current({
          id:    makeId(),
          kind:  'level_up',
          title: `Seviye ${payload.level_up}'e Ulaştın`,
          sub:   payload.xp_gained ? `+${payload.xp_gained} XP` : undefined,
        });
      }
      // Her rozet ayrı kart
      (payload.badges ?? []).forEach((badge) => {
        playBadgeSound();
        addRef.current({
          id:    makeId(),
          kind:  'badge',
          title: badge.name,
          sub:   badge.description ?? undefined,
        });
      });
    });
    return unsub;
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position:      'fixed',
        bottom:         20,
        right:          328,
        zIndex:         9100,
        display:       'flex',
        flexDirection: 'column-reverse',
        gap:            8,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <MilestoneNotification
          key={item.id}
          item={item}
          onRemove={() => remove(item.id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Adım 2: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "MilestoneContainer" | head -5
```

Beklenen: çıktı yok.

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/components/ui/MilestoneContainer.jsx
git commit -m "feat: add MilestoneContainer with WebSocket subscribe and sound"
```

---

## Task 5: Frontend — Layout.jsx bağlantısı

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Adım 1: Import ekle**

`Layout.jsx` dosyasının import bloğuna ekle:

```jsx
import MilestoneContainer from './ui/MilestoneContainer';
```

- [ ] **Adım 2: JSX'e ekle**

`<Popup />` satırının hemen altına:

```jsx
<MilestoneContainer />
```

- [ ] **Adım 3: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "Layout" | head -5
```

Beklenen: hata yok (pre-existing `no-unused-vars` Layout.jsx'te zaten mevcuttu, yeni hata eklenmemeli).

- [ ] **Adım 4: Build testi**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Beklenen: `✓ built in` ile biten başarılı çıktı.

- [ ] **Adım 5: Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "feat: wire MilestoneContainer into Layout"
```

---

## Task 6: Docker rebuild ve uçtan uca test

**Files:** Docker containers

- [ ] **Adım 1: app container'ını rebuild et**

```bash
docker-compose up -d --build app
```

Bekle: `fake-news-detection-system-app-1 Started`

- [ ] **Adım 2: Frontend container'ını rebuild et**

```bash
cd frontend && npm run build
docker-compose up -d --build frontend
```

- [ ] **Adım 3: Tüm servisler sağlıklı mı?**

```bash
docker-compose ps
```

Beklenen: `app`, `frontend`, `worker`, `db`, `redis` — hepsi `Up`.

- [ ] **Adım 4: Uçtan uca test**

Tarayıcıda `http://localhost` aç, giriş yap.

**Senaryo A — Analiz ile test:**
Bir haber analiz et. Eğer rozet veya seviye atlanırsa sağ altta (sistem toastının SOLunda) kompakt bar bildirim çıkmalı. Ses de gelmeli.

**Senaryo B — Manuel WebSocket testi (rozetiniz yoksa):**
Browser konsoluna yapıştır:
```js
// WS service'e direkt mesaj enjekte et
const ws = window.__wsService ?? null;
// Alternatif: backend'den manuel publish için docker exec kullan
```

Backend konsolundan test için:
```bash
docker exec fake-news-detection-system-app-1 python -c "
import asyncio, json
from app.db.redis import get_redis

async def test():
    import uuid
    # Kendi user_id'ni buraya yaz (users tablosundan al)
    uid = 'USER_ID_BURAYA'
    r = await get_redis()
    msg = json.dumps({'type': 'xp_milestone', 'payload': {
        'badges': [{'key': 'first_analysis', 'name': 'İlk Adım', 'description': 'İlk analizini yaptın'}],
        'level_up': None,
        'xp_gained': 8
    }})
    await r.publish(f'user:{uid}:events', msg)
    print('Published')

asyncio.run(test())
"
```

Beklenen: Tarayıcıda sağ altta amber renkli `YENİ ROZET / İlk Adım` kartı + badge chime sesi.

- [ ] **Adım 5: Commit (gerekirse)**

Eğer adım 2 sonrası commit yapılmadıysa:
```bash
git add -A
git commit -m "chore: rebuild frontend for milestone notifications"
```

---

## Self-Review — Spec Karşılaştırma

| Spec Gereksinimi | Karşılayan Task |
|------------------|----------------|
| Rozet kazanımı tetikler | Task 1 (new_keys varsa publish) |
| Seviye atlama tetikler | Task 1 (level_up hesabı + publish) |
| WebSocket iletimi | Task 1 (publish_async), Task 4 (subscribe) |
| Compact bar stili | Task 3 (MilestoneNotification) |
| Rozet rengi #f59e0b, ikonu Award | Task 3 (CONFIG.badge) |
| Seviye rengi #10b981, ikonu TrendingUp | Task 3 (CONFIG.level_up) |
| Üst gradient çizgi | Task 3 (absolute div) |
| 6 saniye otomatik kapanma | Task 3 (setTimeout 6000) |
| Manuel × butonu | Task 3 (dismiss button) |
| Sağdan slide-in animasyonu | Task 3 (milestone-slide-in keyframe) |
| right: 328px, z-9100 | Task 4 (MilestoneContainer style) |
| column-reverse yığın (yeniler üste) | Task 4 (flex-direction: column-reverse) |
| Max 5 yığın | Task 4 (MAX = 5, slice(1)) |
| Web Audio API ses | Task 2 (milestoneSound.js) |
| Rozet: 2 nota | Task 2 (playBadgeSound) |
| Seviye: 3 nota | Task 2 (playLevelSound) |
| Layout'a bağlantı | Task 5 |
| Rutin XP bildirimi yok | publish_async sadece milestone varsa çağrılır |
