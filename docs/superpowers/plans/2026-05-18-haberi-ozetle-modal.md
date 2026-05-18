# Haberi Özetle Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Analiz Et" butonunu "Haberi Özetle" olarak değiştir, özet modalı + kompakt analiz modalı ekle, FeedbackBar'daki emojileri kaldırıp sebep alanı ekle.

**Architecture:** `analysisTheme.js` util dosyasına ortak tema/yardımcı fonksiyonlar taşınır. `NewsSummaryModal` özet + feedback gösterir. `AnalysisModal` modal bağlamı için sıfırdan tasarlanmış kompakt analiz görünümüdür. `PopularNewsGrid` AnalyzeButton yeni modal akışına bağlanır.

**Tech Stack:** React 19, Lucide React, Tailwind CSS 4, createPortal

---

## Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `frontend/src/features/analysis/analysisTheme.js` | Oluştur |
| `frontend/src/features/analysis/NewsSummaryModal.jsx` | Oluştur |
| `frontend/src/features/analysis/AnalysisModal.jsx` | Oluştur |
| `frontend/src/features/analysis/FeedbackBar.jsx` | Değiştir |
| `frontend/src/features/analysis/AnalysisResultCard.jsx` | Değiştir (analysisTheme import) |
| `frontend/src/components/features/gundem/PopularNewsGrid.jsx` | Değiştir |

---

## Task 1: analysisTheme.js util oluştur

`getTheme`, `buildExplanation`, `RING_CIRC`, `SIGNAL_WEIGHT_ORDER` tanımlarını `AnalysisResultCard`'dan buraya taşı. Böylece hem `AnalysisResultCard` hem `AnalysisModal` aynı kaynaktan import eder.

**Files:**
- Create: `frontend/src/features/analysis/analysisTheme.js`
- Modify: `frontend/src/features/analysis/AnalysisResultCard.jsx`

- [ ] **Step 1: analysisTheme.js dosyasını oluştur**

`frontend/src/features/analysis/analysisTheme.js` içeriği:

```js
import { ShieldCheck, ShieldX, Shield } from 'lucide-react';
import { DISPLAY_THRESHOLD } from './signalConfig';

export const RING_CIRC = 264;

export const SIGNAL_WEIGHT_ORDER = [
    'clickbait_score', 'exclamation_ratio', 'uppercase_ratio',
    'hedge_ratio', 'question_density', 'avg_word_length', 'number_density',
];

export function getTheme(isAuthentic, isFake, isIddia) {
    if (isAuthentic) return {
        hex:       '#3fff8b',
        Icon:      ShieldCheck,
        label:     'ANALİZ TAMAMLANDI',
        mainTitle: 'Güvenilir İçerik Tespit Edildi',
        glowRgb:   '63,255,139',
        statusCls: 'text-es-primary',
        bgCls:     'bg-es-primary',
        onBgCls:   'text-[#004820]',
        borderVar: '#3fff8b',
    };
    if (isFake) return {
        hex:       '#ff7351',
        Icon:      ShieldX,
        label:     'RİSK TESPİT EDİLDİ',
        mainTitle: 'Yüksek Yanıltma Riski Mevcut',
        glowRgb:   '255,115,81',
        statusCls: 'text-es-error',
        bgCls:     'bg-es-error',
        onBgCls:   'text-[#450900]',
        borderVar: '#ff7351',
    };
    if (isIddia) return {
        hex:       '#f59e0b',
        Icon:      Shield,
        label:     'İDDİA TESPİT EDİLDİ',
        mainTitle: 'İddia / Doğrulanamadı',
        glowRgb:   '245,158,11',
        statusCls: 'text-amber-500',
        bgCls:     'bg-amber-500',
        onBgCls:   'text-[#451a03]',
        borderVar: '#f59e0b',
    };
    return {
        hex:       '#71717a',
        Icon:      Shield,
        label:     'ANALİZ SONUCU',
        mainTitle: 'Sonuç Belirsiz',
        glowRgb:   '113,113,122',
        statusCls: 'text-muted',
        bgCls:     'bg-neutral-fill',
        onBgCls:   'text-white',
        borderVar: '#71717a',
    };
}

export function buildExplanation(signals) {
    if (!signals) return null;
    const triggered = SIGNAL_WEIGHT_ORDER.filter(k => (signals[k] || 0) > DISPLAY_THRESHOLD);
    const tw    = signals.triggered_words || {};
    const parts = [];

    if (triggered.includes('clickbait_score')) {
        const words = tw.clickbait?.slice(0, 3) || [];
        parts.push(words.length > 0
            ? `'${words.join("', '")}' gibi clickbait ifadeler içeriyor`
            : 'clickbait dil yapısı içeriyor');
    }
    if (triggered.includes('exclamation_ratio')) parts.push('yüksek ünlem oranı');
    if (triggered.includes('uppercase_ratio'))   parts.push('anormal büyük harf kullanımı');
    if (triggered.includes('hedge_ratio')) {
        const words = tw.hedge?.slice(0, 2) || [];
        parts.push(words.length > 0
            ? `'${words.join("', '")}' gibi belirsiz kaynak ifadeleri`
            : 'belirsiz kaynak dili');
    }
    if (triggered.includes('question_density')) parts.push('yüksek soru yoğunluğu');
    if (triggered.includes('avg_word_length') && (signals.avg_word_length || 0) < 5.5)
        parts.push('kısa kelime ağırlıklı sensasyonel dil');
    if (triggered.includes('number_density')) parts.push('yoğun sayısal veri kullanımı');

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
        sentence += srcWords.length > 0
            ? ` Ancak '${srcWords.join("', '")}' gibi kaynak referansları da mevcut.`
            : ' Ancak güvenilir kaynak referansları da mevcut.';
    }
    return sentence;
}
```

- [ ] **Step 2: AnalysisResultCard.jsx'i güncelle — yerel tanımları kaldır, util'den import et**

`frontend/src/features/analysis/AnalysisResultCard.jsx` içindeki şu blokları sil ve yerlerine import ekle:

Silinecek satırlar (mevcut dosyada 19-66. satırlar arası):
```js
// SIGNAL_WEIGHT_ORDER tanımı (satır 19-22)
const SIGNAL_WEIGHT_ORDER = [...]

// buildExplanation fonksiyonu (satır 24-66)
function buildExplanation(signals) { ... }

// RING_CIRC sabiti (satır 69)
const RING_CIRC = 264;
```

Import bölümüne (satır 1-17 arasına) şunu ekle:
```js
import { getTheme, buildExplanation, RING_CIRC } from './analysisTheme';
```

`getTheme` fonksiyonu da dosyanın içinde (satır 72-117) tanımlıdır — onu da sil, artık `analysisTheme.js`'den geliyor.

Mevcut `import { ShieldCheck, ShieldX, Shield, Brain, ... }` satırındaki `ShieldCheck, ShieldX, Shield` import'larını kaldır (artık `analysisTheme.js` bunları içeriyor).

- [ ] **Step 3: Lint kontrolü**

```bash
cd frontend && npm run lint
```

Hata yoksa devam et.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/analysis/analysisTheme.js frontend/src/features/analysis/AnalysisResultCard.jsx
git commit -m "refactor: extract getTheme and buildExplanation to analysisTheme.js"
```

---

## Task 2: FeedbackBar yeniden yaz

Emojileri kaldır, Lucide ikonları kullan, dislike için sebep textarea ekle.

**Files:**
- Modify: `frontend/src/features/analysis/FeedbackBar.jsx`

- [ ] **Step 1: FeedbackBar.jsx'i tamamen değiştir**

`frontend/src/features/analysis/FeedbackBar.jsx` yeni içeriği:

```jsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { trackInteraction } from '../../services/interaction.service';

export default function FeedbackBar({ result }) {
    const [state,  setState]  = useState('idle'); // idle | asking_reason | sent
    const [reason, setReason] = useState('');

    if (!result) return null;

    const handlePositive = async () => {
        if (state !== 'idle') return;
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_positive' });
    };

    const handleNegative = () => {
        if (state !== 'idle') return;
        setState('asking_reason');
    };

    const handleSubmit = async () => {
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_negative', note: reason });
    };

    if (state === 'sent') return (
        <div className="mt-4 flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs text-tx-secondary"
             style={{ animation: 'fadeIn 0.3s ease' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-es-primary" />
            <span>Geri bildirim alındı, teşekkürler.</span>
        </div>
    );

    if (state === 'asking_reason') return (
        <div className="mt-4 flex flex-col gap-3 px-4 py-3 rounded-xl border border-brutal-border bg-base"
             style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">
                Neyi eksik buldun? <span className="normal-case font-normal">(opsiyonel)</span>
            </label>
            <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Yazabilirsin..."
                className="w-full rounded-xl border border-brutal-border/30 bg-surface-container-high/30 text-tx-primary text-sm p-3 resize-none placeholder:text-tx-secondary/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    className="px-5 py-2 rounded-xl font-manrope font-bold text-[11px] uppercase tracking-wider transition-all hover:opacity-85"
                    style={{ background: '#3fff8b22', color: '#3fff8b', border: '1px solid #3fff8b44' }}
                >
                    Gönder
                </button>
            </div>
        </div>
    );

    return (
        <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-brutal-border bg-base"
             style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
            <span className="text-xs text-tx-secondary font-medium">Bu analiz faydalı mıydı?</span>
            <div className="flex gap-2">
                <button
                    onClick={handlePositive}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-manrope font-bold text-[11px] uppercase tracking-wider hover:bg-authentic-bg hover:text-authentic-text hover:border-authentic-border transition-all duration-200"
                >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Evet
                </button>
                <button
                    onClick={handleNegative}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-manrope font-bold text-[11px] uppercase tracking-wider hover:bg-fake-bg hover:text-fake-text hover:border-fake-border transition-all duration-200"
                >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Hayır
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Lint kontrolü**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analysis/FeedbackBar.jsx
git commit -m "fix: replace emoji buttons with Lucide icons in FeedbackBar, add reason field for negative feedback"
```

---

## Task 3: NewsSummaryModal oluştur

Özet metnini gösterir, inline feedback (beğendi/beğenmedi + sebep), "Tam Analizi Gör" butonu.

**Files:**
- Create: `frontend/src/features/analysis/NewsSummaryModal.jsx`

- [ ] **Step 1: NewsSummaryModal.jsx dosyasını oluştur**

`frontend/src/features/analysis/NewsSummaryModal.jsx` içeriği:

```jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { trackInteraction } from '../../services/interaction.service';

const BRAND  = 'var(--color-brand-primary)';
const BORDER = 'var(--color-terminal-border-raw)';

function relTime(pubDate) {
    if (!pubDate) return '';
    const diff = Math.floor((Date.now() - new Date(pubDate)) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
    return `${Math.floor(diff / 86400)} gün`;
}

function SummaryFeedback() {
    const [state,  setState]  = useState('idle'); // idle | asking | sent
    const [reason, setReason] = useState('');

    const handlePositive = async () => {
        if (state !== 'idle') return;
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_positive' });
    };

    const handleNegative = () => {
        if (state !== 'idle') return;
        setState('asking');
    };

    const handleSubmit = async () => {
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_negative', note: reason });
    };

    if (state === 'sent') return (
        <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND }} />
            <span>Geri bildirim alındı, teşekkürler.</span>
        </div>
    );

    if (state === 'asking') return (
        <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: 'var(--color-text-muted)' }}>
                Neyi eksik buldun? <span className="normal-case font-normal">(opsiyonel)</span>
            </span>
            <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Yazabilirsin..."
                className="w-full text-sm p-2.5 resize-none focus:outline-none transition-colors"
                style={{
                    background:  'var(--color-terminal-surface)',
                    border:      `1px solid ${BORDER}`,
                    color:       'var(--color-text-primary)',
                }}
            />
            <button
                onClick={handleSubmit}
                className="self-end font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-all hover:brightness-110"
                style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
            >
                Gönder
            </button>
        </div>
    );

    return (
        <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Bu özet faydalı mıydı?
            </span>
            <div className="flex gap-2">
                <button
                    onClick={handlePositive}
                    className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 border transition-all hover:brightness-110"
                    style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
                >
                    <ThumbsUp className="w-3 h-3" /> Evet
                </button>
                <button
                    onClick={handleNegative}
                    className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 border transition-all hover:opacity-70"
                    style={{ borderColor: BORDER, color: 'var(--color-text-secondary)' }}
                >
                    <ThumbsDown className="w-3 h-3" /> Hayır
                </button>
            </div>
        </div>
    );
}

export default function NewsSummaryModal({ result, article, onClose, onAnalyze }) {
    const summary = result?.ai_comment?.news_summary;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg flex flex-col border"
                style={{ background: 'var(--color-terminal-surface)', borderColor: BORDER }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b"
                     style={{ borderColor: BORDER }}>
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: BRAND }} />
                        <span className="font-mono font-bold text-[10px] uppercase tracking-widest"
                              style={{ color: BRAND }}>
                            // HABER_ÖZETİ
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="opacity-40 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                </div>

                {/* Meta */}
                {(article.source_name || article.pub_date) && (
                    <div className="px-5 pt-3 flex items-center gap-2 font-mono text-[10px]"
                         style={{ color: 'var(--color-text-muted)' }}>
                        {article.source_name && (
                            <span className="font-semibold">{article.source_name}</span>
                        )}
                        {article.source_name && article.pub_date && <span>·</span>}
                        {article.pub_date && <span>{relTime(article.pub_date)}</span>}
                    </div>
                )}

                {/* Summary */}
                <div className="px-5 py-4 max-h-[40vh] overflow-y-auto">
                    {summary ? (
                        <p className="text-sm leading-relaxed"
                           style={{ color: 'var(--color-text-primary)' }}>
                            {summary}
                        </p>
                    ) : (
                        <p className="text-sm italic"
                           style={{ color: 'var(--color-text-muted)' }}>
                            Özet henüz mevcut değil, tam analizi deneyebilirsin.
                        </p>
                    )}
                </div>

                {/* Feedback */}
                <div className="px-5 py-3 border-t" style={{ borderColor: BORDER }}>
                    <SummaryFeedback />
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                    <button
                        onClick={onAnalyze}
                        className="w-full font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-3 border transition-all hover:brightness-110"
                        style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
                    >
                        Tam Analizi Gör →
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
```

- [ ] **Step 2: Lint kontrolü**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analysis/NewsSummaryModal.jsx
git commit -m "feat: add NewsSummaryModal with summary, feedback and analyze button"
```

---

## Task 4: AnalysisModal oluştur

Modal bağlamı için tasarlanmış kompakt analiz görünümü. `AnalysisResultCard`'dan bağımsız — `analysisTheme.js` kullanır.

**Files:**
- Create: `frontend/src/features/analysis/AnalysisModal.jsx`

- [ ] **Step 1: AnalysisModal.jsx dosyasını oluştur**

`frontend/src/features/analysis/AnalysisModal.jsx` içeriği:

```jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Brain, Link2, Info } from 'lucide-react';
import AICommentCard from './AICommentCard';
import FalseClaimsCard from './FalseClaimsCard';
import SignalPanel from './SignalPanel';
import ShareDropdown from '../../components/ui/ShareDropdown';
import { getTheme, buildExplanation, RING_CIRC } from './analysisTheme';

export default function AnalysisModal({ result, onClose }) {
    if (!result) return null;

    const isUrlAnalysis = !!result.truth_score;
    const displayScore  = isUrlAnalysis
        ? parseFloat(result.truth_score).toFixed(0)
        : (() => { const r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })();

    const targetOffset = parseFloat((RING_CIRC * (1 - parseFloat(displayScore) / 100)).toFixed(2));
    const [ringOffset, setRingOffset] = useState(RING_CIRC);
    useEffect(() => {
        const id = setTimeout(() => setRingOffset(targetOffset), 100);
        return () => clearTimeout(id);
    }, [targetOffset]);

    const status      = result.ai_comment?.gemini_verdict?.toUpperCase() || result.prediction?.toUpperCase() || 'UNKNOWN';
    const isAuthentic = ['AUTHENTIC', 'TRUE', 'GÜVENİLİR', 'REAL'].includes(status);
    const isFake      = ['FAKE', 'FALSE', 'YANILTICI'].includes(status);
    const isIddia     = ['IDDIA', 'UNCERTAIN'].includes(status);

    const theme      = getTheme(isAuthentic, isFake, isIddia);
    const signals    = result.signals    || null;
    const aiComment  = result.ai_comment || null;
    const explanation = buildExplanation(signals);
    const articleId  = result.direct_match_data?.db_article_id ?? result.db_article_id ?? null;

    const hasGeminiVerdict = !!aiComment?.gemini_verdict;
    const badgeLabel = isUrlAnalysis
        ? 'URL Analizi'
        : result.isDirectMatch
            ? 'Veritabanı Eşleşmesi'
            : hasGeminiVerdict
                ? 'Gemini AI Kararı'
                : 'Yapay Zeka Sınıflandırması';

    const hex08 = `${theme.hex}14`;
    const hex15 = `${theme.hex}26`;
    const hex30 = `${theme.hex}4d`;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl flex flex-col overflow-hidden"
                style={{
                    background:  'var(--color-bg-surface)',
                    border:      `1px solid ${hex30}`,
                    borderTop:   `3px solid ${theme.hex}`,
                    maxHeight:   '90vh',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header — sabit */}
                <div
                    className="p-5 flex items-center justify-between gap-4 shrink-0"
                    style={{ borderBottom: `1px solid ${hex15}` }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: hex15 }}>
                            <theme.Icon className={`w-5 h-5 ${theme.statusCls}`} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase block`}>
                                [ {theme.label} ]
                            </span>
                            <h2 className="text-tx-primary font-manrope font-extrabold text-base leading-tight truncate">
                                {theme.mainTitle}
                            </h2>
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">
                                {isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />}
                                {badgeLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Skor */}
                        {!aiComment ? (
                            <div className="relative flex items-center justify-center">
                                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 96 96">
                                    <circle cx="48" cy="48" r="42" fill="transparent"
                                            stroke={hex15} strokeWidth="7" />
                                    <circle cx="48" cy="48" r="42" fill="transparent"
                                            stroke={theme.hex} strokeWidth="7"
                                            strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="font-manrope font-black text-base leading-none text-tx-primary">
                                        %{displayScore}
                                    </span>
                                    <span className="text-tx-secondary text-[8px] tracking-tight uppercase mt-0.5">
                                        Güven
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="font-manrope font-black text-2xl leading-none"
                                      style={{ color: theme.hex }}>
                                    %{displayScore}
                                </span>
                                <span className="font-mono text-[9px] tracking-widest uppercase mt-0.5"
                                      style={{ color: `${theme.hex}80` }}>
                                    SCORE
                                </span>
                            </div>
                        )}
                        {/* Kapat */}
                        <button
                            onClick={onClose}
                            className="text-tx-secondary/40 hover:text-tx-primary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Gövde — scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {isUrlAnalysis && result.scraped_title && (
                        <div className="flex items-start gap-2 opacity-70">
                            <Link2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.statusCls}`} />
                            <p className={`text-xs font-medium truncate ${theme.statusCls}`}>
                                {result.scraped_title}
                            </p>
                        </div>
                    )}

                    {!result.isDirectMatch && (
                        <AICommentCard
                            aiComment={aiComment}
                            theme={theme}
                            sourceBiasSummary={result.source_bias_summary ?? null}
                            temporalAnalysis={result.temporal_analysis ?? null}
                        />
                    )}

                    {!isUrlAnalysis && signals && (
                        <div className="rounded-xl overflow-hidden"
                             style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>
                            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                <Brain className={`w-4 h-4 ${theme.statusCls}`} />
                                <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase`}>
                                    // İçerik_Analizi
                                </span>
                            </div>
                            <div className="px-4 pb-2">
                                <SignalPanel
                                    signals={signals}
                                    theme={theme}
                                    forceKeys={['clickbait_score', 'uppercase_ratio', 'exclamation_ratio', 'source_score']}
                                    sectionLabel=""
                                />
                            </div>
                            {explanation && (
                                <p className="px-4 pb-4 text-tx-secondary leading-relaxed text-sm italic">
                                    "{explanation}"
                                </p>
                            )}
                        </div>
                    )}

                    {!result.isDirectMatch && (
                        <FalseClaimsCard falseClaims={aiComment?.false_claims} />
                    )}
                </div>

                {/* Footer — sabit */}
                <div
                    className="px-5 py-3 flex items-center justify-between shrink-0"
                    style={{ borderTop: `1px solid ${hex15}`, background: 'var(--color-bg-surface-solid)' }}
                >
                    {articleId ? (
                        <ShareDropdown
                            url={`${window.location.origin}/s/analysis/${articleId}`}
                            text={`${status === 'FAKE' ? 'SAHTE' : 'GÜVENİLİR'} (%${displayScore}) | Sahte Haber Dedektifi`}
                        />
                    ) : <span />}
                    <button
                        onClick={onClose}
                        className="font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2 border transition-all hover:opacity-70"
                        style={{
                            borderColor: 'var(--color-terminal-border-raw)',
                            color:       'var(--color-text-secondary)',
                        }}
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
```

- [ ] **Step 2: Lint kontrolü**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analysis/AnalysisModal.jsx
git commit -m "feat: add AnalysisModal — compact modal-native analysis view"
```

---

## Task 5: PopularNewsGrid — AnalyzeButton güncelle

Buton metni değişir, yeni modal akışı bağlanır.

**Files:**
- Modify: `frontend/src/components/features/gundem/PopularNewsGrid.jsx`

- [ ] **Step 1: Import'ları güncelle**

`PopularNewsGrid.jsx` başındaki import satırlarını değiştir:

Mevcut:
```js
import AnalysisService from '../../../services/analysis.service';
import AnalysisResultCard from '../../../features/analysis/AnalysisResultCard';
import { trackInteraction } from '../../../services/interaction.service';
```

Yeni:
```js
import AnalysisService from '../../../services/analysis.service';
import NewsSummaryModal from '../../../features/analysis/NewsSummaryModal';
import AnalysisModal from '../../../features/analysis/AnalysisModal';
import { trackInteraction } from '../../../services/interaction.service';
```

- [ ] **Step 2: AnalyzeButton bileşenini değiştir**

Mevcut `AnalyzeButton` fonksiyonunu (satır 41-143) tamamen şununla değiştir:

```jsx
function AnalyzeButton({ article }) {
    const [phase,       setPhase]       = useState('idle');
    const [result,      setResult]      = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [showAnalysis,setShowAnalysis]= useState(false);
    const pollerRef = useRef(null);
    const lsKey     = article.source_url ? `g_analysis_${article.source_url}` : null;

    useEffect(() => {
        if (!lsKey) return;
        try {
            const raw = localStorage.getItem(lsKey);
            if (!raw) return;
            const { result: r, ts } = JSON.parse(raw);
            if (Date.now() - ts < 86_400_000) { setResult(r); setPhase('done'); }
            else localStorage.removeItem(lsKey);
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lsKey]);

    useEffect(() => {
        if (phase === 'done' && result && lsKey) {
            try { localStorage.setItem(lsKey, JSON.stringify({ result, ts: Date.now() })); } catch { /* ignore */ }
        }
    }, [phase, result, lsKey]);

    useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase === 'done') { setShowSummary(true); return; }
        if (phase !== 'idle' || !article.source_url) return;
        setPhase('loading');
        trackInteraction({ content_id: article.id, interaction_type: 'click', category: article.category, nlp_score_at_time: article.nlp_score });
        try {
            const data = await AnalysisService.analyzeUrl(article.source_url);
            if (!data.task_id) { setPhase('error'); return; }
            const t0 = Date.now();
            pollerRef.current = setInterval(async () => {
                try {
                    const s       = await AnalysisService.checkStatus(data.task_id);
                    const done    = s.status === 'SUCCESS' && s.result?.ai_comment != null;
                    const failed  = ['FAILED', 'FAILURE'].includes(s.status);
                    const timeout = Date.now() - t0 > 90_000;
                    if (done || (timeout && s.result)) {
                        clearInterval(pollerRef.current);
                        setResult(s.result);
                        setPhase('done');
                        setShowSummary(true);
                    } else if (failed || timeout) {
                        clearInterval(pollerRef.current);
                        setPhase('error');
                    }
                } catch { clearInterval(pollerRef.current); setPhase('error'); }
            }, 2000);
        } catch { setPhase('error'); }
    };

    if (phase === 'loading') return (
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: BRAND }}>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            taranıyor
        </span>
    );

    if (phase === 'done' && result) return (
        <>
            <button onClick={handleClick}
                    className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border transition-all hover:brightness-110"
                    style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
                özeti gör →
            </button>
            {showSummary && (
                <NewsSummaryModal
                    result={result}
                    article={article}
                    onClose={() => setShowSummary(false)}
                    onAnalyze={() => setShowAnalysis(true)}
                />
            )}
            {showAnalysis && (
                <AnalysisModal
                    result={result}
                    onClose={() => setShowAnalysis(false)}
                />
            )}
        </>
    );

    if (phase === 'error') return (
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-es-error)', opacity: 0.7 }}>hata</span>
    );

    return (
        <button onClick={handleClick} disabled={!article.source_url}
                className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border transition-all hover:brightness-110 disabled:opacity-30"
                style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
            haberi özetle →
        </button>
    );
}
```

- [ ] **Step 3: Lint kontrolü**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Manuel doğrulama**

Frontend sunucusu zaten çalışıyorsa http://localhost:5173 'deki Gündem sayfasını aç.

Kontrol listesi:
- [ ] Kart üzerindeki buton "haberi özetle →" yazıyor
- [ ] Tıklanınca spinner çıkıyor ("taranıyor")
- [ ] Analiz tamamlanınca "Özet Modalı" açılıyor
- [ ] Özet modalında kaynak adı ve zaman görünüyor
- [ ] "Tam Analizi Gör →" tıklanınca `AnalysisModal` açılıyor (NewsSummaryModal kapanmıyor, üstüne açılıyor)
- [ ] `AnalysisModal` kapatılınca özet modalı görünür kalıyor
- [ ] Feedback: "Evet" tıklanınca "Geri bildirim alındı" çıkıyor
- [ ] Feedback: "Hayır" tıklanınca textarea açılıyor, "Gönder" çalışıyor
- [ ] Önbellekten gelen sonuçta "özeti gör →" butonu doğrudan özet modalını açıyor

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/gundem/PopularNewsGrid.jsx
git commit -m "feat: replace analiz-et with haberi-ozetle flow — NewsSummaryModal + AnalysisModal"
```
