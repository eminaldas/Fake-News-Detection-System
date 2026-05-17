# UI Feedback Sistemi — Tooltip · Toast · Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projeye genel amaçlı Tooltip, unified Toast ve Popup bileşenleri ekle; mevcut XPToast'u kaldır.

**Architecture:** `toast.js` ve `popup.js` singleton servisleri pub/sub pattern ile çalışır — herhangi bir dosyadan `import toast from '@/services/toast'` yapılarak çağrılır. `ToastContainer` ve `Popup` bileşenleri `Layout.jsx`'e eklenir, böylece tüm sayfalardan erişilebilir. `Tooltip` ise wrapper component olarak, `ReactDOM.createPortal` ile `document.body`'ye render eder ve `getBoundingClientRect` ile konumlanır.

**Tech Stack:** React 19, Lucide React, Tailwind CSS 4, ReactDOM.createPortal

---

## Dosya Yapısı

| Dosya | İşlem | Sorumluluk |
|-------|--------|------------|
| `frontend/src/services/toast.js` | **Yeni** | Toast pub/sub singleton |
| `frontend/src/components/ui/Toast.jsx` | **Yeni** | Tek toast item render |
| `frontend/src/components/ui/ToastContainer.jsx` | **Yeni** | Queue yönetimi, fixed konumlandırma |
| `frontend/src/components/ui/Tooltip.jsx` | **Yeni** | Hover wrapper, portal render |
| `frontend/src/services/popup.js` | **Yeni** | Popup pub/sub singleton |
| `frontend/src/components/ui/Popup.jsx` | **Yeni** | Confirm + Info diyalog, overlay |
| `frontend/src/components/Layout.jsx` | **Değiştir** | XPToast → ToastContainer + Popup |
| `frontend/src/services/gamification.service.js` | **Değiştir** | XPToast.show → toast.xp / toast.badge |
| `frontend/src/components/common/XPToast.jsx` | **Sil** | Artık kullanılmıyor |

---

## Task 1: `toast.js` — Singleton Servis

**Files:**
- Create: `frontend/src/services/toast.js`

- [ ] **Adım 1: Dosyayı oluştur**

```js
// frontend/src/services/toast.js
let _emit = null;

function _show(type, title, options = {}) {
  if (!_emit) return;
  _emit({
    type,
    title,
    sub:      options.sub      ?? null,
    duration: options.duration ?? 4000,
    id:       options.id       ?? `toast-${Date.now()}-${Math.random()}`,
  });
}

const toast = {
  success: (title, opts = {}) => _show('success', title, opts),
  error:   (title, opts = {}) => _show('error',   title, { duration: 0, ...opts }),
  info:    (title, opts = {}) => _show('info',    title, opts),
  warning: (title, opts = {}) => _show('warning', title, opts),

  xp: (amount, opts = {}) => {
    const sub = opts.level != null && opts.xpBar
      ? `Seviye ${opts.level} · ${opts.xpBar[0]} / ${opts.xpBar[1]} XP`
      : undefined;
    _show('xp', `+${amount} XP${opts.label ? ` — ${opts.label}` : ''}`, { sub, ...opts });
  },

  badge: (opts = {}) => {
    _show('badge', `Yeni Rozet — ${opts.name}`, {
      sub:      opts.description ?? null,
      duration: 5000,
      ...opts,
    });
  },

  _register:   (emit) => { _emit = emit; },
  _unregister: ()     => { _emit = null; },
};

export default toast;
```

- [ ] **Adım 2: Lint kontrolü**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep -E "error|warning" | head -20
```

Beklenen: `toast.js` için hata yok.

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/services/toast.js
git commit -m "feat: add toast singleton service"
```

---

## Task 2: `Toast.jsx` — Tek Toast Item

**Files:**
- Create: `frontend/src/components/ui/Toast.jsx`

- [ ] **Adım 1: Dosyayı oluştur**

```jsx
// frontend/src/components/ui/Toast.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, AlertCircle, Info, AlertTriangle,
  Zap, Award, X,
} from 'lucide-react';

const TYPE_CONFIG = {
  success: { color: '#10b981', Icon: CheckCircle },
  xp:      { color: '#10b981', Icon: Zap         },
  badge:   { color: '#f59e0b', Icon: Award        },
  error:   { color: '#ef4444', Icon: AlertCircle  },
  info:    { color: '#3b82f6', Icon: Info         },
  warning: { color: '#f59e0b', Icon: AlertTriangle },
};

export default function Toast({ item, onRemove }) {
  const { color, Icon } = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const dismiss = () => {
    setExiting(true);
    setTimeout(onRemove, 220);
  };

  useEffect(() => {
    if (!item.duration) return;
    timerRef.current = setTimeout(dismiss, item.duration);
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.duration]);

  return (
    <div
      style={{
        background:  '#1c2128',
        borderLeft:  `3px solid ${color}`,
        borderRadius: 4,
        padding:     '10px 12px',
        display:     'flex',
        alignItems:  'flex-start',
        gap:          8,
        boxShadow:   '0 2px 12px rgba(0,0,0,0.35)',
        width:        300,
        position:    'relative',
        overflow:    'hidden',
        opacity:      exiting ? 0 : 1,
        transform:    exiting ? 'translateX(110%)' : 'translateX(0)',
        transition:  'opacity 0.22s ease-out, transform 0.22s ease-out',
      }}
    >
      {/* İkon */}
      <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />

      {/* İçerik */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#eef2f7', lineHeight: 1.4 }}>
          {item.title}
        </div>
        {item.sub && (
          <div style={{ fontSize: '0.68rem', color: '#8b949e', marginTop: 2 }}>
            {item.sub}
          </div>
        )}
      </div>

      {/* Kapat */}
      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#484f58', padding: 0, flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Kapat"
      >
        <X size={13} />
      </button>

      {/* Progress bar — sadece otomatik kapananlarda */}
      {item.duration > 0 && (
        <div
          style={{
            position:        'absolute',
            bottom:          0,
            left:            0,
            height:          2,
            background:      color,
            opacity:         0.35,
            borderRadius:    '0 2px 2px 0',
            width:           '100%',
            animation:       `toast-progress ${item.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Adım 2: `index.css`'e progress animasyonunu ekle**

`frontend/src/index.css` dosyasının animasyonlar bölümüne şunu ekle (varolan `@keyframes` bloklarının yanına):

```css
@keyframes toast-progress {
  from { width: 100%; }
  to   { width: 0%; }
}
```

- [ ] **Adım 3: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
```

Beklenen: hata yok.

- [ ] **Adım 4: Commit**

```bash
git add frontend/src/components/ui/Toast.jsx frontend/src/index.css
git commit -m "feat: add Toast item component with progress bar"
```

---

## Task 3: `ToastContainer.jsx` — Queue Yönetimi

**Files:**
- Create: `frontend/src/components/ui/ToastContainer.jsx`

- [ ] **Adım 1: Dosyayı oluştur**

```jsx
// frontend/src/components/ui/ToastContainer.jsx
import React, { useCallback, useEffect, useState } from 'react';
import toast from '../../services/toast';
import Toast from './Toast';

const MAX_TOASTS = 5;

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const emit = (item) => {
      setItems(prev => {
        // Aynı id varsa replace et
        const exists = prev.findIndex(t => t.id === item.id);
        if (exists !== -1) {
          const next = [...prev];
          next[exists] = item;
          return next;
        }
        // Max 5: en eskiyi at
        const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
        return [...next, item];
      });
    };

    toast._register(emit);
    return () => toast._unregister();
  }, []);

  return (
    <div
      style={{
        position:      'fixed',
        bottom:         20,
        right:          20,
        zIndex:         9000,
        display:       'flex',
        flexDirection: 'column',
        gap:            8,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <div key={item.id} style={{ pointerEvents: 'auto' }}>
          <Toast item={item} onRemove={() => remove(item.id)} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Adım 2: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
```

- [ ] **Adım 3: Commit**

```bash
git add frontend/src/components/ui/ToastContainer.jsx
git commit -m "feat: add ToastContainer with queue management"
```

---

## Task 4: Layout migration — XPToast → ToastContainer

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Delete: `frontend/src/components/common/XPToast.jsx`
- Modify: `frontend/src/services/gamification.service.js`

- [ ] **Adım 1: `Layout.jsx`'te XPToast'u kaldır, ToastContainer ekle**

`Layout.jsx` dosyasında şu satırı bul ve kaldır:
```jsx
import XPToast from './common/XPToast';
```

Yerine ekle:
```jsx
import ToastContainer from './ui/ToastContainer';
```

JSX içinde `<XPToast />` olan yeri bul (satır ~325) ve şununla değiştir:
```jsx
<ToastContainer />
```

- [ ] **Adım 2: `gamification.service.js`'i migrate et**

`frontend/src/services/gamification.service.js` dosyasının tamamını şununla değiştir:

```js
// frontend/src/services/gamification.service.js
import axiosInstance from '../api/axios';
import toast from './toast';

const _XP_KEY = 'xp_last_known';

async function checkAndShowXPGain(label = '') {
  try {
    const stats = await axiosInstance.get('/gamification/me/stats').then(r => r.data);
    const newXP  = stats.total_xp || 0;
    const lastXP = parseInt(localStorage.getItem(_XP_KEY) || '0', 10);
    const gained = newXP - lastXP;
    localStorage.setItem(_XP_KEY, String(newXP));
    if (gained > 0) {
      toast.xp(gained, {
        label,
        level:  stats.level,
        xpBar:  [stats.total_xp - stats.xp_to_next_level + (stats.xp_to_next_level - (stats.xp_to_next_level - gained)), stats.total_xp + stats.xp_to_next_level],
      });
    }
  } catch { /* sessizce geç */ }
}

const GamificationService = {
  checkAndShowXPGain,
  getMyStats:      ()         => axiosInstance.get('/gamification/me/stats').then(r => r.data),
  getUserStats:    (userId)   => axiosInstance.get(`/gamification/users/${userId}/stats`).then(r => r.data),
  getMyBadges:     ()         => axiosInstance.get('/gamification/me/badges').then(r => r.data),
  getBadgeCatalog: ()         => axiosInstance.get('/gamification/badges').then(r => r.data),
  getUserShowcase: (userId)   => axiosInstance.get(`/gamification/users/${userId}/showcase`).then(r => r.data),
  updateShowcase:  (badgeKeys)=> axiosInstance.post('/gamification/me/showcase', badgeKeys).then(r => r.data),
  getLeaderboard:  (period = 'alltime', type = 'xp') =>
    axiosInstance.get('/gamification/leaderboard', { params: { period, type } }).then(r => r.data),
};

export default GamificationService;
```

- [ ] **Adım 3: `XPToast.jsx`'i sil**

```bash
git rm frontend/src/components/common/XPToast.jsx
```

- [ ] **Adım 4: Lint + build**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -20
```

Beklenen: XPToast ile ilgili import hatası yok.

- [ ] **Adım 5: Tarayıcıda doğrula**

Frontend çalışıyorsa (`http://localhost:5173` veya `http://localhost:80`):
- Analiz yap → sağ altta `+8 XP — Analiz Oluşturuldu` toastı çıkmalı (yeşil sol çizgi)
- Hata durumunu simüle et (ağı kes) → kırmızı hata toastı

- [ ] **Adım 6: Commit**

```bash
git add frontend/src/components/Layout.jsx frontend/src/services/gamification.service.js
git commit -m "feat: replace XPToast with unified ToastContainer, migrate gamification service"
```

---

## Task 5: `Tooltip.jsx` — Hover Wrapper

**Files:**
- Create: `frontend/src/components/ui/Tooltip.jsx`

- [ ] **Adım 1: Dosyayı oluştur**

```jsx
// frontend/src/components/ui/Tooltip.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

const OFFSET = 8; // trigger ile tooltip arası px

function getPosition(triggerRect, side, tooltipEl) {
  const tt = tooltipEl?.getBoundingClientRect() ?? { width: 160, height: 36 };
  const s  = window.scrollX ?? 0; // fixed konumlandırma için scroll gerekmez

  switch (side) {
    case 'bottom':
      return {
        top:  triggerRect.bottom + OFFSET,
        left: triggerRect.left + triggerRect.width / 2 - tt.width / 2,
      };
    case 'left':
      return {
        top:  triggerRect.top + triggerRect.height / 2 - tt.height / 2,
        left: triggerRect.left - tt.width - OFFSET,
      };
    case 'right':
      return {
        top:  triggerRect.top + triggerRect.height / 2 - tt.height / 2,
        left: triggerRect.right + OFFSET,
      };
    default: // top
      return {
        top:  triggerRect.top - (tt.height || 36) - OFFSET,
        left: triggerRect.left + triggerRect.width / 2 - tt.width / 2,
      };
  }
}

export default function Tooltip({
  content,
  children,
  side      = 'top',
  delay     = 150,
  maxWidth  = 240,
  disabled  = false,
}) {
  const [visible, setVisible] = useState(false);
  const [pos,     setPos]     = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef   = useRef(null);

  const show = useCallback(() => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos(getPosition(rect, side, tooltipRef.current));
      setVisible(true);
      // Recompute once tooltip is mounted (accurate size)
      requestAnimationFrame(() => {
        const rect2 = triggerRef.current?.getBoundingClientRect();
        if (rect2) setPos(getPosition(rect2, side, tooltipRef.current));
      });
    }, delay);
  }, [content, delay, disabled, side]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const tooltip = visible ? ReactDOM.createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position:     'fixed',
        top:           pos.top,
        left:          pos.left,
        maxWidth,
        background:   '#1c2128',
        border:       '1px solid #30363d',
        borderTop:    '2px solid #10b981',
        borderRadius:  4,
        padding:      '6px 10px',
        fontSize:     '0.74rem',
        color:        '#c9d1d9',
        lineHeight:    1.5,
        boxShadow:    '0 4px 16px rgba(0,0,0,0.4)',
        zIndex:        9000,
        pointerEvents: 'none',
        whiteSpace:   maxWidth ? 'normal' : 'nowrap',
        animation:    'tooltip-fade 0.15s ease-out',
      }}
    >
      {content}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
```

- [ ] **Adım 2: `index.css`'e tooltip animasyonunu ekle**

`frontend/src/index.css` dosyasındaki animasyon bloklarına ekle:

```css
@keyframes tooltip-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Adım 3: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
```

- [ ] **Adım 4: Commit**

```bash
git add frontend/src/components/ui/Tooltip.jsx frontend/src/index.css
git commit -m "feat: add Tooltip component with portal rendering"
```

---

## Task 6: `popup.js` + `Popup.jsx`

**Files:**
- Create: `frontend/src/services/popup.js`
- Create: `frontend/src/components/ui/Popup.jsx`

- [ ] **Adım 1: `popup.js` singleton**

```js
// frontend/src/services/popup.js
let _emit = null;

const popup = {
  confirm: (opts = {}) => _emit?.({ type: 'confirm', ...opts }),
  info:    (opts = {}) => _emit?.({ type: 'info',    ...opts }),

  _register:   (emit) => { _emit = emit; },
  _unregister: ()     => { _emit = null; },
};

export default popup;
```

- [ ] **Adım 2: `Popup.jsx`**

```jsx
// frontend/src/components/ui/Popup.jsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, X, Trash2 } from 'lucide-react';
import popup from '../../services/popup';

const ENTER_STYLE = {
  animation: 'popup-enter 0.2s ease-out',
};

export default function Popup() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    popup._register(setDialog);
    return () => popup._unregister();
  }, []);

  // Scroll kilidi
  useEffect(() => {
    if (dialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [dialog]);

  // Escape tuşu
  useEffect(() => {
    if (!dialog) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  const close = () => setDialog(null);

  const confirm = () => {
    dialog?.onConfirm?.();
    close();
  };

  if (!dialog) return null;

  const isConfirm = dialog.type === 'confirm';
  const accentColor = isConfirm
    ? (dialog.danger !== false ? '#ef4444' : '#10b981')
    : '#3b82f6';

  const TitleIcon = isConfirm
    ? (dialog.danger !== false ? AlertTriangle : CheckCircle)
    : Info;

  return (
    <div
      onClick={isConfirm ? undefined : close}
      style={{
        position:       'fixed',
        inset:           0,
        background:     'rgba(0,0,0,0.6)',
        zIndex:          9500,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:         16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   '#1c2128',
          border:       '1px solid #30363d',
          borderTop:    `2px solid ${accentColor}`,
          borderRadius:  6,
          padding:       20,
          maxWidth:      420,
          width:        '100%',
          boxShadow:    '0 4px 32px rgba(0,0,0,0.55)',
          ...ENTER_STYLE,
        }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TitleIcon size={17} color={accentColor} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#eef2f7' }}>
              {dialog.title}
            </span>
          </div>
          {!isConfirm && (
            <button
              onClick={close}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: 0, display: 'flex' }}
              aria-label="Kapat"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* İçerik */}
        {dialog.message && (
          <p style={{ fontSize: '0.78rem', color: '#8b949e', lineHeight: 1.65, margin: '0 0 14px' }}>
            {dialog.message}
          </p>
        )}
        {dialog.content && (
          <div style={{ marginBottom: 14 }}>{dialog.content}</div>
        )}

        {/* Aksiyonlar — sadece confirm */}
        {isConfirm && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={close}
              style={{
                fontSize: '0.74rem', padding: '6px 16px', borderRadius: 4,
                background: 'transparent', color: '#8b949e',
                border: '1px solid #30363d', cursor: 'pointer', fontWeight: 500,
              }}
            >
              {dialog.cancelLabel ?? 'İptal'}
            </button>
            <button
              onClick={confirm}
              style={{
                fontSize: '0.74rem', padding: '6px 16px', borderRadius: 4,
                background: accentColor, color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {dialog.danger !== false && <Trash2 size={12} />}
              {dialog.confirmLabel ?? 'Onayla'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Adım 3: `index.css`'e popup animasyonu ekle**

```css
@keyframes popup-enter {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
```

- [ ] **Adım 4: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
```

- [ ] **Adım 5: Commit**

```bash
git add frontend/src/services/popup.js frontend/src/components/ui/Popup.jsx frontend/src/index.css
git commit -m "feat: add popup singleton service and Popup dialog component"
```

---

## Task 7: Popup'ı Layout'a bağla

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Adım 1: `Layout.jsx`'e import ve render ekle**

`Layout.jsx` dosyasında, mevcut importlar arasına ekle:

```jsx
import Popup from './ui/Popup';
```

JSX'te `<ToastContainer />` satırının hemen altına ekle:

```jsx
<Popup />
```

- [ ] **Adım 2: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
```

- [ ] **Adım 3: Tarayıcıda doğrula**

Browser konsoluna yapıştır:

```js
// Confirm popup testi
const { default: popup } = await import('/src/services/popup.js');
popup.confirm({
  title: 'Test Silme',
  message: 'Bu işlem geri alınamaz.',
  danger: true,
  confirmLabel: 'Sil',
  onConfirm: () => console.log('onConfirm çalıştı'),
});
```

Beklenen: kırmızı bordered popup ekrana gelir, Sil → konsola log, backdrop tıklama çalışmaz, Escape/İptal kapatır.

```js
// Info popup testi
popup.info({ title: 'XP Nedir?', message: 'XP kazanarak seviye atlarsın.' });
```

Beklenen: mavi bordered popup, sağ üst × ile kapanır, backdrop tıklamayla da kapanır.

- [ ] **Adım 4: Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "feat: wire Popup component into Layout"
```

---

## Task 8: Tooltip'i ilk kullanım yerine ekle (Navbar XP bar)

**Files:**
- Modify: `frontend/src/components/common/Navbar.jsx`

Bu task Tooltip'in gerçek projeye entegrasyonunu doğrular.

- [ ] **Adım 1: Navbar'da XP/seviye gösterimini bul**

`Navbar.jsx` dosyasında XP bar veya seviye gösterimini içeren satırı bul. `level` veya `total_xp` aratarak konumu tespit et.

- [ ] **Adım 2: Tooltip'i import et**

```jsx
import Tooltip from './ui/Tooltip'; // ya da doğru relative path
```

- [ ] **Adım 3: XP etiketini Tooltip ile sar**

Seviye sayısının gösterildiği yerde, örneğin:

```jsx
// ÖNCE (örnek)
<span className="text-xs text-gray-400">Seviye {level}</span>

// SONRA
<Tooltip content={`${total_xp} XP · Sonraki seviye için ${xp_to_next_level} XP`} side="bottom">
  <span className="text-xs text-gray-400">Seviye {level}</span>
</Tooltip>
```

Navbar'daki gerçek değişken isimlerini kullan — bunlar `useAuth` veya `GamificationService` üzerinden gelen verilerdir.

- [ ] **Adım 4: Tarayıcıda doğrula**

Navbar'daki seviye göstergesinin üzerine gel → tooltip 150ms sonra çıkmalı, fareyi çekince kaybolmalı.

- [ ] **Adım 5: Lint**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
```

- [ ] **Adım 6: Commit**

```bash
git add frontend/src/components/common/Navbar.jsx
git commit -m "feat: add Tooltip to Navbar XP/level display"
```

---

## Task 9: Toast entegrasyonu — hata yönetimi

**Files:**
- Modify: `frontend/src/hooks/useAnalysis.js`

Analiz hataları şu an kullanıcıya gösterilmiyor. `toast.error` ile bağla.

- [ ] **Adım 1: `useAnalysis.js`'i aç, hata durumunu bul**

`useAnalysis.js` içinde `catch` bloklarını bul.

- [ ] **Adım 2: Toast import et ve hata göster**

Dosyanın tepesine:
```js
import toast from '../services/toast';
```

Analiz başarısız olduğunda (ağ hatası, 5xx vb.):
```js
toast.error('Analiz tamamlanamadı', { sub: error?.response?.data?.detail ?? 'Lütfen tekrar dene' });
```

- [ ] **Adım 3: Lint + commit**

```bash
cd frontend && npm run lint -- --quiet 2>&1 | grep "error" | head -10
git add frontend/src/hooks/useAnalysis.js
git commit -m "feat: show error toast on analysis failure"
```

---

## Self-Review — Spec Karşılaştırma

| Spec Gereksinimi | Karşılayan Task |
|------------------|----------------|
| C stili (border-top, #1c2128, border-radius: 4px) | Task 2, 5, 6 |
| Lucide ikonlar, emoji yok | Task 2 (TYPE_CONFIG), Task 6 |
| Tooltip: info ikon, disabled btn, ellipsis, icon btn, stats | Task 5 (bileşen hazır), Task 8 (örnek entegrasyon) |
| Toast: success/xp/badge/error/info/warning | Task 1 (API), Task 2 (TYPE_CONFIG) |
| Toast sağ alt, z-9000 | Task 3 |
| Toast otomatik kapanma 4s + progress bar | Task 2 |
| Toast max 5, en eskiyi at | Task 3 |
| XPToast kaldırılır | Task 4 |
| Popup confirm + info | Task 6 |
| Popup overlay, backdrop kapanır (confirm hariç) | Task 6 |
| Popup Escape ile kapanır | Task 6 |
| Popup scroll kilidi | Task 6 |
| Popup z-9500 (toast'ın üstünde) | Task 6 |
| Sayfa yönlendirmesi yok | Task 6 |
| Animasyonlar (slide, fade, scale) | Task 2/5/6 + index.css |
