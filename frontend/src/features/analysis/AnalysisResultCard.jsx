import React, { useEffect, useState } from 'react';
import {
    ShieldCheck, ShieldX, Shield, Brain, MessageSquare,
    Link2, Info, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import SignalPanel from './SignalPanel';
import HighlightedText from './HighlightedText';
import { DISPLAY_THRESHOLD } from './signalConfig';

/* ─── Sinyal açıklaması ────────────────────────────────────────────── */
const SIGNAL_WEIGHT_ORDER = [
    'clickbait_score', 'exclamation_ratio', 'uppercase_ratio',
    'hedge_ratio', 'question_density', 'avg_word_length', 'number_density',
];

function buildExplanation(signals) {
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

/* ─── SVG halka (2π × r42 ≈ 264) ──────────────────────────────────── */
const RING_CIRC = 264;

/* ─── Tema rengi seçici ────────────────────────────────────────────── */
function getTheme(isAuthentic, isFake) {
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

/* ─── Bileşen ──────────────────────────────────────────────────────── */
const AnalysisResultCard = ({ result }) => {
    if (!result) return null;

    const status      = result.prediction?.toUpperCase() || 'UNKNOWN';
    const isAuthentic = status.includes('AUTHENTIC') || status.includes('TRUE') || status.includes('GÜVENİLİR') || status.includes('REAL');
    const isFake      = status.includes('FAKE') || status.includes('FALSE') || status.includes('YANILTICI');

    const isUrlAnalysis = !!result.truth_score;
    const badgeLabel    = isUrlAnalysis ? 'URL Analizi' : result.isDirectMatch ? 'Veritabanı Eşleşmesi' : 'Yapay Zeka Sınıflandırması';
    const scoreLabel    = isUrlAnalysis ? 'Doğruluk' : 'Güven';

    const displayScore = isUrlAnalysis
        ? parseFloat(result.truth_score).toFixed(0)
        : (() => { const r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })();

    const targetOffset = parseFloat((RING_CIRC * (1 - parseFloat(displayScore) / 100)).toFixed(2));
    const [ringOffset, setRingOffset] = useState(RING_CIRC);
    useEffect(() => {
        const id = setTimeout(() => setRingOffset(targetOffset), 100);
        return () => clearTimeout(id);
    }, [targetOffset]);

    const theme      = getTheme(isAuthentic, isFake);
    const signals    = result.signals || null;
    const origText   = result.originalText || null;
    const explanation = buildExplanation(signals);

    /* opacity helpers */
    const hex15 = `${theme.hex}26`;
    const hex30 = `${theme.hex}4d`;
    const hex08 = `${theme.hex}14`;

    return (
        <div
            className="animate-fade-up mt-6 md:mt-8 w-full rounded-2xl overflow-hidden flex flex-col"
            style={{
                background: 'var(--color-bg-surface)',
                border: `1px solid ${hex30}`,
                borderTop: `3px solid ${theme.hex}`,
                boxShadow: `0 4px 32px rgba(${theme.glowRgb},0.10), 0 1px 4px rgba(0,0,0,0.08)`,
            }}
        >
            {/* ── Dekoratif arka plan ── */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none -z-0"
                 style={{ background: hex08 }} />

            {/* ── Header ── */}
            <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                 style={{ borderBottom: `1px solid ${hex15}` }}>

                {/* Sol: ikon + başlık */}
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: hex15 }}>
                        <theme.Icon className={`w-6 h-6 ${theme.statusCls}`} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <span className={`${theme.statusCls} font-manrope font-bold text-[10px] tracking-widest uppercase block mb-0.5`}>
                            {theme.label}
                        </span>
                        <h2 className="text-tx-primary font-manrope font-extrabold text-lg sm:text-xl tracking-tight leading-tight">
                            {theme.mainTitle}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">
                            {isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />}
                            {badgeLabel}
                        </span>
                    </div>
                </div>

                {/* Sağ: SVG skor halkası */}
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
            </div>

            {/* ── Gövde ── */}
            <div className="p-5 sm:p-7 space-y-5">

                {/* URL analizi: başlık */}
                {isUrlAnalysis && result.scraped_title && (
                    <div className="flex items-start gap-2 opacity-70">
                        <Link2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.statusCls}`} />
                        <p className={`text-xs font-medium truncate ${theme.statusCls}`}>
                            {result.scraped_title}
                        </p>
                    </div>
                )}

                {/* Yapay Zeka Görüşü */}
                <div className="rounded-xl p-4 sm:p-5"
                     style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className={`w-4 h-4 ${theme.statusCls}`} />
                        <span className={`${theme.statusCls} font-manrope font-bold text-xs tracking-wide`}>
                            Yapay Zeka Görüşü
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

                {/* Sinyal Paneli */}
                {signals && <SignalPanel signals={signals} theme={theme} />}

                {/* Vurgulu Metin */}
                {!isUrlAnalysis && origText && signals?.triggered_words && (
                    <HighlightedText text={origText} triggeredWords={signals.triggered_words} />
                )}
            </div>

            {/* ── Footer: Geri Bildirim ── */}
            <div className="px-5 sm:px-7 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
                 style={{ borderTop: `1px solid ${hex15}`, background: 'var(--color-bg-surface-solid)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ background: hex15 }}>
                        <MessageSquare className={`w-4 h-4 ${theme.statusCls}`} />
                    </div>
                    <p className="text-tx-secondary text-sm font-medium">Bu sonuç doğru mu?</p>
                </div>
                <div className="flex gap-2.5 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5
                                       px-5 py-2 rounded-xl border border-brutal-border/40
                                       text-tx-secondary font-manrope font-bold text-[11px] uppercase tracking-wider
                                       hover:bg-surface-solid hover:text-tx-primary transition-colors active:scale-95">
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Hayır
                    </button>
                    <button
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5
                                    px-6 py-2 rounded-xl ${theme.bgCls} ${theme.onBgCls}
                                    font-manrope font-bold text-[11px] uppercase tracking-wider
                                    hover:opacity-85 transition-opacity active:scale-95`}
                        style={{ boxShadow: `0 4px 16px rgba(${theme.glowRgb},0.25)` }}
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Evet
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultCard;
