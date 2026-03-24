# Analiz Sonucu UX İyileştirme — Tasarım Dokümanı

**Tarih:** 2026-03-24
**Durum:** Onaylandı

---

## Özet

`AnalysisResultCard` bileşenine üç katman eklenerek kullanıcı sistemin kararını anlayabilir hale getirilecek:

1. **Sinyal paneli** — 8 NLP sinyalinin görsel breakdown'ı
2. **Otomatik açıklama** — sinyallerden template ile üretilen Türkçe cümle
3. **Metin highlight** — tetikleyen kelimelerin orijinal metinde renkli vurgulanması

---

## Backend Değişiklikleri

### `ml_engine/processing/cleaner.py`

`extract_manipulative_signals` ve `process` metodları `triggered_words` alanıyla genişletilecek:

```python
signals = {
    "clickbait_score": 0.42,
    "exclamation_ratio": 0.03,
    # ... diğer 6 sinyal ...
    "triggered_words": {
        "clickbait": ["şok", "bomba"],
        "hedge":     ["iddia edildi"],
        "source":    ["AA'ya göre"]
    }
}
```

- `triggered_words` her zaman döner; eşleşme yoksa ilgili key boş liste olur.
- Mevcut `signals` dict yapısı bozulmaz — `triggered_words` ek alan olarak eklenir.
- **`triggered_words`, `SIGNAL_KEYS` listesine eklenmez.** `signals_to_vector()` zaten `SIGNAL_KEYS` allowlist'ini kullanıyor; bu nedenle `float()` dönüşüm hatası riski yoktur. Ama bu açıkça belgelenmiştir.
- `triggered_words` JSONB olarak DB'ye kaydedilmesi kabul edilebilir — analitik ve debug için faydalıdır.

#### Çok Kelimeli İfade Eşleştirme

`_CLICKBAIT_WORDS` listesi `"son dakika"`, `"herkesi şoke etti"` gibi çok kelimeli ifadeler içerir. Token-bazlı (kelime-kelime) bölme bunları kaçırır. Bu nedenle `triggered_words` üretimi **substring arama** ile yapılır: orijinal metin (lowercase) içinde ifade geçiyor mu diye kontrol edilir. Bulunanlar `triggered_words["clickbait"]` listesine eklenir.

### `workers/tasks.py`

Değişiklik gerekmez. `signals` dict zaten olduğu gibi response'a ekleniyor; `triggered_words` otomatik taşınır.

### `app/api/v1/endpoints/analysis.py` — Stage 1 (Direct Match)

Direct match durumunda sinyal hesaplanmıyor. Bu path için de `cleaner.process()` çağrısı eklenir; `triggered_words` dahil sinyaller `direct_match_data` içinde döner:

```python
# Direct match path'e eklenecek
nlp_result = cleaner.process(raw_iddia=request.text)
direct_match_data["signals"] = nlp_result["signals"]  # triggered_words dahil
```

---

## Frontend Değişiklikleri

### `useAnalysis.js` — Kritik Güncelleme

Direct-match branch, `result` nesnesini manuel build ederken şu iki alan da eklenir:

- `signals`: `data.direct_match_data.signals` (backend'den yeni gelen alan)
- `originalText`: kullanıcının gönderdiği ham metin (hook içinde zaten mevcut olan `request.text`)

Bu olmadan `SignalPanel` ve `HighlightedText` direct-match durumunda boş kalır.

### Yeni Bileşenler

#### `SignalPanel.jsx`

Props: `signals` (dict), `theme` (mevcut `AnalysisResultCard`'dan aşağı geçirilen `theme` objesi — `theme.progressFill` gibi Tailwind sınıfları)

**Gösterim eşiği:** `> 0.005` olan sinyaller listelenir. Bu eşik altındakiler gösterilmez — boş panel kirliliği önlenir.

Sinyal adları ve bar davranışı:

| Key | Türkçe Etiket | Normalizasyon | Renk |
|-----|---------------|---------------|------|
| `clickbait_score` | Clickbait | ham değer × 100 | tema rengi |
| `exclamation_ratio` | Ünlem Oranı | ham değer × 100 | tema rengi |
| `uppercase_ratio` | Büyük Harf | ham değer × 100 | tema rengi |
| `hedge_ratio` | Belirsiz Dil | ham değer × 100 | tema rengi |
| `question_density` | Soru Yoğunluğu | ham değer × 100 | tema rengi |
| `number_density` | Sayı Yoğunluğu | ham değer × 100 | tema rengi |
| `avg_word_length` | Kelime Uzunluğu | değer / 10.0 × 100 | tema rengi |
| `source_score` | Kaynak Güvenilirliği | ham değer × 100 | **yeşil** (negatif katkı = olumlu sinyal) |

`avg_word_length` 0–10 arası ham değer taşır; diğerleri zaten 0–1 aralığında. Progress bar için `/ 10.0 × 100` normalizasyonu uygulanır.

#### `HighlightedText.jsx`

Props: `text` (orijinal metin string'i), `triggeredWords` (dict — `signals.triggered_words`)

**Render koşulu:** `isUrlAnalysis === true` olduğunda bileşen render edilmez (`AnalysisResultCard`'daki mevcut `isUrlAnalysis = !!result.truth_score` flag'i kullanılır). Direct match ve deep analysis text sonuçlarında gösterilir; `text` prop'u `undefined` ise de render edilmez.

**Renk kodlaması:**

| Kategori | Renk |
|----------|------|
| `clickbait` | Kırmızı / tema fake rengi |
| `hedge` | Turuncu |
| `source` | Yeşil |

**Implementasyon — XSS güvenliği:**

`dangerouslySetInnerHTML` KULLANILMAZ. Bunun yerine metin karakter dizisi olarak işlenir ve React node dizisine dönüştürülür:

1. Tüm `triggered_words` ifadeleri (tüm kategorilerden) ve kategorileri bir listeye alınır, uzun ifadeler önce gelecek şekilde uzunluğa göre sıralanır (greedy matching — "son dakika haberi" önce, "son" sonra).
2. Metin baştan sona taranır; eşleşen span `<mark className="...">` React elementi olarak, eşleşmeyen kısımlar düz `string` olarak diziye eklenir.
3. Bileşen bu diziyi `<p>` içinde render eder — inject edilmiş HTML yoktur.

### `AnalysisResultCard.jsx` Değişiklikleri

- `SignalPanel` ve `HighlightedText` import edilir.
- `signals` ve `result.originalText` prop'tan okunur.
- Otomatik açıklama üretimi (statik fallback mesajın yerine):

**Algoritma:** Sinyaller risk katkısına göre sıralanır (risk formülündeki ağırlıklar baz alınır: clickbait 0.30, exclamation 0.20, uppercase 0.15, hedge 0.15, question 0.10, short_word 0.10, number 0.05). `> 0.005` eşiğini geçen ilk 2-3 sinyal seçilir.

**Template örnekleri:**

```
clickbait var      → "Bu metin '{kelimeler}' gibi clickbait ifadeler içeriyor."
exclamation var    → "Yüksek ünlem oranı tespit edildi."
uppercase var      → "Metinde anormal büyük harf kullanımı var."
hedge var          → "'{kelimeler}' gibi belirsiz kaynak ifadeleri içeriyor."
source var         → "Güvenilir kaynak referansı tespit edildi."
hiçbiri yok        → "Belirgin bir manipülasyon sinyali tespit edilmedi."
```

- Birden fazla sinyal varsa cümleler birleştirilir: `"Bu metin 'şok', 'bomba' gibi clickbait ifadeler ve yüksek ünlem oranı içeriyor."`
- `source_score` yüksekse açıklamaya pozitif cümle eklenir.

**Yerleşim sırası (yukarıdan aşağı):**
1. Header (karar + ikon)
2. Progress bar (confidence)
3. Otomatik açıklama metni
4. `SignalPanel`
5. `HighlightedText` (metin analizi ve direct match için; URL analizinde gösterilmez)
6. Footer (geri bildirim butonları)

---

## Veri Akışı

```
cleaner.process(text)
  └─> signals {
        clickbait_score, exclamation_ratio, ...  (8 sayısal sinyal)
        triggered_words: { clickbait: [...], hedge: [...], source: [...] }
      }

tasks.py / analysis.py
  └─> response: { signals: { ..., triggered_words: {...} } }

useAnalysis.js
  └─> result: {
        signals,           ← tüm path'lerde (deep + direct match)
        originalText,      ← kullanıcının girdiği ham metin
        ...
      }

AnalysisResultCard
  ├─> açıklama cümlesi (template, signals'dan)
  ├─> SignalPanel(signals, theme)
  └─> HighlightedText(originalText, signals.triggered_words)
        — sadece metin analizi ve direct match için
```

---

## Kapsam Dışı

- Gemini API ile açıklama üretimi (maliyet nedeniyle)
- Accordion / modal yaklaşımı (inline tercih edildi)
- ThumbsUp/Down butonlarının backend'e bağlanması (ayrı konu)
