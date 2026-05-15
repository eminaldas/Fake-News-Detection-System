# Frontend UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut siber/terminal estetiğini bozmadan görsel kaliteyi ve performansı artır — arka plan canlandırma, scrollbar tasarımı, glitch animasyonları, light mode okunabilirlik ve lazy loading.

**Architecture:** Her görev birbirinden bağımsız; 7 görev paralel subagent'larla çalıştırılabilir. Kart yapısına, bileşen arayüzlerine ve WebSocket entegrasyonuna dokunulmaz. Sadece görsel token'lar, animasyon CSS'leri ve mevcut bileşenlerdeki küçük güncellemeler.

**Tech Stack:** React 19, Tailwind CSS 4, CSS custom properties (token sistemi), Canvas API, localStorage, React.lazy/Suspense

---

## Paralel Çalıştırma Haritası

Tüm görevler birbirinden bağımsızdır, eş zamanlı çalışabilir:

| Görev | Dosyalar |
|-------|----------|
| T1 — CSS Tokens + Scrollbar | `src/index.css` |
| T2 — Arka Plan Güçlendirme | `src/components/Layout.jsx` |
| T3 — Market Band Scroll Fix | `src/components/common/MarketBand.jsx` |
| T4 — Weather Glassy Pill | `src/components/common/WeatherWidget.jsx` |
| T5 — Glitch Reveal | `src/index.css`, 3 bileşen |
| T6 — Font Scale Sistemi | `src/contexts/ThemeContext.jsx`, `src/pages/ProfileSettings.jsx`, `src/index.css` |
| T7 — Lazy Loading | `src/App.jsx` |

---

## Task 1: CSS Token Düzeltmesi + Cyber Scrollbar

**Files:**
- Modify: `frontend/src/index.css`

**Amaç:** Light modda ikincil metin renkleri koyulaştırılır (okunabilirlik). Scrollbar Cyber Bar tasarımına geçer.

- [ ] **Step 1: Light mode text token'larını güncelle**

`frontend/src/index.css` içinde `:root` bloğunda şu iki satırı değiştir:

```css
/* ÖNCE */
--color-text-secondary:   #57606a;
--color-text-muted:       #6e7781;

/* SONRA */
--color-text-secondary:   #3d4855;
--color-text-muted:       #505d6b;
```

- [ ] **Step 2: Scrollbar stillerini Cyber Bar olarak güncelle**

`frontend/src/index.css` içinde `/* ── Scrollbar ── */` bloğunu bul (satır ~480). Tüm scrollbar bloğunu aşağıdakiyle değiştir:

```css
/* ── Scrollbar — Cyber Bar ── */
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg-base);
  border-left: 1px solid rgba(16,185,129,0.06);
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(63,255,139,0.65), rgba(16,185,129,0.38));
  border-radius: 2px;
  border: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.06);
}
::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(63,255,139,0.88), rgba(16,185,129,0.60));
  box-shadow: 0 0 8px rgba(16,185,129,0.40),
              inset 0 1px 0 rgba(255,255,255,0.12);
}
.dark ::-webkit-scrollbar-track {
  background: var(--color-bg-base);
}
.dark ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(63,255,139,0.55), rgba(16,185,129,0.30));
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(63,255,139,0.80), rgba(16,185,129,0.55));
  box-shadow: 0 0 10px rgba(16,185,129,0.45);
}
```

- [ ] **Step 3: Doğrula**

`cd frontend && npm run dev` ile geliştirme sunucusunu aç. Sayfayı scroll et — scrollbar gradient yeşil + köşeli görünmeli. Light modda bir paragraf metninin `text-tx-secondary` sınıfıyla rengi eskiden daha koyu görünmeli.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: light mode text contrast + cyber scrollbar"
```

---

## Task 2: Arka Plan Güçlendirme (Layout.jsx)

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

**Amaç:** Mevcut ORBS opaklığını artır, ikinci ve üçüncü orb'a mavi/mor renk ekle, particle network canvas overlay ekle, grid opaklığını artır.

- [ ] **Step 1: ORBS dizisini güncelle**

`frontend/src/components/Layout.jsx` dosyasında `const ORBS = [` satırını bul. Mevcut diziyi şununla değiştir:

```js
const ORBS = [
    { left: '-8%',  top: '8%',   size: 620, dur: '35s', delay: '0s',  color: 'rgba(26,158,79,0.22)'    },
    { left: '65%',  top: '-8%',  size: 520, dur: '45s', delay: '10s', color: 'rgba(59,130,246,0.14)'   },
    { left: '35%',  top: '55%',  size: 460, dur: '40s', delay: '5s',  color: 'rgba(139,92,246,0.11)'   },
];
```

- [ ] **Step 2: ORBS render'ında blur değerini azalt**

`Layout.jsx` içinde `{isDarkMode && ORBS.map((o, i) => (` bloğunda `filter: 'blur(100px)'` satırını `filter: 'blur(80px)'` olarak değiştir.

- [ ] **Step 3: Grid opaklığını artır**

`Layout.jsx` içinde `/* ── Global ızgara ── */` bloğundaki:
```js
'linear-gradient(rgba(63,255,139,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,255,139,0.05) 1px,transparent 1px)'
```
satırını şununla değiştir:
```js
'linear-gradient(rgba(63,255,139,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(63,255,139,0.09) 1px,transparent 1px)'
```

- [ ] **Step 4: Particle network canvas ref'i ekle**

`Layout.jsx` dosyasının başında `import` satırlarının altına, `const AUTH_PATHS` satırından önce şu canvas bileşenini ekle:

```jsx
const ParticleNetwork = React.memo(function ParticleNetwork({ isDark }) {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const COUNT = 22;
        const dots = Array.from({ length: COUNT }, () => ({
            x:  Math.random() * canvas.width,
            y:  Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const dotColor  = isDark ? 'rgba(16,185,129,0.55)' : 'rgba(26,158,79,0.18)';
            const lineAlpha = isDark ? 0.18 : 0.07;

            dots.forEach((d, i) => {
                d.x += d.vx;
                d.y += d.vy;
                if (d.x < 0 || d.x > canvas.width)  d.vx *= -1;
                if (d.y < 0 || d.y > canvas.height)  d.vy *= -1;

                ctx.beginPath();
                ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();

                for (let j = i + 1; j < dots.length; j++) {
                    const b    = dots[j];
                    const dist = Math.hypot(d.x - b.x, d.y - b.y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(d.x, d.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(16,185,129,${lineAlpha * (1 - dist / 120)})`;
                        ctx.lineWidth   = 0.6;
                        ctx.stroke();
                    }
                }
            });
            raf = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [isDark]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0,
                width: '100%', height: '100%',
                zIndex: -8, pointerEvents: 'none',
                opacity: isDark ? 1 : 0.5,
            }}
        />
    );
});
```

- [ ] **Step 5: ParticleNetwork'ü Layout render'ına ekle**

`Layout.jsx` içindeki `{/* ── Animasyonlu arka plan ... ── */}` div'inin hemen altına (ama div içine değil, yanına) şunu ekle:

```jsx
<ParticleNetwork isDark={isDarkMode} />
```

Yani şu yapı oluşmalı:
```jsx
{/* ── Global ızgara ── */}
<div ... />

<ParticleNetwork isDark={isDarkMode} />

{/* ── Animasyonlu arka plan ── */}
<div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -9 }}>
```

- [ ] **Step 6: Doğrula**

`npm run dev` — dark modda arka planda nokta ve çizgi bağlantıları görünmeli, orb'lar eskiye göre biraz daha belirgin ve mavi/mor tonları içermeli.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "style: enhance background — orbs opacity + particle network canvas"
```

---

## Task 3: Market Band Seamless Scroll Fix

**Files:**
- Modify: `frontend/src/components/common/MarketBand.jsx`

**Amaç:** Marquee animasyonu state güncellemesinde (60s veri yenilemesi) restart olunca sıçrıyor. `duration` ve `items.length` sabitlenerek restart önlenir.

- [ ] **Step 1: duration'ı useMemo ile sabitle**

`frontend/src/components/common/MarketBand.jsx` dosyasında `const items = ...` satırından sonra şu satırı bul:

```js
const useMarquee = items.length > 4;
const duration   = `${Math.max(items.length * 3, 12)}s`;
```

Bu iki satırı şununla değiştir:

```js
const useMarquee = items.length > 4;
// Duration'ı sabitle: ilk item sayısından sonra değişmemeli.
// items.length değişince animasyon restart olur; initialCount ref'iyle kilitleriz.
const itemCountRef = React.useRef(0);
if (items.length > 0 && itemCountRef.current === 0) itemCountRef.current = items.length;
const stableCount = itemCountRef.current || items.length;
const duration    = `${Math.max(stableCount * 3, 12)}s`;
```

- [ ] **Step 2: Marquee div'ine will-change ekle**

Aynı dosyada marquee `<div>` elementini bul:

```jsx
<div
    className="flex animate-marquee"
    style={{ gap: '2rem', animationDuration: duration }}
>
```

`style` içine `willChange: 'transform'` ekle:

```jsx
<div
    className="flex animate-marquee"
    style={{ gap: '2rem', animationDuration: duration, willChange: 'transform' }}
>
```

- [ ] **Step 3: Doğrula**

`npm run dev` — Market Band'da sembollerin sürekli kayması gerekiyor, sayfa verileri yenilendiğinde (60s) sıfırdan başlamamalı.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/MarketBand.jsx
git commit -m "fix: market band marquee — prevent restart on data refresh"
```

---

## Task 4: Weather Widget — Glassy Pill

**Files:**
- Modify: `frontend/src/components/common/WeatherWidget.jsx`

**Amaç:** Trigger button'ı yuvarlak glassmorphism kapsüle dönüştür. Dropdown değişmez.

- [ ] **Step 1: Trigger button'ı Glassy Pill ile değiştir**

`frontend/src/components/common/WeatherWidget.jsx` dosyasında `{/* Trigger */}` yorumundan başlayan `<button>` elementini bulup tamamını aşağıdakiyle değiştir:

```jsx
{/* Trigger — Glassy Pill */}
<button
    onClick={toggleOpen}
    className="select-none whitespace-nowrap transition-opacity hover:opacity-80 flex items-center"
    style={{
        background:     'rgba(7,15,18,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border:         '1px solid rgba(16,185,129,0.25)',
        borderRadius:   '999px',
        padding:        '5px 12px 5px 8px',
        gap:            '8px',
        display:        'flex',
        alignItems:     'center',
    }}
>
    {/* Animated icon */}
    <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
        <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
            animation: 'sunGlow 3s ease-in-out infinite',
        }} />
        <Icon
            className="w-full h-full"
            style={{ position: 'relative', opacity: 0.85, color: 'var(--color-market-value)' }}
        />
    </div>

    {/* Sıcaklık */}
    <div>
        <div style={{
            fontFamily: 'monospace', fontSize: 15, fontWeight: 900,
            color: 'var(--color-market-value)', lineHeight: 1,
        }}>
            {primary.temp}°C
        </div>
        <div style={{
            fontFamily: 'monospace', fontSize: 8,
            color: 'var(--color-market-sys)', opacity: 0.55,
            letterSpacing: '0.08em',
        }}>
            {primary.city.toUpperCase()}
        </div>
    </div>

    <ChevronDown
        className="w-3 h-3 shrink-0 transition-transform"
        style={{
            color:     'var(--color-market-sys)',
            opacity:   0.5,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
    />
</button>
```

- [ ] **Step 2: sunGlow keyframe'i index.css'e ekle (zaten yoksa)**

`frontend/src/index.css` dosyasında `@layer utilities` bloğunda `/* ── Animasyonlar ── */` bölümüne şunu ekle (eğer `sunGlow` adında bir keyframe yoksa):

```css
@keyframes sunGlow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.18); }
}
```

- [ ] **Step 3: Doğrula**

`npm run dev` — Market Band sağ ucunda yuvarlak glassmorphism kapsül görünmeli, hover'da soluklaşmalı, tıklanınca mevcut dropdown açılmalı.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/WeatherWidget.jsx frontend/src/index.css
git commit -m "style: weather widget glassy pill trigger"
```

---

## Task 5: Haberler Yükleme — Glitch Reveal Animasyonu

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/features/analysis/RecentHeadlines.jsx`
- Modify: `frontend/src/components/features/analysis/HotAnalysesCard.jsx`
- Modify: `frontend/src/components/features/gundem/PopularNewsGrid.jsx`

**Amaç:** Haberler yüklendikten sonra her öğe sırayla glitch efektiyle belirir.

- [ ] **Step 1: Keyframe'i index.css'e ekle**

`frontend/src/index.css` dosyasında `@layer utilities` içinde `/* ── Animasyonlar ── */` bölümüne şu keyframe ve utility sınıfını ekle:

```css
@keyframes glitchReveal {
  0%   {
    opacity: 0;
    transform: translateX(-8px) skewX(-4deg);
    filter: brightness(2) hue-rotate(90deg);
  }
  8%   {
    opacity: 0.8;
    transform: translateX(4px) skewX(2deg);
    filter: brightness(1.5) hue-rotate(30deg);
  }
  15%  {
    opacity: 0.6;
    transform: translateX(-2px) skewX(-1deg);
    filter: brightness(1.2);
  }
  28%  {
    opacity: 1;
    transform: translateX(1px);
    filter: brightness(1.05);
  }
  100% {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
.animate-glitch-reveal {
  animation: glitchReveal 0.55s cubic-bezier(0.22,1,0.36,1) both;
}
```

- [ ] **Step 2: RecentHeadlines.jsx — liste öğelerine animasyon ekle**

`frontend/src/components/features/analysis/RecentHeadlines.jsx` dosyasında `headlines.map((item, idx) => (` satırını bul. `<a` elementine `className` ve `style` ekle:

Mevcut:
```jsx
<a
    key={item.id}
    href={item.source_url}
    target="_blank"
    rel="noopener noreferrer"
    className={`group flex flex-col gap-1.5 px-4 py-3.5 transition-colors border-l-2
               hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
               ${idx < headlines.length - 1 ? 'border-b' : ''}`}
    style={{
        borderColor:     'var(--color-terminal-border-raw)',
        borderLeftColor: 'var(--color-brand-primary)' + '28',
    }}
```

Değiştir:
```jsx
<a
    key={item.id}
    href={item.source_url}
    target="_blank"
    rel="noopener noreferrer"
    className={`animate-glitch-reveal group flex flex-col gap-1.5 px-4 py-3.5 transition-colors border-l-2
               hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
               ${idx < headlines.length - 1 ? 'border-b' : ''}`}
    style={{
        borderColor:     'var(--color-terminal-border-raw)',
        borderLeftColor: 'var(--color-brand-primary)' + '28',
        animationDelay:  `${idx * 110}ms`,
    }}
```

- [ ] **Step 3: HotAnalysesCard.jsx — liste öğelerine animasyon ekle**

`frontend/src/components/features/analysis/HotAnalysesCard.jsx` dosyasında `items.map` içindeki her liste öğesi `<div>` ya da `<button>` elementini bul. `loading` false iken render edilen ilk wrapper element'e `animate-glitch-reveal` class ve `animationDelay: \`${idx * 110}ms\`` style ekle.

Dosyada `items.map((item, idx)` satırını bul. İçindeki wrapper element'e:
- `className` içine `animate-glitch-reveal` ekle
- `style` içine `animationDelay: \`${idx * 110}ms\`` ekle

- [ ] **Step 4: PopularNewsGrid.jsx — aynı pattern**

`frontend/src/components/features/gundem/PopularNewsGrid.jsx` dosyasında `items.map` veya `articles.map` çağrısını bul. Loading false'tan sonra render edilen kart/item wrapper elementine aynı şekilde `animate-glitch-reveal` class ve staggered delay ekle.

- [ ] **Step 5: Doğrula**

`npm run dev` — Ana sayfayı aç, hard refresh yap (Ctrl+Shift+R). Haberler yüklenince her kart sırayla glitch efektiyle belirmeli.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css \
        frontend/src/components/features/analysis/RecentHeadlines.jsx \
        frontend/src/components/features/analysis/HotAnalysesCard.jsx \
        frontend/src/components/features/gundem/PopularNewsGrid.jsx
git commit -m "feat: glitch reveal animation on news card load"
```

---

## Task 6: Font Scale Sistemi

**Files:**
- Modify: `frontend/src/contexts/ThemeContext.jsx`
- Modify: `frontend/src/pages/ProfileSettings.jsx`
- Create: `frontend/src/features/profile/ProfileAppearance.jsx`
- Modify: `frontend/src/index.css`

**Amaç:** Kullanıcı profil ayarlarından yazı boyutunu küçük/orta/büyük olarak ayarlayabilsin. Seçim localStorage'a kaydedilir ve `<html>` üzerindeki `data-font-scale` attribute'u ile uygulanır.

- [ ] **Step 1: index.css'e font-scale token'ları ekle**

`frontend/src/index.css` dosyasında `@layer base` bloğunun en altına (`.dark { ... }` bloğundan sonra, `html { ... }` satırından önce) şunu ekle:

```css
/* ── Font Scale ── */
:root,
[data-font-scale="md"] { font-size: 16px; }
[data-font-scale="sm"] { font-size: 14px; }
[data-font-scale="lg"] { font-size: 18px; }
```

- [ ] **Step 2: ThemeContext'e fontScale ekle**

`frontend/src/contexts/ThemeContext.jsx` dosyasının tamamını şununla değiştir:

```jsx
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    const [fontScale, setFontScaleState] = useState(() => {
        return localStorage.getItem('font-scale') || 'md';
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        document.documentElement.setAttribute('data-font-scale', fontScale);
        localStorage.setItem('font-scale', fontScale);
    }, [fontScale]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const setFontScale = (scale) => {
        if (['sm', 'md', 'lg'].includes(scale)) setFontScaleState(scale);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, fontScale, setFontScale }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 3: ProfileAppearance bileşenini oluştur**

`frontend/src/features/profile/ProfileAppearance.jsx` dosyasını oluştur:

```jsx
import React from 'react';
import { Layers } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const SCALES = [
    { id: 'sm', label: 'Küçük',  desc: '14px' },
    { id: 'md', label: 'Orta',   desc: '16px' },
    { id: 'lg', label: 'Büyük',  desc: '18px' },
];

export default function ProfileAppearance() {
    const { fontScale, setFontScale } = useTheme();

    return (
        <div className="space-y-6">
            <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                   style={{ color: 'var(--color-brand-primary)' }}>// GÖRÜNÜM</p>
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                    Yazı Boyutu
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Tüm sayfada yazı ölçeğini ayarla. Tercih tarayıcıda saklanır.
                </p>
            </div>

            <div className="flex gap-3 flex-wrap">
                {SCALES.map(({ id, label, desc }) => (
                    <button
                        key={id}
                        onClick={() => setFontScale(id)}
                        className="flex flex-col items-center gap-1 px-6 py-4 border font-mono transition-colors"
                        style={{
                            borderColor: fontScale === id
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-terminal-border-raw)',
                            background: fontScale === id
                                ? 'rgba(16,185,129,0.08)'
                                : 'transparent',
                            color: fontScale === id
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-text-muted)',
                        }}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                        <span className="text-[10px] opacity-60">{desc}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 border" style={{
                borderColor: 'var(--color-terminal-border-raw)',
                background: 'var(--color-terminal-surface)',
            }}>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-2"
                   style={{ color: 'var(--color-market-sys)', opacity: 0.6 }}>// ÖNİZLEME</p>
                <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                    Başlık örneği
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875em' }}>
                    İkincil metin — analiz sonucu açıklaması burada görünür.
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>
                    Meta bilgi · kaynak · zaman damgası
                </p>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: ProfileSettings'e Görünüm sekmesini ekle**

`frontend/src/pages/ProfileSettings.jsx` dosyasını aç.

`import` satırlarına ekle:
```jsx
import { Monitor } from 'lucide-react';
import ProfileAppearance from '../features/profile/ProfileAppearance';
```

`const TABS = [` dizisine ilk eleman olarak ekle:
```jsx
{ id: 'appearance', label: 'Görünüm', icon: Monitor, Component: ProfileAppearance },
```

Ve `useState('ai-lab')` satırını `useState('appearance')` olarak değiştir — varsayılan sekme Görünüm olsun.

- [ ] **Step 5: Doğrula**

`npm run dev` — `/profile/settings` sayfasına git. "Görünüm" sekmesi görünmeli. Küçük/Orta/Büyük butonlarından birine tıkla — tüm sayfa metni ölçeklenmeli, sayfa yenilenince seçim korunmalı.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css \
        frontend/src/contexts/ThemeContext.jsx \
        frontend/src/features/profile/ProfileAppearance.jsx \
        frontend/src/pages/ProfileSettings.jsx
git commit -m "feat: font scale preference in profile appearance settings"
```

---

## Task 7: Lazy Loading — Route Bileşenleri

**Files:**
- Modify: `frontend/src/App.jsx`

**Amaç:** Kritik olmayan sayfaları `React.lazy()` ile code-split et. İlk yükleme bundle boyutunu küçült. `Home`, `Login`, `Register` eager kalır.

- [ ] **Step 1: App.jsx import'larını lazy'ye çevir**

`frontend/src/App.jsx` dosyasını aç. Mevcut statik import'ları şununla değiştir:

```jsx
import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { useAuth } from './contexts/AuthContext';
import AuthService from './services/auth.service';
import wsService from './services/websocket';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import AdminLayout  from './layouts/AdminLayout';
import Layout from './components/Layout';

// Critical path — eager
import Home     from './pages/Home';
import Login    from './pages/Login';
import Register from './pages/Register';

// Lazy loaded
const Archive            = lazy(() => import('./pages/Archive'));
const ProfileLayout      = lazy(() => import('./features/profile/ProfileLayout'));
const ProfileOverview    = lazy(() => import('./features/profile/ProfileOverview'));
const ProfileAiLab       = lazy(() => import('./features/profile/ProfileAiLab'));
const ProfileSecurity    = lazy(() => import('./features/profile/ProfileSecurity'));
const ProfileNotifications = lazy(() => import('./features/profile/ProfileNotifications'));
const ProfileFeedback    = lazy(() => import('./features/profile/ProfileFeedback'));
const ProfileBookmarks   = lazy(() => import('./features/profile/ProfileBookmarks'));
const ProfileThreads     = lazy(() => import('./features/profile/ProfileThreads'));
const AdminUsers         = lazy(() => import('./pages/AdminUsers'));
const AdminSecurity      = lazy(() => import('./pages/AdminSecurity'));
const AdminAnalytics     = lazy(() => import('./pages/AdminAnalytics'));
const AdminForum         = lazy(() => import('./pages/AdminForum'));
const AdminABTest        = lazy(() => import('./pages/AdminABTest'));
const AdminModeration    = lazy(() => import('./pages/AdminModeration'));
const AdminDataset       = lazy(() => import('./pages/AdminDataset'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const NotFound           = lazy(() => import('./pages/NotFound'));
const About              = lazy(() => import('./pages/About'));
const Gundem             = lazy(() => import('./pages/Gundem'));
const Borsa              = lazy(() => import('./pages/Borsa'));
const Report             = lazy(() => import('./pages/Report'));
const ForumLayout        = lazy(() => import('./features/forum/ForumLayout'));
const ForumFeed          = lazy(() => import('./features/forum/ForumFeed'));
const ForumThread        = lazy(() => import('./features/forum/ForumThread'));
const ForumCreateThread  = lazy(() => import('./features/forum/ForumCreateThread'));
const SharedAnalysis     = lazy(() => import('./pages/SharedAnalysis'));
const Profile            = lazy(() => import('./pages/Profile'));
const UserProfile        = lazy(() => import('./pages/UserProfile'));
const ProfileSettings    = lazy(() => import('./pages/ProfileSettings'));
const Bookmarks          = lazy(() => import('./pages/Bookmarks'));
const EmailVerification  = lazy(() => import('./pages/EmailVerification'));
const Onboarding         = lazy(() => import('./pages/Onboarding'));
const Messages           = lazy(() => import('./pages/Messages'));
const ForumSearch        = lazy(() => import('./pages/ForumSearch'));
const AnalysisReport     = lazy(() => import('./pages/AnalysisReport'));
const Badges             = lazy(() => import('./pages/Badges'));
```

- [ ] **Step 2: Routes'u Suspense ile sar**

`App.jsx` içinde `<BrowserRouter>` içindeki `<Routes>` elementini `<Suspense>` ile sar:

```jsx
<BrowserRouter>
    <Suspense fallback={
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-base)',
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,0.2)',
                borderTopColor: 'var(--color-brand-primary)',
                animation: 'spin 0.7s linear infinite',
            }} />
        </div>
    }>
        <Routes>
            {/* ... mevcut route'lar değişmez ... */}
        </Routes>
    </Suspense>
</BrowserRouter>
```

- [ ] **Step 3: Spin animasyonunu index.css'e ekle**

`frontend/src/index.css` içinde `@layer utilities` bloğuna ekle:

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

- [ ] **Step 4: Doğrula**

`npm run build` çalıştır. Output'ta birden fazla chunk dosyası görünmeli (örn. `Archive-[hash].js`, `Gundem-[hash].js`). Tek büyük bundle yerine code-split edilmiş dosyalar oluşmalı.

```bash
cd frontend && npm run build
# Çıktıda şuna benzer satırlar görünmeli:
# dist/assets/Archive-CxBd3kL9.js    12.45 kB
# dist/assets/Gundem-D9mZkP2x.js     34.12 kB
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/index.css
git commit -m "perf: lazy load non-critical routes with React.lazy + Suspense"
```

---

## Self-Review Notları

**Spec coverage:**
- ✅ T1: Light mode text tokens + scrollbar
- ✅ T2: Arka plan güçlendirme (ORBS + particle network + grid)
- ✅ T3: Market band seamless scroll
- ✅ T4: Weather Glassy Pill
- ✅ T5: Glitch Reveal animasyonu
- ✅ T6: Font scale sistemi
- ✅ T7: Lazy loading
- ℹ️ Kart hizalama: Spec'te "gap ve padding tutarlılığı" olarak belirtildi ancak hangi kartlar somut değil. Uygulama sırasında tespit edilen sorunlar o bileşende inline düzeltilir.

**Type consistency:**
- `fontScale` → `setFontScale` — ThemeContext'te tanımlandı, ProfileAppearance'ta tüketildi ✅
- `ParticleNetwork` → Layout.jsx'te tanımlandı, aynı dosyada kullanıldı ✅
- `itemCountRef` → MarketBand'da tanımlandı, aynı scope'ta kullanıldı ✅
