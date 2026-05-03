# Analysis Result Card Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminal/siber estetik uygulanarak analiz sonuç kartı yeniden tasarlanır; NLP sinyalleri clickbait odaklı her zaman gösterilir; AI bölümü haber özeti + doğrulama yorumu olarak ikiye ayrılır; kanıt linkleri domain adı gösterir.

**Architecture:** 4 dosya değişikliği — backend Gemini prompt'una `news_summary` eklenir; `SignalPanel` `forceKeys` prop alır; `AICommentCard` iki bölüme ayrılır; `AnalysisResultCard` NLP koşulu kaldırılır ve header terminal stiline geçer.

**Tech Stack:** FastAPI + Celery (Python), React 19 + Tailwind CSS 4 + Lucide icons + CSS custom properties (`--color-*`).

---

## Dosya Haritası

| Dosya | Değişiklik |
|-------|-----------|
| `workers/ai_comment_task.py` | `news_summary` alanı prompt + validation + dict |
| `frontend/src/features/analysis/SignalPanel.jsx` | `forceKeys`, `sectionLabel` props |
| `frontend/src/features/analysis/AICommentCard.jsx` | news_summary bölümü, domain fix, mono labels |
| `frontend/src/features/analysis/AnalysisResultCard.jsx` | NLP koşulu, header terminal stili, karma skor |

---

## Task 1: Backend — `workers/ai_comment_task.py`

**Files:**
- Modify: `workers/ai_comment_task.py`

### 1-A: `validate_gemini_response`'a news_summary validasyonu ekle

- [ ] **`validate_gemini_response` içinde `evidence = raw.get("evidence", [])` satırından hemen önce** şu bloğu ekle:

```python
# existing line ~117:
if len(summary) > 800:
    raw["summary"] = summary[:797] + "..."
# ADD THIS:
news_summary = raw.get("news_summary")
if news_summary is not None:
    if not isinstance(news_summary, str) or not news_summary.strip():
        raw["news_summary"] = None
    elif len(news_summary) > 250:
        raw["news_summary"] = news_summary[:247] + "..."
# existing line:
evidence = raw.get("evidence", [])
```

Edit aracıyla:
- old_string: `    if len(summary) > 800:\n        raw["summary"] = summary[:797] + "..."\n    evidence = raw.get("evidence", [])`
- new_string: (yukarıdaki blok)

### 1-B: `_build_prompt` — her iki task_block'a `news_summary` alanı ekle

`_build_prompt` içinde `"summary"` satırı iki kez geçer (aynı metin). `replace_all=True` ile:

- old_string:
```
- "summary": 2-3 cümle Türkçe açıklama — ne tespit edildi, neden bu karar verildi (max 500 karakter)
```
- new_string:
```
- "news_summary": Haberin ne iddia ettiğini 1-2 cümleyle tarafsızca özetle, karar belirtme (max 200 karakter)
- "summary": 2-3 cümle Türkçe açıklama — ne tespit edildi, neden bu karar verildi (max 500 karakter)
```
`replace_all=True` kullan (her iki task_block için).

### 1-C: `_build_enriched_prompt` — her iki task_block'a `news_summary` alanı ekle

Aynı şekilde `replace_all=True`:

- old_string:
```
- "summary": 2-3 cümle Türkçe açıklama (max 500 karakter). Kaynak yanlılığını ve tarih bilgisini açıklamana ekle.
```
- new_string:
```
- "news_summary": Haberin ne iddia ettiğini 1-2 cümleyle tarafsızca özetle, karar belirtme (max 200 karakter)
- "summary": 2-3 cümle Türkçe açıklama (max 500 karakter). Kaynak yanlılığını ve tarih bilgisini açıklamana ekle.
```

### 1-D: `generate_ai_comment` — `ai_comment` dict'e `news_summary` ekle

- old_string:
```python
    ai_comment = {
        "summary":        gemini_result["summary"] if gemini_result else None,
        "evidence":       gemini_result.get("evidence", []) if gemini_result else [],
```
- new_string:
```python
    ai_comment = {
        "summary":        gemini_result["summary"] if gemini_result else None,
        "news_summary":   gemini_result.get("news_summary") if gemini_result else None,
        "evidence":       gemini_result.get("evidence", []) if gemini_result else [],
```

### 1-E: Commit

```bash
git add workers/ai_comment_task.py
git commit -m "feat(backend): Gemini prompt'a news_summary alanı eklendi"
```

---

## Task 2: `SignalPanel.jsx` — forceKeys + sectionLabel props

**Files:**
- Modify: `frontend/src/features/analysis/SignalPanel.jsx`

- [ ] **Dosyanın tamamını şu içerikle değiştir:**

```jsx
import React from 'react';
import { DISPLAY_THRESHOLD } from './signalConfig';

const SIGNAL_CONFIG = [
    { key: 'clickbait_score',   label: 'Clickbait',            norm: v => v * 100,        color: null },
    { key: 'exclamation_ratio', label: 'Ünlem Oranı',          norm: v => v * 100,        color: null },
    { key: 'uppercase_ratio',   label: 'Büyük Harf',           norm: v => v * 100,        color: null },
    { key: 'hedge_ratio',       label: 'Belirsiz Dil',         norm: v => v * 100,        color: null },
    { key: 'question_density',  label: 'Soru Yoğunluğu',       norm: v => v * 100,        color: null },
    { key: 'number_density',    label: 'Sayı Yoğunluğu',       norm: v => v * 100,        color: null },
    { key: 'avg_word_length',   label: 'Kelime Uzunluğu',      norm: v => (v / 10) * 100, color: null, shouldShow: v => v < 5.5 },
    { key: 'source_score',      label: 'Kaynak Güvenilirliği', norm: v => v * 100,        color: 'green' },
];

const SOURCE_HEX = '#3fff8b';

const SignalPanel = ({
    signals,
    theme,
    maxSignals  = null,
    forceKeys   = null,
    sectionLabel = 'Tespit Edilen Sinyaller',
}) => {
    if (!signals) return null;

    let visibleSignals;
    if (forceKeys) {
        visibleSignals = SIGNAL_CONFIG.filter(({ key }) => forceKeys.includes(key));
    } else {
        visibleSignals = SIGNAL_CONFIG.filter(({ key, shouldShow }) => {
            const value = signals[key] ?? 0;
            if (shouldShow) return shouldShow(value);
            return value > DISPLAY_THRESHOLD;
        });
        if (maxSignals !== null) {
            visibleSignals = visibleSignals
                .sort((a, b) => {
                    const va = Math.min(a.norm(signals[a.key] || 0), 100);
                    const vb = Math.min(b.norm(signals[b.key] || 0), 100);
                    return vb - va;
                })
                .slice(0, maxSignals);
        }
    }

    if (visibleSignals.length === 0) return null;

    const gridCls = forceKeys
        ? 'grid grid-cols-2 sm:grid-cols-4 gap-3'
        : 'grid grid-cols-1 sm:grid-cols-3 gap-3';

    return (
        <div>
            {sectionLabel && (
                <p className="text-tx-secondary text-[10px] font-mono font-bold tracking-widest uppercase mb-3">
                    // {sectionLabel.toUpperCase().replace(/ /g, '_')}
                </p>
            )}
            <div className={gridCls}>
                {visibleSignals.map(({ key, label, norm, color }) => {
                    const rawValue   = signals[key] || 0;
                    const barWidth   = Math.min(norm(rawValue), 100).toFixed(1);
                    const displayPct = Math.round(parseFloat(barWidth));
                    const isGreen    = color === 'green';

                    const accentHex  = isGreen ? SOURCE_HEX : theme.hex;
                    const valueColor = accentHex;
                    const barTrack   = `${accentHex}26`;

                    return (
                        <div
                            key={key}
                            className="rounded-xl p-4"
                            style={{
                                background: 'var(--color-bg-surface)',
                                border: `1px solid ${accentHex}22`,
                            }}
                        >
                            <span className="text-tx-secondary text-[10px] font-mono font-bold tracking-widest uppercase block mb-3">
                                {label}
                            </span>
                            <div className="flex items-end gap-2 mb-2">
                                <span
                                    className="text-xl font-manrope font-black leading-none"
                                    style={{ color: valueColor }}
                                >
                                    %{displayPct}
                                </span>
                            </div>
                            <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: barTrack }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${barWidth}%`, background: accentHex }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SignalPanel;
```

- [ ] **Commit:**

```bash
git add frontend/src/features/analysis/SignalPanel.jsx
git commit -m "feat(frontend): SignalPanel forceKeys + sectionLabel props"
```

---

## Task 3: `AICommentCard.jsx` — Haber Özeti + domain fix + mono labels

**Files:**
- Modify: `frontend/src/features/analysis/AICommentCard.jsx`

- [ ] **Dosyanın tamamını şu içerikle değiştir:**

```jsx
import React from 'react';
import {
    Sparkles, ExternalLink, Search, Clock, AlertTriangle,
    FileText, CheckCircle2,
} from 'lucide-react';

const AICommentCard = ({ aiComment, theme, sourceBiasSummary = null, temporalAnalysis = null }) => {
    const hex08 = `${theme.hex}14`;
    const hex15 = `${theme.hex}26`;
    const hex30 = `${theme.hex}4d`;

    return (
        <div className="rounded-xl overflow-hidden" style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>

            {/* Başlık */}
            <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <Sparkles className={`w-4 h-4 ${theme.statusCls}`} />
                <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase`}>
                    // AI_Analiz_Sonucu
                </span>
            </div>

            {/* Mevcut değil */}
            {!aiComment && (
                <p className="text-tx-secondary/50 text-sm italic px-4 sm:px-5 pb-4">
                    AI yorumu şu an mevcut değil.
                </p>
            )}

            {aiComment && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">

                    {/* Temporal uyarı */}
                    {temporalAnalysis?.freshness_flag === 'recycled' && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
                             style={{ background: '#f59e0b14', border: '1px solid #f59e0b33' }}>
                            <Clock className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                            <p className="text-amber-500 text-[10px] font-bold leading-snug">
                                Eski bilgi yeniden dolaşımda
                                {temporalAnalysis.temporal_gap_days && (
                                    <span className="font-normal opacity-80">
                                        {' '}· {Math.round(temporalAnalysis.temporal_gap_days / 365 * 10) / 10} yıl önce yayınlandı
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* reason_type pill */}
                    {aiComment.reason_type && (
                        <div className="flex items-center gap-1.5">
                            <Search className={`w-3 h-3 shrink-0 ${theme.statusCls} opacity-70`} />
                            <span
                                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                style={{
                                    background: `${theme.hex}1a`,
                                    color: theme.hex,
                                    border: `1px solid ${theme.hex}33`,
                                }}
                            >
                                {aiComment.reason_type}
                            </span>
                        </div>
                    )}

                    {/* Haber Özeti */}
                    {aiComment.news_summary && (
                        <div className="rounded-lg p-3 sm:p-4"
                             style={{ background: hex15, border: `1px solid ${hex15}` }}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <FileText className={`w-3 h-3 ${theme.statusCls} opacity-70`} />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-tx-secondary/60">
                                    // Haber_Özeti
                                </span>
                            </div>
                            <p className="text-tx-secondary text-sm leading-relaxed">
                                {aiComment.news_summary}
                            </p>
                        </div>
                    )}

                    {/* Doğrulama Yorumu */}
                    {aiComment.summary && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className={`w-3 h-3 ${theme.statusCls} opacity-70`} />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-tx-secondary/60">
                                    // Doğrulama_Yorumu
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed italic" style={{ color: theme.hex }}>
                                "{aiComment.summary}"
                            </p>
                        </div>
                    )}

                    {/* Kanıt linkleri */}
                    {aiComment.evidence?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-tx-secondary/60 mb-2">
                                // İlgili_Kaynaklar
                            </p>
                            <div className="space-y-1.5">
                                {aiComment.evidence.map((item, i) => {
                                    const domain = (() => {
                                        try { return new URL(item.url).hostname.replace(/^www\./, ''); }
                                        catch { return null; }
                                    })();
                                    return (
                                        <a
                                            key={i}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-2 group"
                                        >
                                            <ExternalLink className={`w-3 h-3 mt-0.5 shrink-0 ${theme.statusCls} opacity-60 group-hover:opacity-100 transition-opacity`} />
                                            <span className="text-xs leading-snug text-tx-secondary group-hover:text-tx-primary transition-colors line-clamp-2">
                                                {domain && (
                                                    <span className="font-bold mr-1.5" style={{ color: theme.hex }}>
                                                        [{domain}]
                                                    </span>
                                                )}
                                                {item.title}
                                                {item.date && (
                                                    <span className="text-tx-secondary/40 ml-1">({item.date})</span>
                                                )}
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Kaynak bias özeti */}
                    {sourceBiasSummary?.bias_summary && (
                        <div className="flex items-start gap-2 pt-3"
                             style={{ borderTop: `1px solid ${hex30}` }}>
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-tx-secondary/50" />
                            <p className="text-tx-secondary/70 text-[10px] leading-snug">
                                {sourceBiasSummary.bias_summary}
                            </p>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default AICommentCard;
```

- [ ] **Commit:**

```bash
git add frontend/src/features/analysis/AICommentCard.jsx
git commit -m "feat(frontend): AICommentCard — haber özeti + domain fix + mono labels"
```

---

## Task 4: `AnalysisResultCard.jsx` — Header terminal stili, karma skor, NLP koşulu

**Files:**
- Modify: `frontend/src/features/analysis/AnalysisResultCard.jsx`

### 4-A: Header — status etiketi terminal stiline geçir + ikon köşe aksanları

- [ ] **Status etiketini** `font-manrope` → `font-mono` + `[ ]` formatına çevir:

old_string:
```jsx
                        <span className={`${theme.statusCls} font-manrope font-bold text-[10px] tracking-widest uppercase block mb-0.5`}>
                            {theme.label}
                        </span>
```

new_string:
```jsx
                        <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase block mb-0.5`}>
                            [ {theme.label} ]
                        </span>
```

- [ ] **İkon kutusuna** `relative` ekle + köşe aksanları:

old_string:
```jsx
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: hex15 }}>
                        <theme.Icon className={`w-6 h-6 ${theme.statusCls}`} strokeWidth={2} />
                    </div>
```

new_string:
```jsx
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative"
                         style={{ background: hex15 }}>
                        <theme.Icon className={`w-6 h-6 ${theme.statusCls}`} strokeWidth={2} />
                        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-none"
                             style={{ background: theme.hex }} />
                        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-none"
                             style={{ background: theme.hex }} />
                    </div>
```

### 4-B: Karma skor gösterimi

- [ ] Mevcut `{!aiComment && (` skor halkası bloğunu **ternary** ile değiştir:

old_string:
```jsx
                {/* Sağ: SVG skor halkası — AI yorum varsa gizle */}
                {!aiComment && (
                    <div className="relative flex items-center justify-center shrink-0 self-center sm:self-auto">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r="42"
                                    fill="transparent" stroke={hex15}
                                    strokeWidth="7" />
                            <circle cx="48" cy="48" r="42"
                                    fill="transparent" stroke={theme.hex}
                                    strokeWidth="7"
                                    strokeDasharray={RING_CIRC}
                                    strokeDashoffset={ringOffset}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="font-manrope font-black text-xl leading-none text-tx-primary">
                                %{displayScore}
                            </span>
                            <span className="text-tx-secondary text-[9px] tracking-tight uppercase mt-0.5">
                                {scoreLabel}
                            </span>
                        </div>
                    </div>
                )}
```

new_string:
```jsx
                {/* Sağ: karma skor — AI yoksa halka, AI varsa metin */}
                {!aiComment ? (
                    <div className="relative flex items-center justify-center shrink-0 self-center sm:self-auto">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r="42"
                                    fill="transparent" stroke={hex15}
                                    strokeWidth="7" />
                            <circle cx="48" cy="48" r="42"
                                    fill="transparent" stroke={theme.hex}
                                    strokeWidth="7"
                                    strokeDasharray={RING_CIRC}
                                    strokeDashoffset={ringOffset}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="font-manrope font-black text-xl leading-none text-tx-primary">
                                %{displayScore}
                            </span>
                            <span className="text-tx-secondary text-[9px] tracking-tight uppercase mt-0.5">
                                {scoreLabel}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-end shrink-0 self-center sm:self-auto">
                        <span className="font-manrope font-black text-3xl leading-none"
                              style={{ color: theme.hex }}>
                            %{displayScore}
                        </span>
                        <span className="font-mono text-[9px] tracking-widest uppercase mt-1"
                              style={{ color: `${theme.hex}80` }}>
                            VERACITY_SCORE
                        </span>
                    </div>
                )}
```

### 4-C: NLP bölümü — koşul güncelle, clickbait odaklı

- [ ] Mevcut NLP bölümünü **`!aiComment` koşulsuz, `!isUrlAnalysis && signals` koşullu** yeni bölümle değiştir:

old_string:
```jsx
                {/* NLP Görüşü — sadece AI yorum yoksa göster */}
                {!aiComment && (
                    <div className="rounded-xl p-4 sm:p-5"
                         style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Brain className={`w-4 h-4 ${theme.statusCls}`} />
                            <span className={`${theme.statusCls} font-manrope font-bold text-xs tracking-wide`}>
                                NLP Analizi
                            </span>
                        </div>
                        <p className="text-tx-secondary leading-relaxed text-sm italic">
                            "{explanation || (isAuthentic
                                ? 'Analiz edilen metin, tarafsız bir dil yapısına ve doğrulanabilir veri setlerine yüksek uyum göstermektedir.'
                                : isFake
                                    ? 'İncelediğiniz metin, tipik yanıltıcı haber karakteristikleri taşımaktadır.'
                                    : 'Sistem bu metin hakkında kesin bir yargıya varamadı. Lütfen farklı kaynaklardan teyit ediniz.')}"
                        </p>
                    </div>
                )}
```

new_string:
```jsx
                {/* İçerik Analizi — URL analizinde gizle, her zaman göster */}
                {!isUrlAnalysis && signals && (
                    <div className="rounded-xl overflow-hidden"
                         style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>
                        <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
                            <Brain className={`w-4 h-4 ${theme.statusCls}`} />
                            <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase`}>
                                // İçerik_Analizi
                            </span>
                        </div>
                        <div className="px-4 sm:px-5 pb-2">
                            <SignalPanel
                                signals={signals}
                                theme={theme}
                                forceKeys={['clickbait_score', 'uppercase_ratio', 'exclamation_ratio', 'source_score']}
                                sectionLabel=""
                            />
                        </div>
                        {explanation && (
                            <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-tx-secondary leading-relaxed text-sm italic">
                                "{explanation}"
                            </p>
                        )}
                    </div>
                )}
```

### 4-D: Eski SignalPanel çağrısını sil

- [ ] `isFake` koşullu SignalPanel satırını kaldır:

old_string:
```jsx
                {/* Sinyal Paneli — URL analizinde ve AUTHENTIC'te gösterme, FAKE'te max 3 */}
                {!isUrlAnalysis && isFake && signals && (
                    <SignalPanel signals={signals} theme={theme} maxSignals={3} />
                )}
```

new_string: (boş string — tamamen sil)

### 4-E: Commit

```bash
git add frontend/src/features/analysis/AnalysisResultCard.jsx
git commit -m "feat(frontend): AnalysisResultCard — terminal header, karma skor, clickbait NLP bölümü"
```

---

## Doğrulama Adımları

Tüm task'lar bittikten sonra:

- [ ] `cd frontend && npm run dev` ile dev server başlat
- [ ] Bir haber URL'si analiz et → URL analizinde NLP bölümü **görünmemeli**, AICommentCard görünmeli
- [ ] Bir metin analiz et → NLP İçerik Analizi bölümü (4 sinyal) + AICommentCard **birlikte** görünmeli
- [ ] AICommentCard'da `news_summary` için "// Haber_Özeti" kutusu, `summary` için "// Doğrulama_Yorumu" bölümü görünmeli (eski kayıtlarda `news_summary` null olacağından Haber_Özeti kutusu görünmez — bu beklenen davranış)
- [ ] Kanıt linklerinde `[ntv.com.tr]` gibi domain etiketi görünmeli
- [ ] AI yorum varken header sağda `%XX VERACITY_SCORE` metin göstergesi, AI yokken animasyonlu halka görünmeli
- [ ] `npm run lint` hata vermemeli
