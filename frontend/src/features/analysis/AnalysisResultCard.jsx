import React from 'react';
import { CheckCircle2, XCircle, ThumbsUp, ThumbsDown, Info, HelpCircle, Link2 } from 'lucide-react';
import SignalPanel from './SignalPanel';
import HighlightedText from './HighlightedText';
import { DISPLAY_THRESHOLD } from './signalConfig';

// Sinyallerden Türkçe açıklama üret
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

const AnalysisResultCard = ({ result }) => {
    if (!result) return null;

    const status = result.prediction?.toUpperCase() || 'UNKNOWN';
    const isFake = status.includes('FAKE') || status.includes('FALSE') || status.includes('YANILTICI');
    const isAuthentic = status.includes('AUTHENTIC') || status.includes('TRUE') || status.includes('GÜVENİLİR') || status.includes('REAL');

    const isUrlAnalysis = !!result.truth_score;
    const badgeLabel = isUrlAnalysis ? 'URL Analizi' : result.isDirectMatch ? 'Veritabanı Eşleşmesi' : 'Yapay Zeka Sınıflandırması';
    const badgeIcon = isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />;
    const scoreLabel = isUrlAnalysis ? 'Doğruluk Skoru' : 'Analiz Skoru';

    const displayScore = isUrlAnalysis
        ? parseFloat(result.truth_score).toFixed(0)
        : (() => { let r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })();
    const confidence = displayScore;

    let theme;

    if (isAuthentic) {
        theme = {
            bg: 'bg-authentic-bg',
            border: 'border-authentic-border',
            title: 'text-authentic-text',
            progressBg: 'bg-authentic-track',
            progressFill: 'bg-authentic-fill',
            icon: <CheckCircle2 className="w-10 h-10 md:w-16 md:h-16 shrink-0" strokeWidth={1.5} />,
            mainTitle: 'Güvenilir İçerik Tespit Edildi'
        };
    } else if (isFake) {
        theme = {
            bg: 'bg-fake-bg',
            border: 'border-fake-border',
            title: 'text-fake-text',
            progressBg: 'bg-fake-track',
            progressFill: 'bg-fake-fill',
            icon: <XCircle className="w-10 h-10 md:w-16 md:h-16 shrink-0" strokeWidth={1.5} />,
            mainTitle: 'Yüksek Yanıltma Riski Mevcut'
        };
    } else {
        theme = {
            bg: 'bg-neutral-bg',
            border: 'border-neutral-border',
            title: 'text-neutral-text',
            progressBg: 'bg-neutral-track',
            progressFill: 'bg-neutral-fill',
            icon: <HelpCircle className="w-10 h-10 md:w-16 md:h-16 shrink-0" strokeWidth={1.5} />,
            mainTitle: 'Analiz Sonucu Belirsiz'
        };
    }

    const signals      = result.signals || null;
    const originalText = result.originalText || null;
    const explanation  = buildExplanation(signals);

    return (
        <div className={`animate-fade-up mt-6 md:mt-8 p-4 md:p-6 lg:p-8 rounded-2xl border-2 shadow-lg relative ${theme.bg} ${theme.border}`}>

            {/* Analiz Yöntemi Badge */}
            <div className={`absolute -top-3 left-4 md:left-8 px-2.5 md:px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm max-w-[calc(100%-2rem)] truncate ${theme.progressFill}`}>
                {badgeIcon}
                {badgeLabel}
            </div>

            {/* Header: Başlık ve İkon */}
            <div className="flex justify-between items-start mb-5 md:mb-6 pt-2 gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 ${theme.title}`}>Sistem Kararı</p>
                    <h3 className={`text-xl sm:text-2xl md:text-4xl font-black tracking-tighter leading-tight ${theme.title}`}>
                        {theme.mainTitle}
                    </h3>
                </div>
                <div className={`${theme.title} shrink-0`}>
                    {theme.icon}
                </div>
            </div>

            {/* Scrape edilen başlık (URL analizi için) */}
            {isUrlAnalysis && result.scraped_title && (
                <div className="mb-4 flex items-start gap-2 opacity-70">
                    <Link2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.title}`} />
                    <p className={`text-xs font-medium truncate ${theme.title}`}>{result.scraped_title}</p>
                </div>
            )}

            {/* Progress Bar */}
            <div className="flex flex-col gap-2 mb-6 md:mb-8">
                <div className="flex justify-between items-end">
                    <span className={`text-xs font-bold ${theme.title}`}>{scoreLabel}</span>
                    <span className={`text-base md:text-lg font-black ${theme.title}`}>%{confidence}</span>
                </div>
                <div className={`w-full h-2.5 md:h-3 rounded-full overflow-hidden p-0.5 ${theme.progressBg}`}>
                    <div
                        className={`h-full rounded-full transition-all duration-[1500ms] ease-out shadow-sm ${theme.progressFill}`}
                        style={{ width: `${confidence}%` }}
                    />
                </div>
            </div>

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

            {/* Footer: Geri Bildirim */}
            <div className="mt-6 md:mt-10 flex items-center justify-end gap-3 md:gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                <span className={`text-xs font-bold italic uppercase tracking-wider ${theme.title} opacity-60 hidden sm:inline`}>
                    bu sonuç doğru mu?
                </span>
                <div className="flex gap-2">
                    <button className={`group p-2.5 rounded-full transition-transform hover:scale-110 text-white shadow-md min-w-[40px] min-h-[40px] flex items-center justify-center ${theme.progressFill}`}>
                        <ThumbsUp size={16} />
                    </button>
                    <button className={`group p-2.5 rounded-full transition-transform hover:scale-110 text-white shadow-md min-w-[40px] min-h-[40px] flex items-center justify-center ${theme.progressFill}`}>
                        <ThumbsDown size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AnalysisResultCard;
