import React, { useEffect, useState } from 'react';
import { Link2, Info } from 'lucide-react';
import SignalPanel from './SignalPanel';
import HighlightedText from './HighlightedText';
import { DISPLAY_THRESHOLD } from './signalConfig';

// Ağırlık sırası: clickbait 0.30 > exclamation 0.20 > uppercase 0.15 >
//                 hedge 0.15 > question 0.10 > avg_word 0.10 > number 0.05
const SIGNAL_WEIGHT_ORDER = [
    'clickbait_score', 'exclamation_ratio', 'uppercase_ratio',
    'hedge_ratio', 'question_density', 'avg_word_length', 'number_density',
];

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

// SVG halka çevresi: 2π × r(42) ≈ 264
const RING_CIRC = 264;

const AnalysisResultCard = ({ result }) => {
    if (!result) return null;

    const status     = result.prediction?.toUpperCase() || 'UNKNOWN';
    const isFake     = status.includes('FAKE') || status.includes('FALSE') || status.includes('YANILTICI');
    const isAuthentic = status.includes('AUTHENTIC') || status.includes('TRUE') || status.includes('GÜVENİLİR') || status.includes('REAL');

    const isUrlAnalysis = !!result.truth_score;
    const badgeLabel    = isUrlAnalysis ? 'URL Analizi' : result.isDirectMatch ? 'Veritabanı Eşleşmesi' : 'Yapay Zeka Sınıflandırması';
    const scoreLabel    = isUrlAnalysis ? 'Doğruluk Skoru' : 'Analiz Skoru';

    const displayScore = isUrlAnalysis
        ? parseFloat(result.truth_score).toFixed(0)
        : (() => { const r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })();

    const targetOffset = parseFloat((RING_CIRC * (1 - parseFloat(displayScore) / 100)).toFixed(2));

    // Halka animasyonu: 264 → gerçek değer
    const [ringOffset, setRingOffset] = useState(RING_CIRC);
    useEffect(() => {
        const id = setTimeout(() => setRingOffset(targetOffset), 80);
        return () => clearTimeout(id);
    }, [targetOffset]);

    // Tema — her durum için accent rengi ve sınıf isimleri
    let theme;
    if (isAuthentic) {
        theme = {
            hex:        '#3fff8b',
            glowClass:  'authentic-glow',
            accentText: 'text-es-primary',
            accentBg:   'bg-es-primary',
            onAccent:   'text-[#005d2c]',
            icon:       'verified',
            label:      'ANALİZ TAMAMLANDI',
            mainTitle:  'Güvenilir İçerik Tespit Edildi',
        };
    } else if (isFake) {
        theme = {
            hex:        '#ff7351',
            glowClass:  'fake-glow',
            accentText: 'text-es-error',
            accentBg:   'bg-es-error',
            onAccent:   'text-[#450900]',
            icon:       'gpp_bad',
            label:      'RİSK TESPİT EDİLDİ',
            mainTitle:  'Yüksek Yanıltma Riski Mevcut',
        };
    } else {
        theme = {
            hex:        '#71717a',
            glowClass:  '',
            accentText: 'text-muted',
            accentBg:   'bg-neutral-fill',
            onAccent:   'text-white',
            icon:       'help',
            label:      'ANALİZ SONUCU',
            mainTitle:  'Analiz Sonucu Belirsiz',
        };
    }

    // inline renk yardımcıları (opacity modifier dinamik → inline style)
    const hex20 = `${theme.hex}33`; // %20 opacity
    const hex40 = `${theme.hex}66`; // %40 opacity
    const hex0d = `${theme.hex}1a`; // %10 opacity (blob)
    const hex08 = `${theme.hex}0d`; // %5  opacity (blob)

    const signals      = result.signals || null;
    const originalText = result.originalText || null;
    const explanation  = buildExplanation(signals);

    return (
        <div className={`animate-fade-up mt-6 md:mt-8 w-full result-card ${theme.glowClass} rounded-3xl overflow-hidden flex flex-col relative border border-brutal-border/10`}>

            {/* Dekoratif arka plan ışıkları */}
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] pointer-events-none" style={{ background: hex0d }} />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[100px] pointer-events-none" style={{ background: hex08 }} />

            {/* ── Header ── */}
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-brutal-border/10">

                {/* Sol: ikon + başlık */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: hex20 }}>
                        <span
                            className={`material-symbols-outlined ${theme.accentText} text-3xl`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            {theme.icon}
                        </span>
                    </div>
                    <div>
                        <span className={`${theme.accentText} font-manrope font-bold text-[10px] tracking-widest uppercase block mb-1`}>
                            {theme.label}
                        </span>
                        <h2 className="text-tx-primary font-manrope font-extrabold text-xl sm:text-2xl tracking-tight leading-tight">
                            {theme.mainTitle}
                        </h2>
                        <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-widest ${theme.accentText} opacity-60`}>
                            {isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />}
                            {badgeLabel}
                        </span>
                    </div>
                </div>

                {/* Sağ: animasyonlu SVG skor halkası */}
                <div className="relative flex items-center justify-center shrink-0 self-center sm:self-auto">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                        {/* Arka plan halkası */}
                        <circle
                            cx="48" cy="48" r="42"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-surface-solid"
                        />
                        {/* Dolu halka */}
                        <circle
                            cx="48" cy="48" r="42"
                            fill="transparent"
                            stroke={theme.hex}
                            strokeWidth="6"
                            strokeDasharray={RING_CIRC}
                            strokeDashoffset={ringOffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-tx-primary font-manrope font-black text-2xl leading-none">%{displayScore}</span>
                        <span className="text-tx-secondary text-[10px] tracking-tighter uppercase mt-0.5">{scoreLabel}</span>
                    </div>
                </div>
            </div>

            {/* ── İçerik Gövdesi ── */}
            <div className="p-6 sm:p-8 space-y-6">

                {/* URL analizi: scrape edilen başlık */}
                {isUrlAnalysis && result.scraped_title && (
                    <div className="flex items-start gap-2 opacity-70">
                        <Link2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.accentText}`} />
                        <p className={`text-xs font-medium truncate ${theme.accentText}`}>{result.scraped_title}</p>
                    </div>
                )}

                {/* Yapay Zeka Görüşü kutusu */}
                <div
                    className="bg-base rounded-2xl p-5 border-l-4"
                    style={{ borderLeftColor: hex40 }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`material-symbols-outlined ${theme.accentText} text-xl`}>psychology</span>
                        <span className={`${theme.accentText} font-manrope font-bold text-sm`}>Yapay Zeka Görüşü</span>
                    </div>
                    <p className="text-tx-secondary leading-relaxed text-sm italic">
                        "{explanation || (isAuthentic
                            ? 'Analiz edilen metin, tarafsız bir dil yapısına ve doğrulanabilir veri setlerine yüksek uyum göstermektedir.'
                            : isFake
                                ? 'İncelediğiniz metin, tipik yanıltıcı haber karakteristikleri taşımaktadır.'
                                : 'Sistem bu metin hakkında kesin bir yargıya varamadı. Lütfen farklı kaynaklardan teyit ediniz.')}"
                    </p>
                </div>

                {/* Sinyal Paneli — bento grid */}
                {signals && <SignalPanel signals={signals} theme={theme} />}

                {/* Vurgulu Metin — URL analizinde gösterilmez */}
                {!isUrlAnalysis && originalText && signals?.triggered_words && (
                    <HighlightedText
                        text={originalText}
                        triggeredWords={signals.triggered_words}
                    />
                )}
            </div>

            {/* ── Footer: Geri Bildirim ── */}
            <div className="bg-surface px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brutal-border/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-solid flex items-center justify-center border border-brutal-border/20">
                        <span className={`material-symbols-outlined ${theme.accentText} text-xl`}>chat_bubble</span>
                    </div>
                    <p className="text-tx-secondary font-medium text-sm">Bu sonuç doğru mu?</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-brutal-border/30 text-tx-primary font-manrope font-bold text-sm hover:bg-surface-solid transition-colors active:scale-95 duration-150 uppercase tracking-wider">
                        HAYIR
                    </button>
                    <button className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl ${theme.accentBg} ${theme.onAccent} font-manrope font-bold text-sm shadow-lg hover:opacity-90 transition-opacity active:scale-95 duration-150 uppercase tracking-wider`}>
                        EVET
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AnalysisResultCard;
