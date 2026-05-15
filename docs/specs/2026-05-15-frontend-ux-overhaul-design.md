# Frontend UX Overhaul — Design Spec
**Tarih:** 2026-05-15  
**Kapsam:** Görsel iyileştirmeler, performans, animasyonlar — mevcut kart/bileşen yapısına dokunulmaz.

---

## 1. Arka Plan Animasyonu

**Mevcut:** `Layout.jsx` içinde zaten 4 katman var: CSS grid, ORBS (aurora blob), scan line, PARTICLES (nokta). Ancak opaklıklar çok düşük — flat görünümün sebebi bu. `Squares.jsx` hiç import edilmemiyor, dokunulmaz.

**Değişiklik:** `Layout.jsx`'teki mevcut katmanlar güçlendirilir.

| Katman | Mevcut | Yeni |
|--------|--------|------|
| Grid opaklığı | `rgba(63,255,139,0.05)` | `rgba(63,255,139,0.09)` |
| ORBS opaklığı | `0.09–0.12` | `0.16–0.22` |
| ORBS blur | `blur(100px)` | `blur(80px)` (biraz daha belirgin) |
| PARTICLES bağlantı | yok (sadece nokta) | Canvas overlay eklenir: nokta arası `<65px` mesafede çizgi (`rgba(16,185,129,0.18)`) |
| ORBS renk | sadece yeşil | 1. orb yeşil, 2. orb `rgba(59,130,246,0.14)` (mavi), 3. orb `rgba(139,92,246,0.10)` (mor) |

Canvas overlay için `Layout.jsx`'e yeni bir `<canvas>` ref eklenir; particle pozisyonları PARTICLES dizisinden alınır (% → px dönüşümü `window` boyutuna göre). Light modda opaklıklar yarıya düşer.

---

## 2. Market Band — Seamless Scroll Düzeltmesi

**Sorun:** `[...items, ...items]` + `translateX(-50%)` JS tabanlı animasyon reset'te sıçrıyor.

**Çözüm:** Saf CSS `@keyframes marquee` — `from: translateX(0)` → `to: translateX(-50%)` — `animation-iteration-count: infinite`. Reset anında görsel atlama olmaz çünkü başlangıç ve bitiş noktası özdeş içerik gösterir.

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

`MarketBand.jsx`'teki mevcut animasyon mantığı bu keyframe ile değiştirilir. `useMarquee` flag'i korunur (≤4 item'da statik kalır).

---

## 3. Hava Durumu Widget — Glassy Pill

**Mevcut:** Küçük ikon + `13px` derece yazısı + şehir, düz.

**Yeni tasarım:** Yuvarlak glassmorphism kapsül.

- `border-radius: 999px`
- `background: rgba(7,15,18,0.75)` + `backdrop-filter: blur(16px)`
- `border: 1px solid rgba(16,185,129,0.25)`
- Sıcaklık: `18px font-weight-900`, şehir + durum: `9px monospace` alt satırda
- İkon: animated radial-gradient sun glow (`sunGlow @keyframes`)
- Nem göstergesi: dikey ayırıcı + `%XX` değeri
- Dropdown mevcut yapıda kalır, sadece trigger pill olarak güncellenir

Konum: Market Band sağında, değişmez.

---

## 4. Light Mode Metin Token'ları

**Sadece `index.css` `:root` bloğundaki iki token değişir. Kart yapısı, border, shadow — hiçbiri değişmez.**

```css
/* ÖNCE */
--color-text-secondary: #57606a;
--color-text-muted:     #6e7781;

/* SONRA */
--color-text-secondary: #3d4855;
--color-text-muted:     #505d6b;
```

WCAG AA kontrast gereksinimini karşılar (#f5f7f5 zemin üzerinde 4.5:1+).

---

## 5. Scrollbar — Cyber Bar

**Mevcut:** 12px, `rgba(16,185,129,0.10)` — neredeyse görünmez.

**Yeni `index.css` scrollbar stilleri:**

```css
::-webkit-scrollbar       { width: 10px; }
::-webkit-scrollbar-track {
  background: var(--color-bg-base);
  border-left: 1px solid rgba(16,185,129,0.06);
}
::-webkit-scrollbar-thumb {
  width: 8px;
  background: linear-gradient(180deg, rgba(63,255,139,0.7), rgba(16,185,129,0.4));
  border-radius: 2px;   /* köşeli, siber */
  border: none;
  /* çentik çizgileri pseudo-element ile */
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
}
::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(63,255,139,0.9), rgba(16,185,129,0.6));
  box-shadow: 0 0 8px rgba(16,185,129,0.4);
}
```

Dark modda bu stiller aktiftir. Light modda opaklık yarıya düşer.

---

## 6. Haberler Yükleme — Glitch Reveal

**Mevcut:** Standart skeleton (shimmer).  

**Yeni:** Skeleton kaldırılmaz — veri geldiğinde kartlar skeleton yerine Glitch Reveal ile belirir.

Animasyon dizisi (her kart için, staggered `animation-delay`):
1. `translateX(-8px) skewX(-4deg)` + chromatic aberration (`text-shadow` kırmızı/mavi kayma)
2. `translateX(4px) skewX(2deg)` + `brightness(1.5)`
3. Normal konuma oturma

```css
@keyframes glitchReveal {
  0%   { opacity:0; transform:translateX(-8px) skewX(-4deg);
         filter:brightness(2) hue-rotate(90deg); }
  8%   { opacity:0.8; transform:translateX(4px) skewX(2deg);
         filter:brightness(1.5) hue-rotate(30deg); }
  15%  { opacity:0.6; transform:translateX(-2px) skewX(-1deg); }
  25%  { opacity:1; transform:translateX(1px); filter:brightness(1.1); }
  100% { opacity:1; transform:none; filter:none; }
}
```

Delay: her kart için `index * 120ms`. Etkilenen bileşenler: `RecentHeadlines.jsx`, `PopularNewsGrid.jsx`, `HotAnalysesCard.jsx`.

---

## 7. Font Scale — Profil Görünüm Ayarı

**Nerede:** `ProfileSettings.jsx` → yeni "Görünüm" sekmesi.

**Seçenekler:** Küçük / Orta (varsayılan) / Büyük

**Uygulama:**
- Seçim `localStorage`'a kaydedilir (`font-scale: sm | md | lg`)
- `ThemeContext.jsx` bunu okur ve `<html>` elementine `data-font-scale` attribute'u atar
- `index.css`'te token override:

```css
[data-font-scale="sm"] { font-size: 14px; }
[data-font-scale="md"] { font-size: 16px; }  /* varsayılan */
[data-font-scale="lg"] { font-size: 18px; }
```

Tüm `rem` tabanlı boyutlar otomatik scale eder — bileşenlere dokunulmaz.

---

## 8. Lazy Loading

Şu an tüm sayfalar statik import ile yükleniyor.

**Değişiklik:** `App.jsx`'teki route bileşenleri `React.lazy()` + `<Suspense>` ile wrap edilir.

```jsx
const Archive = React.lazy(() => import('./pages/Archive'));
const Borsa   = React.lazy(() => import('./pages/Borsa'));
// vb.
```

`<Suspense fallback={<PageSkeleton />}>` ile her sayfa için minimal skeleton gösterilir. Ana sayfa (`Home.jsx`) lazy değil — ilk yüklemede kritik.

---

## 9. Kart Hizalama Düzeltmeleri

Genel kurallar (bileşen yapısı değişmez, sadece spacing tutarlılığı):

- Tüm ana sayfa kartlarında `gap` değerleri tutarlı: `gap-4` (16px) veya `gap-6` (24px), karışık kullanım yok.
- `padding` iç tutarlılığı: küçük kart `p-4`, orta kart `p-5`, büyük kart `p-6`.
- Font boyutu hiyerarşisi: başlık `text-lg font-bold`, açıklama `text-sm`, meta `text-xs`.

---

## Kapsam Dışı

- Kart tasarımı, border-radius, shadow, siber estetik — **değişmez**
- WebSocket entegrasyonu — zaten mevcut, dokunulmaz
- Backend / API — değişmez

---

## Dosya Etki Listesi

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/features/reactBits/Squares.jsx` | Dokunulmaz (zaten import edilmiyor) |
| `src/components/Layout.jsx` | ORBS/PARTICLES opaklık artışı + canvas particle network overlay |
| `src/components/common/MarketBand.jsx` | Marquee CSS fix + WeatherWidget trigger güncelleme |
| `src/components/common/WeatherWidget.jsx` | Glassy Pill trigger tasarımı |
| `src/index.css` | Text token'ları + scrollbar + glitchReveal keyframe + font-scale tokens |
| `src/App.jsx` | React.lazy route'lar |
| `src/contexts/ThemeContext.jsx` | font-scale okuma + `data-font-scale` attribute |
| `src/pages/ProfileSettings.jsx` | Görünüm sekmesi + font scale seçici |
| `src/components/features/analysis/RecentHeadlines.jsx` | Glitch Reveal animasyonu |
| `src/components/features/gundem/PopularNewsGrid.jsx` | Glitch Reveal animasyonu |
| `src/components/features/analysis/HotAnalysesCard.jsx` | Glitch Reveal animasyonu |
