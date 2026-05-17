# UI Feedback Sistemi — Tooltip · Toast · Popup

**Tarih:** 2026-05-17  
**Stil:** C — Minimal Sharp (koyu yüzey, üst kenar aksanı, düz köşe)  
**İkon sistemi:** Lucide React — emoji kullanılmaz

---

## 1. Genel Prensipler

- Üç bileşen de **sayfa yönlendirmesi yapmaz** — tümü overlay/inline.
- Renk aksanı her bileşende `border-top` veya `border-left` olarak uygulanır.
- Animasyon: `slideInRight` (toast), `fadeIn + scaleUp` (popup), `fadeIn` (tooltip) — 150–250ms.
- Dark-mode first; CSS değişkenleri `--color-*` token'larına bağlı.
- Mevcut `XPToast` (`components/common/XPToast.jsx`) **kaldırılır**, yerine yeni `toast` singleton gelir.

---

## 2. Tooltip

### Bileşen

`frontend/src/components/ui/Tooltip.jsx`

### API

```jsx
<Tooltip content="Açıklama metni" side="top" delay={150}>
  {/* herhangi bir child element */}
  <InfoIcon />
</Tooltip>
```

| Prop | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `content` | `string \| ReactNode` | — | Tooltip içeriği |
| `side` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Açılma yönü |
| `delay` | `number` (ms) | `150` | Hover'dan sonra gösterilme gecikmesi |
| `maxWidth` | `number` (px) | `240` | Maksimum genişlik |
| `disabled` | `boolean` | `false` | Tooltip'i devre dışı bırakır |

### Görünüm (C stili)

```
┌─────────────────────────┐  ← border-top: 2px solid #10b981
│ Açıklama metni buraya   │  ← bg: #1c2128, border: 1px #30363d
│ ikinci satır devam eder │     font: 0.74rem, color: #c9d1d9
└──────────┬──────────────┘
           ▼  ← ok (border trick, #1c2128)
        [trigger]
```

- `box-shadow: 0 4px 16px rgba(0,0,0,0.4)`
- `border-radius: 4px`
- `z-index: 9000`
- Pozisyonlama: `position: fixed` + `getBoundingClientRect` ile manuel offset — dış bağımlılık eklenmez
- Göster/gizle: CSS opacity + transform transition 150ms, `pointer-events: none` gizliyken

### Kullanım Yerleri

| Yer | Tetikleyici | İçerik |
|-----|-------------|--------|
| Info / `?` ikonu | hover | Özelliğin kısa açıklaması |
| Disabled buton | hover | Neden devre dışı olduğu ("Giriş yapman gerekiyor") |
| Ellipsis metin | hover | Tam metin (haber başlığı, kullanıcı adı vb.) |
| Icon buton (label yok) | hover | Buton etiketi ("Paylaş", "Kaydet", "Kopyala") |
| İstatistik / sayı | hover | Detay açıklaması ("Son 30 günde 42 analiz") |

---

## 3. Toast

### Bileşen & Singleton

- `frontend/src/components/ui/Toast.jsx` — tek bir toast kutusu render eder  
- `frontend/src/components/ui/ToastContainer.jsx` — `fixed bottom-5 right-5 z-[9000]`, maks 5 toast aynı anda
- `frontend/src/services/toast.js` — imperative singleton API

### API

```js
import toast from '@/services/toast'

toast.success('Analiz tamamlandı', { sub: '0.85 güven skoru' })
toast.error('Bağlantı hatası', { sub: 'Sunucuya ulaşılamadı' })
toast.info('Kuyruğa alındı', { sub: 'Birkaç saniye içinde gelecek' })
toast.warning('Günlük limit doldu', { sub: 'XP kazanımı kapandı' })
toast.xp(8, { label: 'Analiz Oluşturuldu', level: 5, xpBar: [84, 100] })
toast.badge({ key: 'first_analysis', name: 'İlk Adım', description: 'İlk analizini tamamladın' })
```

Tüm metodlar ortak `options` alır:

| Seçenek | Tip | Default | Açıklama |
|---------|-----|---------|----------|
| `sub` | `string` | — | Alt başlık |
| `duration` | `number` (ms) | `4000` | `0` = manuel kapatma |
| `id` | `string` | uuid | Aynı id varsa replace eder |

### Toast Tipleri & Renkler

| Tip | Sol çizgi | İkon (Lucide) |
|-----|-----------|---------------|
| `success` / `xp` | `#10b981` | `CheckCircle` / `Zap` |
| `badge` | `#f59e0b` | `Award` |
| `error` | `#ef4444` | `AlertCircle` |
| `info` | `#3b82f6` | `Info` |
| `warning` | `#f59e0b` | `AlertTriangle` |

### Görünüm (C stili)

```
┌─ #1c2128 ─────────────────────────────── ┐
▌ [İkon]  Başlık metni             [×]     │ ← border-left: 3px solid <renk>
▌         Alt açıklama                     │   border-radius: 4px
└───────────────────────────────────────── ┘
▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒  ← progress bar (2px, opacity 0.35)
```

- `xp` tipinde progress bar = `xpBar[0] / xpBar[1] * 100%`
- Diğerlerinde progress bar = süreye göre geriye doğru azalır (CSS animation)
- Kapatma: × butonuyla veya `duration` dolunca (slide-out animasyonu)
- Animasyon: `translateX(110%) → translateX(0)` slide-in, ters slide-out, 220ms ease-out

### Kuyruk

- Maksimum 5 toast aynı anda görünür
- 5 aşılırsa en eski otomatik kapanır
- Toastlar alt alta dizilir, yeniler alta eklenir

### Migration

`XPToast.jsx` → silinir. Tüm `XPToast.show(...)` çağrıları `toast.xp(...)` ve `toast.badge(...)` olarak güncellenir.

---

## 4. Popup

### Bileşenler

- `frontend/src/components/ui/Popup.jsx` — overlay + dialog container
- `frontend/src/services/popup.js` — imperative singleton API

### API

```js
import popup from '@/services/popup'

// Onay diyaloğu
popup.confirm({
  title: 'Hesabı Sil',
  message: 'Bu işlem geri alınamaz. Tüm veriler kalıcı olarak silinecek.',
  confirmLabel: 'Sil',
  danger: true,
  onConfirm: () => deleteAccount(),
  onCancel: () => {},          // opsiyonel
})

// Bilgi / detay
popup.info({
  title: 'XP Nedir?',
  message: 'XP, platformdaki aktivitelerinle kazanılan puan sistemidir...',
  // veya:
  content: <CustomComponent />,  // ReactNode
})
```

### Popup Tipleri

#### Confirm (Tehlikeli Aksiyon)
- `border-top: 2px solid #ef4444` (`danger: true`)
- `border-top: 2px solid #10b981` (`danger: false`)
- İkon: `AlertTriangle` (kırmızı) veya `CheckCircle` (yeşil)
- Butonlar: sağa yaslanmış — `[İptal] [Onayla]`
- `danger: true` → Onayla butonu `bg: #ef4444`
- `danger: false` → Onayla butonu `bg: #10b981`

#### Info (Bilgi/Detay)
- `border-top: 2px solid #3b82f6`
- İkon: `Info` (mavi)
- Sağ üstte × kapat butonu
- Sadece kapatma aksiyonu var, onay/iptal yok

### Görünüm (C stili)

```
████████████████████████████████  ← backdrop rgba(0,0,0,0.6)
████                          ████
████  ┌── #1c2128 ──────────┐ ████  ← border-top: 2px solid <renk>
████  │ [İkon] Başlık    [×]│ ████     border: 1px #30363d
████  │                     │ ████     border-radius: 6px
████  │ Açıklama metni      │ ████     max-width: 420px
████  │                     │ ████     padding: 20px
████  │      [İptal] [Onayla]│ ████
████  └─────────────────────┘ ████
████████████████████████████████
```

### Davranış

- Backdrop tıklanınca kapanır (confirm tipinde tıklama devre dışı, yanlışlıkla kapanmasın)
- `Escape` tuşuyla kapanır
- `body` scroll kilitlenir popup açıkken (`overflow: hidden`)
- Animasyon: `scale(0.96) opacity(0) → scale(1) opacity(1)`, 200ms ease-out
- `z-index: 9500` (toast `9000`'in üstünde, backdrop her şeyi örter)
- Sayfa yönlendirmesi **yapılmaz**

---

## 5. Dosya Yapısı

```
frontend/src/
  components/ui/
    Tooltip.jsx          ← yeni
    Toast.jsx            ← yeni
    ToastContainer.jsx   ← yeni
    Popup.jsx            ← yeni
  services/
    toast.js             ← yeni singleton
    popup.js             ← yeni singleton
  components/common/
    XPToast.jsx          ← SİLİNİR
```

---

## 6. Kapsam Dışı

- Analiz result card'ı — bu speste dokunulmaz
- Form popup (③) — kapsam dışı
- Action sheet (④) — kapsam dışı
- Tooltip animasyonu (sadece opacity/transform yeterli, spring yok)
