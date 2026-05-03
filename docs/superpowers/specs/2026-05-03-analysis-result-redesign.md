# Analysis Result Card Redesign — Design Spec
**Date:** 2026-05-03  
**Status:** Approved

## Overview

Terminal/siber estetik uygulanarak analiz sonuç kartı yeniden tasarlanır. NLP sinyalleri AI ile birlikte gösterilir (clickbait odaklı). AI bölümü haber özeti + doğrulama yorumu olarak ikiye ayrılır. Gemini backend'e `news_summary` alanı eklenir. Kanıt linkleri domain adı gösterir.

---

## 1. Backend — `workers/ai_comment_task.py`

### Değişiklikler

**`validate_gemini_response`:**
```python
news_summary = raw.get("news_summary")
if news_summary is not None:
    if not isinstance(news_summary, str) or not news_summary.strip():
        raw["news_summary"] = None
    elif len(news_summary) > 250:
        raw["news_summary"] = news_summary[:247] + "..."
```

**`_build_prompt` — her iki task_block (needs_decision=True/False):**  
`"summary"` satırından önce ekle:
```
- "news_summary": Haberin ne iddia ettiğini 1-2 cümleyle tarafsızca özetle, karar belirtme (max 200 karakter)
```

**`_build_enriched_prompt` — her iki task_block (needs_decision=True/False):**  
Aynı `news_summary` satırını ekle.

**`generate_ai_comment` — `ai_comment` dict:**
```python
"news_summary": gemini_result.get("news_summary") if gemini_result else None,
```
`"summary"` satırının hemen altına.

### Notlar
- Eski kayıtlarda `news_summary` null gelir — frontend null kontrolü yapar, bölüm gizlenir.
- `validate_gemini_response` null kabul eder (alan eksikse response reddedilmez).

---

## 2. SignalPanel.jsx

### Yeni Props
| Prop | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `forceKeys` | `string[] \| null` | `null` | Belirtilen anahtarları threshold filtresi olmadan göster |
| `sectionLabel` | `string` | `'Tespit Edilen Sinyaller'` | Bölüm başlığı |

### Mantık
```
if (forceKeys) {
  visibleSignals = SIGNAL_CONFIG.filter(({ key }) => forceKeys.includes(key))
} else {
  // mevcut threshold+maxSignals mantığı değişmez
}
```

### Grid düzeni
- Normal mod: `grid-cols-1 sm:grid-cols-3` (değişmez)
- `forceKeys` modu: `grid-cols-2 sm:grid-cols-4` (4 sinyal için)

---

## 3. AnalysisResultCard.jsx

### Header değişiklikleri
- **Status etiketi:** `font-mono` + `[ {theme.label} ]` formatı
- **İkon kutusu:** `relative` + 2 köşe aksanı (sol-üst, sağ-alt) — `w-1.5 h-1.5`, tema rengi
- **Skor (karma):**
  - `aiComment` yoksa → mevcut animasyonlu SVG halka (değişmez)
  - `aiComment` varsa → `%XX` büyük metin + `VERACITY_SCORE` mono etiket

### NLP Bölümü (yeni — text analizi için)
- **Koşul:** `!isUrlAnalysis && signals` (URL analizinde gizlenir)
- **`{!aiComment && (` koşulu kaldırılır** — NLP her zaman gösterilir
- **Başlık:** `Brain` ikonu + `// İçerik_Analizi` (mono font, tema rengi)
- **Sinyaller:** `<SignalPanel forceKeys={['clickbait_score','uppercase_ratio','exclamation_ratio','source_score']} sectionLabel="İçerik Analizi" />`
- **Açıklama metni:** `buildExplanation(signals)` çıktısı — null/boşsa gösterilmez; `isAuthentic`/`isFake` bazlı fallback metinler kaldırılır
- **Mevcut** `{!isUrlAnalysis && isFake && <SignalPanel>}` satırı silinir

### Akış — Text Analizi
```
Header (ikon + başlık + halka VEYA metin skor)
Body:
  NLP Bölümü (İçerik Analizi — 4 sinyal grid + açıklama)
  HighlightedText (triggered_words varsa)
  AICommentCard
Footer (feedback)
```

### Akış — URL Analizi
```
Header
Body:
  Scraped title
  AICommentCard
Footer
```

---

## 4. AICommentCard.jsx

### Bölüm sırası
1. Temporal uyarı (recycled ise — değişmez)
2. `reason_type` pill badge (değişmez)
3. **[YENİ] Haber Özeti** — `aiComment.news_summary` varsa
4. **Doğrulama Yorumu** — `aiComment.summary` (mevcut özet, yeni etiketle)
5. Kanıt linkleri (domain fix ile)
6. Kaynak bias özeti (değişmez)

### Haber Özeti kutusu
```
[FileText ikonu] // Haber_Özeti   ← mono font, tx-secondary/60
hafif arka plan kutu (hex15 bg)
Normal metin (tarafsız özet)
```

### Doğrulama Yorumu
```
[CheckCircle2 ikonu] // Doğrulama_Yorumu   ← mono font
İtalik metin, tema rengi
```

### Kanıt linkleri — domain fix
```jsx
const domain = (() => {
  try { return new URL(item.url).hostname.replace(/^www\./, ''); }
  catch { return null; }
})();

// Render:
[domain]  title (date)
  ↑ tema rengi, font-bold
```
Geçersiz URL'de domain kısmı sessizce atlanır (sadece title gösterilir).

### Tüm başlıklar
Mono font + `//` prefix formatı: `// AI_Analiz_Sonucu`, `// Haber_Özeti`, `// Doğrulama_Yorumu`, `// İlgili_Kaynaklar`

---

## Kapsam Dışı
- JetBrains Mono import — `font-mono` (sistem monospace) kullanılır, yeni font eklenmez
- Forum share bölümü (mockup'ta var ama mevcut `ForumSuggestion` bileşeni zaten karşılıyor)
- `FullReportModal`, `FeedbackBar`, `RecommendationPanel`, `SimilarNewsSection` — değişmez
