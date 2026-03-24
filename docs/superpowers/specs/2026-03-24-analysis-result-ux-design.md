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

### `workers/tasks.py`

Değişiklik gerekmez. `signals` dict zaten olduğu gibi response'a ekleniyor; `triggered_words` otomatik taşınır.

### `app/api/v1/endpoints/analysis.py` — Stage 1 (Direct Match)

Direct match durumunda sinyal hesaplanmıyor. Bu path için de `cleaner.process()` çağrısı eklenir; `triggered_words` dahil sinyaller `direct_match_data` içinde döner.

---

## Frontend Değişiklikleri

### Yeni Bileşenler

#### `SignalPanel.jsx`

Props: `signals` (dict), `theme` (tema renkleri)

- Sıfırdan farklı olan sinyalleri listeler (boş satır gösterilmez)
- Her sinyal için yatay progress bar + yüzde değeri
- Sinyal adları Türkçe etiketle gösterilir:

| Key | Türkçe Etiket |
|-----|---------------|
| `clickbait_score` | Clickbait |
| `exclamation_ratio` | Ünlem Oranı |
| `uppercase_ratio` | Büyük Harf |
| `hedge_ratio` | Belirsiz Dil |
| `question_density` | Soru Yoğunluğu |
| `number_density` | Sayı Yoğunluğu |
| `avg_word_length` | Kelime Uzunluğu |
| `source_score` | Kaynak Güvenilirliği |

- `source_score` negatif katkı sağladığı için yeşil renk alır (diğerleri tema rengi).

#### `HighlightedText.jsx`

Props: `text` (orijinal metin), `triggeredWords` (dict)

- Metin token'lara bölünür; eşleşen kelimeler `<mark>` ile sarılır.
- Renk kodlaması:

| Kategori | Renk |
|----------|------|
| `clickbait` | Kırmızı / tema fake rengi |
| `hedge` | Turuncu |
| `source` | Yeşil |

- Büyük/küçük harf duyarsız eşleşme.
- Eşleşme yoksa düz metin döner, bileşen render'lanmaz.

### `AnalysisResultCard.jsx` Değişiklikleri

- `SignalPanel` ve `HighlightedText` import edilir.
- `signals` ve `triggered_words` prop'tan okunur.
- Otomatik açıklama: en güçlü 2-3 sinyalden template ile Türkçe cümle üretilir.
  - Örnek: *"Bu metin 'şok', 'bomba' gibi clickbait ifadeler ve yüksek ünlem oranı içeriyor."*
  - Mevcut sabit fallback mesaj bu dinamik cümleyle değiştirilir.
- Yerleşim sırası (yukarıdan aşağı):
  1. Header (karar + ikon)
  2. Progress bar (confidence)
  3. Otomatik açıklama metni
  4. `SignalPanel`
  5. `HighlightedText` (sadece metin analizi için — URL analizinde scrape edilen metin yoksa gösterilmez)
  6. Footer (geri bildirim butonları)

---

## Veri Akışı

```
cleaner.process(text)
  └─> signals + triggered_words

tasks.py / analysis.py
  └─> response: { signals: { ..., triggered_words: {...} } }

AnalysisResultCard
  ├─> SignalPanel(signals)
  ├─> HighlightedText(originalText, signals.triggered_words)
  └─> açıklama cümlesi (template, signals'dan)
```

---

## Kapsam Dışı

- Gemini API ile açıklama üretimi (maliyet nedeniyle)
- Accordion / modal yaklaşımı (inline tercih edildi)
- URL analizinde highlight (scrape edilen tam metin frontend'e dönmüyor)
- ThumbsUp/Down butonlarının backend'e bağlanması (ayrı konu)
