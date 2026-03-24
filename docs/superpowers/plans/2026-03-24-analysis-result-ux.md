# Analysis Result UX İyileştirme — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `AnalysisResultCard`'a sinyal paneli, metin highlight ve otomatik açıklama ekleyerek kullanıcının sistemin neden FAKE/AUTHENTIC kararı verdiğini anlamasını sağlamak.

**Architecture:** Backend `cleaner.py` `triggered_words` alanını sinyallere ekler; `analysis.py` direct-match path'inde de sinyal hesaplar; frontend 2 yeni component (`SignalPanel`, `HighlightedText`) ve güncellenen `AnalysisResultCard` ile bu veriyi görsel olarak sunar.

**Tech Stack:** Python 3.11, FastAPI, React 19, Tailwind CSS 4, lucide-react

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|--------|------------|
| `ml_engine/processing/cleaner.py` | Modify | `triggered_words` alanını sinyallere ekle |
| `app/api/v1/endpoints/analysis.py` | Modify | Direct-match path'e sinyal hesaplama ekle |
| `frontend/src/hooks/useAnalysis.js` | Modify | Direct-match result'a `signals` + `originalText` ekle |
| `frontend/src/features/analysis/SignalPanel.jsx` | Create | 8 sinyalin görsel breakdown'ı |
| `frontend/src/features/analysis/HighlightedText.jsx` | Create | Tetikleyen kelimelerin metinde renklendirilmesi |
| `frontend/src/features/analysis/AnalysisResultCard.jsx` | Modify | Yeni component'leri entegre et, dinamik açıklama ekle |

---

## Task 1: `cleaner.py` — `triggered_words` Eklenmesi

**Files:**
- Modify: `ml_engine/processing/cleaner.py:121-203`

### Neden bu sırayla?
Backend değişikliği ilk yapılır çünkü frontend bu veriye bağımlı. `triggered_words` `SIGNAL_KEYS`'e eklenmez — `signals_to_vector()` allowlist üzerinden çalışır, `float()` dönüşümü yapılmaz.

- [ ] **Step 1: Manuel test için mevcut durumu kaydet**

```bash
cd C:/Users/emina/Documents/GitHub/Fake-News-Detection-System
python -c "
from ml_engine.processing.cleaner import NewsCleaner
c = NewsCleaner()
r = c.process('ŞOKE EDEN HABER! Bomba iddialar ortaya çıktı, kaynaklar belirtiyor')
print(r['signals'])
"
```
Beklenen: `triggered_words` yok, sadece sayısal değerler.

- [ ] **Step 2: `extract_manipulative_signals` metoduna `triggered_words` ekle**

`ml_engine/processing/cleaner.py` dosyasında `extract_manipulative_signals` metodunun return dict'ini güncelle:

```python
# ── Triggered words — substring arama (çok kelimeli ifadeler dahil) ─────────
# Uzun ifadeler önce aranır (greedy matching: "son dakika haberi" > "son dakika")
triggered_clickbait = sorted(
    [phrase for phrase in _CLICKBAIT_WORDS if phrase in text_lower],
    key=len, reverse=True
)
triggered_hedge = sorted(
    [phrase for phrase in _HEDGE_WORDS if phrase in text_lower],
    key=len, reverse=True
)
triggered_source = sorted(
    [phrase for phrase in _SOURCE_KEYWORDS if phrase in text_lower],
    key=len, reverse=True
)
```

Return dict'ine ekle (mevcut 8 sayısal alandan sonra):

```python
"triggered_words": {
    "clickbait": triggered_clickbait,
    "hedge":     triggered_hedge,
    "source":    triggered_source,
},
```

Boş listeye sahip olabilir (eşleşme yoksa `[]`). Bu normaldir.

- [ ] **Step 3: Boş metin durumunda `triggered_words` ekle**

Metodun başındaki erken return'de de (satır 139-149) `triggered_words` alanı ekle:

```python
"triggered_words": {"clickbait": [], "hedge": [], "source": []},
```

- [ ] **Step 4: Manuel test ile doğrula**

```bash
python -c "
from ml_engine.processing.cleaner import NewsCleaner, signals_to_vector
c = NewsCleaner()
r = c.process('ŞOKE EDEN HABER! Bomba iddialar ortaya çıktı, kaynaklar belirtiyor')
signals = r['signals']
print('triggered_words:', signals['triggered_words'])
print('vector len:', len(signals_to_vector(signals)))  # 8 olmalı, 9 değil
"
```
Beklenen:
- `triggered_words` → `{'clickbait': ['şoke', 'bomba', 'ortaya çıktı'], 'hedge': ['iddia', ...], 'source': ['kaynaklar', ...]}`
- `vector len` → `8` (triggered_words vektöre girmez)

- [ ] **Step 5: Commit**

```bash
git add ml_engine/processing/cleaner.py
git commit -m "feat(nlp): triggered_words sinyallere eklendi — highlight için"
```

---

## Task 2: `analysis.py` — Direct-Match Path'e Sinyal Eklenmesi

**Files:**
- Modify: `app/api/v1/endpoints/analysis.py:59-115`

### Neden?
Şu an direct-match durumunda `direct_match_data` içinde `signals` yok. Frontend `SignalPanel` ve `HighlightedText` için bu veriye ihtiyaç duyuyor.

### Not: Senkron çağrı hakkında
`cleaner.process()` senkron bir CPU-bound fonksiyondur; `async def` endpoint içinde doğrudan çağrılır. Bu proje kısa haber metinleri (<500 karakter) analiz ettiğinden işlem süresi ihmal edilebilir düzeydedir ve event loop'u engellemez. Uzun metin senaryoları söz konusu olursa `run_in_executor` kullanılabilir; şimdilik kabul edilebilir.

- [ ] **Step 1: Mevcut direct-match response'u incele**

```bash
python -c "
import json
# analysis.py:100-115 arası direct_match_data içeriğini gözden geçir
print('direct_match_data anahtarları: similarity, original_status, mapped_status, evidence, match_count, vote_confidence')
"
```

- [ ] **Step 2: `analyze_content` fonksiyonuna direct-match sinyal hesabı ekle**

`app/api/v1/endpoints/analysis.py` dosyasında `cleaner = NewsCleaner()` zaten satır 25'te mevcut — yeni bir instance oluşturma.

`if matches:` bloğunun `return AnalysisResponse(...)` satırından **önce** şu kodu ekle:

```python
# Direct match için sinyal hesapla (triggered_words dahil)
# cleaner zaten line 25'te tanımlı, yeni instance gerekmez
nlp_result = cleaner.process(raw_iddia=request.text)
match_signals = nlp_result["signals"]
```

Ardından `direct_match_data` dict'ine `"signals": match_signals` ekle:

```python
direct_match_data={
    "similarity":      round(best_similarity, 2),
    "original_status": best_match.status or "Belirtilmemiş",
    "mapped_status":   winner,
    "evidence":        dayanak,
    "match_count":     len(matches),
    "vote_confidence": vote_confidence,
    "signals":         match_signals,   # ← yeni
},
```

- [ ] **Step 3: Swagger UI ile test et**

Sunucu çalışıyorsa `http://localhost:8000/docs` → `/analyze` endpoint'i → bilgi tabanındaki bir metni gir → response'da `direct_match_data.signals.triggered_words` görünmeli.

Sunucu çalışmıyorsa:
```bash
# Sadece import kontrolü
python -c "from app.api.v1.endpoints.analysis import router; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/endpoints/analysis.py
git commit -m "feat(api): direct-match response'a signals ve triggered_words eklendi"
```

---

## Task 3: `useAnalysis.js` — Direct-Match Result Güncellenmesi

**Files:**
- Modify: `frontend/src/hooks/useAnalysis.js:81-88`

### Neden?
Direct-match branch `result` nesnesini manuel build ediyor. `signals` ve `originalText` eklenmezse frontend yeni component'lere veri taşıyamaz.

- [ ] **Step 1: Mevcut direct-match branch'i incele**

`frontend/src/hooks/useAnalysis.js` satır 81-88:
```js
setResult({
    prediction: data.direct_match_data?.mapped_status || 'UNKNOWN',
    message: data.message,
    directMatchData: data.direct_match_data,
    isDirectMatch: true
});
```

- [ ] **Step 2: `signals` ve `originalText` ekle**

```js
setResult({
    prediction:     data.direct_match_data?.mapped_status || 'UNKNOWN',
    message:        data.message,
    directMatchData: data.direct_match_data,
    isDirectMatch:  true,
    signals:        data.direct_match_data?.signals || {},   // ← yeni
    originalText:   text,                                    // ← yeni
});
```

`text` değişkeni `analyze(text)` fonksiyon parametresidir — closure'da zaten erişilebilir.

- [ ] **Step 3: Deep analysis (polling) path için `originalText` sakla**

Polling sonucu `tasks.py`'dan gelen dict'te orijinal metin **yok**. Bunu korumak için `useRef` kullanılır (`useState` değil — re-render tetiklememeli, interval callback'te güncel değer okunmalı, lint `exhaustive-deps` uyarısı oluşmamalı).

Hook'a ekle (import'ta `useRef` ekle, ardından diğer state'lerin yanına):
```js
import { useState, useEffect, useRef } from 'react';
// ...
const pendingTextRef = useRef(null);
```

`analyze` fonksiyonunda `setPollingTaskId` öncesine:
```js
pendingTextRef.current = text;
setPollingTaskId(data.task_id);
```

`useEffect` içinde SUCCESS dalında `setResult` çağrısını güncelle:
```js
setResult({
    ...(response.result || response),
    originalText: pendingTextRef.current,  // ref — stale closure yok
});
pendingTextRef.current = null;
```

**Edge case kabul edildi:** Kullanıcı ilk polling tamamlanmadan yeni analiz başlatırsa `pendingTextRef.current` ezilir. Kabul edilebilir — `analyze()` zaten `setResult(null)` ile önceki sonucu temizler ve `pollingTaskId` değişince `useEffect` cleanup'ı önceki interval'ı iptal eder.

- [ ] **Step 4: Browser console ile test et**

Frontend çalışıyorsa bir metin analiz et, console'da:
```js
// React DevTools veya console'da
// result.originalText ve result.signals kontrol et
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAnalysis.js
git commit -m "feat(frontend): useAnalysis direct-match ve polling'e originalText ve signals eklendi"
```

---

## Task 4: `SignalPanel.jsx` — Yeni Component

**Files:**
- Create: `frontend/src/features/analysis/SignalPanel.jsx`

### Neden?
Tek sorumluluk: 8 sinyalin görsel breakdown'ı. `AnalysisResultCard`'dan ayrı tutulur — bağımsız test edilebilir ve gelecekte dashboard'da da kullanılabilir.

- [ ] **Step 1: Component'i oluştur**

`frontend/src/features/analysis/SignalPanel.jsx`:

```jsx
import React from 'react';

const SIGNAL_CONFIG = [
    { key: 'clickbait_score',   label: 'Clickbait',             norm: v => v * 100,        color: null },
    { key: 'exclamation_ratio', label: 'Ünlem Oranı',           norm: v => v * 100,        color: null },
    { key: 'uppercase_ratio',   label: 'Büyük Harf',            norm: v => v * 100,        color: null },
    { key: 'hedge_ratio',       label: 'Belirsiz Dil',          norm: v => v * 100,        color: null },
    { key: 'question_density',  label: 'Soru Yoğunluğu',        norm: v => v * 100,        color: null },
    { key: 'number_density',    label: 'Sayı Yoğunluğu',        norm: v => v * 100,        color: null },
    { key: 'avg_word_length',   label: 'Kelime Uzunluğu',       norm: v => (v / 10) * 100, color: null },
    { key: 'source_score',      label: 'Kaynak Güvenilirliği',  norm: v => v * 100,        color: 'green' },
];

const DISPLAY_THRESHOLD = 0.005;

const SignalPanel = ({ signals, theme }) => {
    if (!signals) return null;

    const visibleSignals = SIGNAL_CONFIG.filter(
        ({ key }) => (signals[key] || 0) > DISPLAY_THRESHOLD
    );

    if (visibleSignals.length === 0) return null;

    return (
        <div className="mt-4 mb-2">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2 ${theme.title}`}>
                Tespit Edilen Sinyaller
            </p>
            <div className="flex flex-col gap-2">
                {visibleSignals.map(({ key, label, norm, color }) => {
                    const rawValue = signals[key] || 0;
                    const barWidth = Math.min(norm(rawValue), 100).toFixed(1);
                    const displayPct = Math.round(parseFloat(barWidth));
                    const isGreen = color === 'green';

                    return (
                        <div key={key} className="flex items-center gap-2">
                            <span className={`text-[11px] font-medium w-36 shrink-0 ${theme.title} opacity-70`}>
                                {label}
                            </span>
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme.progressBg}`}>
                                <div
                                    className={`h-full rounded-full ${isGreen ? 'bg-green-500' : theme.progressFill}`}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                            <span className={`text-[11px] font-bold w-8 text-right ${isGreen ? 'text-green-600 dark:text-green-400' : theme.title}`}>
                                %{displayPct}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SignalPanel;
```

- [ ] **Step 2: Browser'da görsel test**

Frontend çalışıyorsa: bir metin analiz et → SignalPanel göründüğünü doğrula. Sinyal yoksa panel render edilmemeli.

Çalışmıyorsa lint kontrolü:
```bash
cd frontend && npm run lint 2>&1 | grep SignalPanel
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analysis/SignalPanel.jsx
git commit -m "feat(frontend): SignalPanel component eklendi"
```

---

## Task 5: `HighlightedText.jsx` — Yeni Component

**Files:**
- Create: `frontend/src/features/analysis/HighlightedText.jsx`

### Kritik: `dangerouslySetInnerHTML` KULLANILMAZ
Metin React node dizisi olarak render edilir — XSS riski yoktur.

- [ ] **Step 1: Component'i oluştur**

`frontend/src/features/analysis/HighlightedText.jsx`:

```jsx
import React from 'react';

const CATEGORY_COLORS = {
    clickbait: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded px-0.5',
    hedge:     'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded px-0.5',
    source:    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded px-0.5',
};

/**
 * triggered_words içindeki ifadeleri metinde renkli <mark> ile vurgular.
 * Uzun ifadeler önce aranır (greedy matching).
 * dangerouslySetInnerHTML kullanılmaz — React node dizisi döner.
 */
function buildHighlightedNodes(text, triggeredWords) {
    if (!text || !triggeredWords) return [text];

    // Tüm ifadeler: [{ phrase, category }], uzunluğa göre azalan sıra
    const entries = Object.entries(triggeredWords)
        .flatMap(([category, phrases]) =>
            (phrases || []).map(phrase => ({ phrase: phrase.toLowerCase(), category }))
        )
        .filter(e => e.phrase.length > 0)
        .sort((a, b) => b.phrase.length - a.phrase.length);

    if (entries.length === 0) return [text];

    // Metni tara; eşleşen span'ları React elementi, geri kalanı string olarak diz
    const nodes = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
        let earliestIndex = Infinity;
        let earliestEntry = null;

        for (const entry of entries) {
            const idx = remaining.toLowerCase().indexOf(entry.phrase);
            if (idx !== -1 && idx < earliestIndex) {
                earliestIndex = idx;
                earliestEntry = entry;
            }
        }

        if (!earliestEntry) {
            // Eşleşme kalmadı
            nodes.push(remaining);
            break;
        }

        // Eşleşme öncesi düz metin
        if (earliestIndex > 0) {
            nodes.push(remaining.slice(0, earliestIndex));
        }

        // Eşleşen kısım — orijinal case korunur
        const matchedText = remaining.slice(earliestIndex, earliestIndex + earliestEntry.phrase.length);
        nodes.push(
            <mark
                key={keyIndex++}
                className={CATEGORY_COLORS[earliestEntry.category] || ''}
                title={earliestEntry.category}
            >
                {matchedText}
            </mark>
        );

        remaining = remaining.slice(earliestIndex + earliestEntry.phrase.length);
    }

    return nodes;
}

const HighlightedText = ({ text, triggeredWords, theme }) => {
    if (!text || !triggeredWords) return null;

    const hasAnyTriggers = Object.values(triggeredWords).some(arr => arr && arr.length > 0);
    if (!hasAnyTriggers) return null;

    const nodes = buildHighlightedNodes(text, triggeredWords);

    return (
        <div className="mt-4">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2 ${theme.title}`}>
                Analiz Edilen Metin
            </p>
            <p className="text-tx-primary dark:text-tx-secondary text-sm leading-relaxed font-medium">
                {nodes}
            </p>
        </div>
    );
};

export default HighlightedText;
```

- [ ] **Step 2: Çok kelimeli ifade testi**

```bash
# Node.js ile hızlı mantık testi (tarayıcı gerekmez)
node -e "
const text = 'Son dakika haberi: Bomba iddialar ortaya çıktı!';
const triggered = { clickbait: ['son dakika', 'bomba', 'ortaya çıktı'], hedge: [], source: [] };
// buildHighlightedNodes string'ler ve object'ler içeren dizi döndürmeli
console.log('Manuel gözlem: son dakika çok kelimeli — substring match çalışmalı');
"
```

Frontend çalışıyorsa browser'da: çok kelimeli clickbait ifadesi içeren metin gir → highlight doğru çalışmalı.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analysis/HighlightedText.jsx
git commit -m "feat(frontend): HighlightedText component eklendi — XSS-safe React node dizisi"
```

---

## Task 6: `AnalysisResultCard.jsx` — Entegrasyon ve Dinamik Açıklama

**Files:**
- Modify: `frontend/src/features/analysis/AnalysisResultCard.jsx`

### Neden bu son?
Bağımlı olduğu her şey (SignalPanel, HighlightedText, backend signals, useAnalysis) hazır. Sabit fallback mesaj dinamik template ile değiştirilir.

- [ ] **Step 1: Otomatik açıklama fonksiyonunu ekle**

Dosyanın tepesine, import'lardan sonra:

```jsx
// Sinyallerden Türkçe açıklama üret
// Ağırlık sırası: clickbait 0.30 > exclamation 0.20 > uppercase 0.15 >
//                 hedge 0.15 > question 0.10 > avg_word 0.10 > number 0.05
const SIGNAL_WEIGHT_ORDER = [
    'clickbait_score', 'exclamation_ratio', 'uppercase_ratio',
    'hedge_ratio', 'question_density', 'avg_word_length', 'number_density',
];
const DISPLAY_THRESHOLD = 0.005;

function buildExplanation(signals) {
    if (!signals) return null;

    const triggered = SIGNAL_WEIGHT_ORDER.filter(k => (signals[k] || 0) > DISPLAY_THRESHOLD);
    const tw = signals.triggered_words || {};
    const parts = [];

    if (triggered.includes('clickbait_score')) {
        const words = tw.clickbait?.slice(0, 3) || [];
        parts.push(
            words.length > 0
                ? `'${words.join("', '")}' gibi clickbait ifadeler içeriyor`
                : 'clickbait dil yapısı içeriyor'
        );
    }
    if (triggered.includes('exclamation_ratio')) parts.push('yüksek ünlem oranı');
    if (triggered.includes('uppercase_ratio'))   parts.push('anormal büyük harf kullanımı');
    if (triggered.includes('hedge_ratio')) {
        const words = tw.hedge?.slice(0, 2) || [];
        parts.push(
            words.length > 0
                ? `'${words.join("', '")}' gibi belirsiz kaynak ifadeleri`
                : 'belirsiz kaynak dili'
        );
    }
    if (triggered.includes('question_density'))  parts.push('yüksek soru yoğunluğu');
    if (triggered.includes('avg_word_length') && (signals.avg_word_length || 0) < 5.5)
        parts.push('kısa kelime ağırlıklı sensasyonel dil');
    if (triggered.includes('number_density'))    parts.push('yoğun sayısal veri kullanımı');

    if (parts.length === 0) {
        if ((signals.source_score || 0) > DISPLAY_THRESHOLD) {
            const srcWords = tw.source?.slice(0, 2) || [];
            return srcWords.length > 0
                ? `Güvenilir kaynak referansı tespit edildi: '${srcWords.join("', '")}'.`
                : 'Güvenilir kaynak referansı tespit edildi.';
        }
        return 'Belirgin bir manipülasyon sinyali tespit edilmedi.';
    }

    let sentence = `Bu metin ${parts.join(', ')} içeriyor.`;
    if ((signals.source_score || 0) > DISPLAY_THRESHOLD) {
        const srcWords = tw.source?.slice(0, 2) || [];
        const srcNote = srcWords.length > 0
            ? ` Ancak '${srcWords.join("', '")}' gibi kaynak referansları da mevcut.`
            : ' Ancak güvenilir kaynak referansları da mevcut.';
        sentence += srcNote;
    }
    return sentence;
}
```

- [ ] **Step 2: Import'ları ekle ve prop'ları oku**

Dosyanın import satırlarına ekle:
```jsx
import SignalPanel from './SignalPanel';
import HighlightedText from './HighlightedText';
```

`AnalysisResultCard` component'ine `signals` ve `originalText` prop'larını ekle:
```jsx
const AnalysisResultCard = ({ result }) => {
    // ...mevcut kod...
    const signals     = result.signals || null;
    const originalText = result.originalText || null;
    const explanation = buildExplanation(signals);
    // ...
```

- [ ] **Step 3: Açıklama metnini dinamik hale getir**

Mevcut statik fallback metin bloğunu (`{/* Açıklama Metni */}` yorumunu ara, yaklaşık satır 99-109) şununla değiştir:

**Not:** `result.message` direct-match için benzerlik bilgisi içerir ("Sistemde %94 benzer..."). Bu bilgi kartın üst kısmında zaten görünür — açıklama bölümünde tekrar göstermek gereksiz. `explanation` birincil, hardcoded metin fallback olarak kullanılır.

```jsx
{/* Açıklama Metni */}
<div className="relative">
    <span className={`absolute -left-3 md:-left-4 -top-2 text-3xl md:text-4xl font-serif opacity-20 ${theme.title}`}>"</span>
    <p className="text-tx-primary dark:text-tx-secondary font-medium leading-relaxed text-sm md:text-base lg:text-lg italic px-2">
        {explanation || (isAuthentic
            ? "Analiz edilen metin, tarafsız bir dil yapısına ve doğrulanabilir veri setlerine yüksek uyum göstermektedir."
            : isFake
                ? "İncelediğiniz metin, tipik yanıltıcı haber karakteristikleri taşımaktadır."
                : "Sistem bu metin hakkında kesin bir yargıya varamadı. Lütfen farklı kaynaklardan teyit ediniz.")}
    </p>
</div>
```

- [ ] **Step 4: SignalPanel ve HighlightedText'i yerleştir**

Açıklama `</div>`'ından sonra, footer'dan önce:

```jsx
{/* Sinyal Paneli */}
{signals && <SignalPanel signals={signals} theme={theme} />}

{/* Metin Highlight — URL analizinde gösterilmez */}
{!isUrlAnalysis && originalText && signals?.triggered_words && (
    <HighlightedText
        text={originalText}
        triggeredWords={signals.triggered_words}
        theme={theme}
    />
)}
```

- [ ] **Step 5: Lint kontrolü**

```bash
cd frontend && npm run lint 2>&1 | grep -E "error|warning" | head -20
```

Hata yoksa devam.

- [ ] **Step 6: End-to-end browser testi**

Sunucu + frontend çalışıyorsa:
1. Yeni bir metin analizi başlat: `"ŞOKE EDEN HABER! Bomba iddialar ortaya çıktı, kaynaklar belirtiyor"`
2. Kontrol listesi:
   - [ ] Sinyal paneli görünüyor (Clickbait, Ünlem Oranı en üstte)
   - [ ] "Bu metin 'şoke', 'bomba' gibi clickbait ifadeler içeriyor." açıklaması görünüyor
   - [ ] Metinde "şoke", "bomba", "ortaya çıktı" kırmızı highlight ile işaretli
   - [ ] `source_score` varsa yeşil bar görünüyor
3. Bilgi tabanından direkt eşleşen bir metin ile direct-match test et:
   - [ ] Sinyal paneli ve highlight direct-match kartında da çalışıyor

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/analysis/AnalysisResultCard.jsx
git commit -m "feat(frontend): sinyal paneli, highlight ve dinamik açıklama entegre edildi"
```

---

## Doğrulama Özeti

| Test | Beklenen |
|------|----------|
| `signals_to_vector()` output length | 8 (triggered_words dahil değil) |
| `cleaner.process()` ile clickbait metin | `triggered_words.clickbait` dolu |
| `cleaner.process()` ile boş metin | `triggered_words: {clickbait:[], hedge:[], source:[]}` |
| Direct-match API response | `direct_match_data.signals.triggered_words` dolu |
| Deep analysis polling result | `result.signals.triggered_words` dolu |
| `SignalPanel` — sinyal yok | Component render edilmez |
| `HighlightedText` — URL analizi | Component render edilmez |
| `HighlightedText` — çok kelimeli "son dakika" | Tek blok olarak highlight |
| Açıklama — tüm sinyal sıfır | "Belirgin bir manipülasyon sinyali tespit edilmedi." |
