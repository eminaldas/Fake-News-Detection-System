import React from 'react';
import { CheckCircle2, XCircle, ThumbsUp, ThumbsDown, Info, HelpCircle, Link2 } from 'lucide-react';

const AnalysisResultCard = ({ result }) => {
    if (!result) return null;

    // 1. Esnek Durum Belirleme (API'den ne gelirse gelsin yakalar)
    const status = result.prediction?.toUpperCase() || 'UNKNOWN';
    const isFake = status.includes('FAKE') || status.includes('FALSE') || status.includes('YANILTICI');
    const isAuthentic = status.includes('AUTHENTIC') || status.includes('TRUE') || status.includes('GÜVENİLİR') || status.includes('REAL');

    // URL analizi mi, doğrudan eşleşme mi, yoksa metin AI mi?
    const isUrlAnalysis = !!result.truth_score;
    const badgeLabel = isUrlAnalysis ? 'URL Analizi' : result.isDirectMatch ? 'Veritabanı Eşleşmesi' : 'Yapay Zeka Sınıflandırması';
    const badgeIcon = isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />;
    const scoreLabel = isUrlAnalysis ? 'Doğruluk Skoru' : 'Analiz Skoru';

    // 2. Güven Skoru Hesaplama (0.96 veya 96 gelme ihtimaline karşı güvenli matematik)
    const displayScore = isUrlAnalysis
        ? parseFloat(result.truth_score).toFixed(0)
        : (() => { let r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })();
    const confidence = displayScore;

    // 3. Üç Aşamalı Tema Yönetimi — token tabanlı
    let theme;

    if (isAuthentic) {
        theme = {
            bg: 'bg-authentic-bg',
            border: 'border-authentic-border',
            title: 'text-authentic-text',
            progressBg: 'bg-authentic-track',
            progressFill: 'bg-authentic-fill',
            icon: <CheckCircle2 className="w-16 h-16" strokeWidth={1.5} />,
            mainTitle: 'Güvenilir İçerik Tespit Edildi'
        };
    } else if (isFake) {
        theme = {
            bg: 'bg-fake-bg',
            border: 'border-fake-border',
            title: 'text-fake-text',
            progressBg: 'bg-fake-track',
            progressFill: 'bg-fake-fill',
            icon: <XCircle className="w-16 h-16" strokeWidth={1.5} />,
            mainTitle: 'Yüksek Yanıltma Riski Mevcut'
        };
    } else {
        theme = {
            bg: 'bg-neutral-bg',
            border: 'border-neutral-border',
            title: 'text-neutral-text',
            progressBg: 'bg-neutral-track',
            progressFill: 'bg-neutral-fill',
            icon: <HelpCircle className="w-16 h-16" strokeWidth={1.5} />,
            mainTitle: 'Analiz Sonucu Belirsiz'
        };
    }

    return (
        <div className={`animate-fade-up mt-8 p-6 md:p-8 rounded-2xl border-2 shadow-lg relative ${theme.bg} ${theme.border}`}>

            {/* Analiz Yöntemi Badge */}
            <div className={`absolute -top-3 left-8 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm ${theme.progressFill}`}>
                {badgeIcon}
                {badgeLabel}
            </div>

            {/* Header: Başlık ve Büyük İkon */}
            <div className="flex justify-between items-start mb-6 pt-2">
                <div className="flex flex-col gap-1">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 ${theme.title}`}>Sistem Kararı</p>
                    <h3 className={`text-2xl md:text-4xl font-black tracking-tighter ${theme.title}`}>
                        {theme.mainTitle}
                    </h3>
                </div>
                <div className={theme.title}>
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

            {/* Progress Bar Bölümü */}
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex justify-between items-end">
                    <span className={`text-xs font-bold ${theme.title}`}>{scoreLabel}</span>
                    <span className={`text-lg font-black ${theme.title}`}>%{confidence}</span>
                </div>
                <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 ${theme.progressBg}`}>
                    <div
                        className={`h-full rounded-full transition-all duration-[1500ms] ease-out shadow-sm ${theme.progressFill}`}
                        style={{ width: `${confidence}%` }}
                    />
                </div>
            </div>

            {/* Açıklama Metni */}
            <div className="relative">
                <span className={`absolute -left-4 -top-2 text-4xl font-serif opacity-20 ${theme.title}`}>"</span>
                <p className="text-tx-primary dark:text-tx-secondary font-medium leading-relaxed text-sm md:text-lg italic px-2">
                    {result.message || (isAuthentic
                        ? "Analiz edilen metin, tarafsız bir dil yapısına ve doğrulanabilir veri setlerine yüksek uyum göstermektedir."
                        : isFake
                            ? "İncelediğiniz metin, tipik yanıltıcı haber karakteristikleri taşımaktadır."
                            : "Sistem bu metin hakkında kesin bir yargıya varamadı. Lütfen farklı kaynaklardan teyit ediniz.")}
                </p>
            </div>

            {/* Footer: Geri Bildirim Butonları */}
            <div className="mt-10 flex items-center justify-end gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                <span className={`text-xs font-bold italic uppercase tracking-wider ${theme.title} opacity-60`}>
                    bu sonuç doğru mu?
                </span>
                <div className="flex gap-2">
                    <button className={`group p-2.5 rounded-full transition-transform hover:scale-110 text-white shadow-md ${theme.progressFill}`}>
                        <ThumbsUp size={16} />
                    </button>
                    <button className={`group p-2.5 rounded-full transition-transform hover:scale-110 text-white shadow-md ${theme.progressFill}`}>
                        <ThumbsDown size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AnalysisResultCard;
