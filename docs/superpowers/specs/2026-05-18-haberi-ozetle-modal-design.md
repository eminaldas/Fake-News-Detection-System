# Haberi Özetle Modal — Tasarım Spec

**Tarih:** 2026-05-18  
**Kapsam:** PopularNewsGrid "Analiz Et" butonu → "Haberi Özetle"; yeni özet modalı; modal için kompakt analiz görünümü; FeedbackBar emoji kaldırma + sebep alanı

---

## 1. Genel Akış

```
[Haberi Özetle] butonu
        ↓ tıklandı
  analysis API çağrısı (mevcut AnalysisService.analyzeUrl)
        ↓ polling tamamlandı
  NewsSummaryModal açılır
        ↓ "Tam Analizi Gör" tıklandı
  AnalysisModal açılır
```

LocalStorage cache mantığı değişmez — mevcut `lsKey` yapısı korunur.

---

## 2. Bileşenler

### 2.1 `NewsSummaryModal.jsx` (yeni)

**Konum:** `frontend/src/features/analysis/NewsSummaryModal.jsx`

**Props:**
```ts
{
  result:      object,   // analyzeUrl polling sonucu
  article:     object,   // { source_name, pub_date, source_url }
  onClose:     () => void,
  onAnalyze:   () => void,  // "Tam Analizi Gör" tıklandığında
}
```

**Layout:**
- Overlay: `rgba(0,0,0,0.82) backdrop-blur(8px)` — FullReportModal ile aynı
- Kart: `var(--color-terminal-surface)` + `borderColor: BORDER`, `max-w-lg`, `rounded` yok (terminal estetiği)
- Header: `[ FileText ] // HABER_ÖZETİ` + sağda `[X]` — font-mono text-[10px] uppercase tracking-widest, brand green
- Meta satırı: `source_name · relTime(pub_date)` — font-mono text-[10px] muted
- Özet alanı: `result.ai_comment?.news_summary` — text-sm leading-relaxed, max-h-[40vh] overflow-y-auto
  - Yoksa: `"Özet henüz mevcut değil, tam analizi deneyebilirsin."` — italic muted
- Feedback bölümü (bkz. §4)
- Footer: `[ Tam Analizi Gör → ]` — brand color border butonu, tam genişlik

**createPortal → document.body** kullanır. Overlay `z-[9999]`.

---

### 2.2 `AnalysisModal.jsx` (yeni)

**Konum:** `frontend/src/features/analysis/AnalysisModal.jsx`

**Props:**
```ts
{
  result:   object,
  onClose:  () => void,
}
```

**Layout:**
- Overlay: `rgba(0,0,0,0.82) backdrop-blur(8px)`, `z-[10000]` (NewsSummaryModal'ın `z-[9999]`'unun üstünde)
- Kart: `max-w-xl`, sağda `[X]` sabit
- Header (sabit, scroll dışı):
  - Tema ikonu + karar başlığı (`getTheme` ile — mevcut renk sistemi korunur)
  - Skor: halka (AI yoksa) veya yüzde metni (AI varsa)
  - badge (URL Analizi / Gemini AI Kararı vb.)
- Gövde (`max-h-[72vh] overflow-y-auto`):
  - `AICommentCard` (aiComment varsa)
  - `SignalPanel` (URL analizinde gizlenir, `!isUrlAnalysis && signals`)
  - Sinyal açıklama cümlesi
  - `FalseClaimsCard` (varsa)
- Footer (sabit, scroll dışı):
  - Sol: `ShareDropdown` (articleId varsa)
  - Sağ: `[ Kapat ]` butonu

**Kaldırılanlar (sayfa modunda kalır):**
- `FeedbackBar`, `ForumSuggestion`
- "Bu sonuç doğru mu? Evet/Hayır" satırı
- "Tam Raporu Gör →" butonu
- `useNavigate` bağımlılığı

**getTheme, buildExplanation:** `AnalysisResultCard`'dan **import** edilmez — `AnalysisModal` içinde yerel kopyalanır veya ortak bir util dosyasına (`analysisTheme.js`) taşınır. İkisi arasında bağımlılık zinciri oluşmaması için tercih: util dosyası.

---

### 2.3 `PopularNewsGrid.jsx` — `AnalyzeButton` değişiklikleri

- `phase` state'e `'summary'` eklenir
- `phase === 'done'` → artık `setModal(true)` yerine `setPhase('summary')` ve ayrı `analysisModal` boolean state
- Buton metni:
  - idle: `"haberi özetle →"`
  - done: `"özeti gör →"`
- Import: `NewsSummaryModal`, `AnalysisModal`
- `onAnalyze` callback: `NewsSummaryModal`'dan `AnalysisModal` açılır (summary modal kapanmaz, analysis modal üstüne açılır — iki portal katmanlı)

---

### 2.4 `FeedbackBar.jsx` — Yeniden Tasarım

**Durum makinesi:** `idle → voted_positive | asking_reason → sent`

**idle görünümü:**
```
"Bu analiz faydalı mıydı?"
[ ThumbsUp  Evet ]   [ ThumbsDown  Hayır ]
```
- İkonlar: Lucide `ThumbsUp` / `ThumbsDown` (emoji yok)
- Buton stili: `rounded-xl border font-manrope font-bold text-[11px] uppercase tracking-wider`
- Evet: hover `bg-es-primary/10 border-es-primary/40 text-es-primary`
- Hayır: hover `bg-es-error/10 border-es-error/40 text-es-error`

**asking_reason görünümü (Hayır seçilince):**
```
"Neyi eksik buldun?"   (opsiyonel)
[ textarea 3 satır, placeholder: "Yazabilirsin..." ]
[ Gönder ]
```
- `trackInteraction({ interaction_type: 'feedback_negative', note: reason })`
- Sebep boş da gönderilebilir

**sent görünümü:**
```
[ CheckCircle2 ]  Geri bildirim alındı, teşekkürler.
```
- Lucide `CheckCircle2` ikonu (✓ karakter değil)

---

## 3. Ortak Util

`frontend/src/features/analysis/analysisTheme.js` — `getTheme`, `buildExplanation`, `RING_CIRC` sabiti.  
Hem `AnalysisResultCard` hem `AnalysisModal` bu dosyayı import eder. Kod tekrarı önlenir.

---

## 4. Tasarım Kararları

| Karar | Gerekçe |
|-------|---------|
| NewsSummaryModal terminal estetiği (köşeli) | PopularNewsGrid kartlarıyla tutarlılık |
| AnalysisModal overlay katmanı NewsSummaryModal üstünde | Kullanıcı özete geri dönebilir |
| FeedbackBar'da reason opsiyonel | Zorunlu alan UX'i bozar |
| getTheme util'e taşınır | AnalysisModal'ın AnalysisResultCard'a bağımlı olmaması |

---

## 5. Etkilenen Dosyalar

| Dosya | Değişim |
|-------|---------|
| `frontend/src/features/analysis/NewsSummaryModal.jsx` | **Yeni** |
| `frontend/src/features/analysis/AnalysisModal.jsx` | **Yeni** |
| `frontend/src/features/analysis/analysisTheme.js` | **Yeni** (util) |
| `frontend/src/features/analysis/FeedbackBar.jsx` | Değiştirildi |
| `frontend/src/features/analysis/AnalysisResultCard.jsx` | getTheme/buildExplanation → util import |
| `frontend/src/components/features/gundem/PopularNewsGrid.jsx` | AnalyzeButton güncellendi |
