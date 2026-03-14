import React from 'react';
import { CheckCircle2, XCircle, ThumbsUp, ThumbsDown, Info, HelpCircle } from 'lucide-react';

const AnalysisResultCard = ({ result }) => {
    if (!result) return null;

    // 1. Esnek Durum Belirleme (API'den ne gelirse gelsin yakalar)
    const status = result.prediction?.toUpperCase() || 'UNKNOWN';
    const isFake = status.includes('FAKE') || status.includes('FALSE') || status.includes('YANILTICI');
    const isAuthentic = status.includes('AUTHENTIC') || status.includes('TRUE') || status.includes('GÜVENİLİR') || status.includes('REAL');

    // 2. Güven Skoru Hesaplama (0.96 veya 96 gelme ihtimaline karşı güvenli matematik)
    let rawConfidence = parseFloat(result.confidence || 0);
    const confidence = rawConfidence <= 1 ? (rawConfidence * 100).toFixed(0) : rawConfidence.toFixed(0);

    // 3. Üç Aşamalı Tema Yönetimi (Authentic, Fake, Neutral)
    let theme;

    if (isAuthentic) {
        theme = {
            bg: 'bg-[#dce4d5] dark:bg-[#141a14]',
            border: 'border-[#5a6058] dark:border-[#1f3320]/80',
            title: 'text-[#5a6058] dark:text-[#6ee7b7]',
            progressBg: 'bg-[#b8c5b0] dark:bg-[#1c2b1c]',
            progressFill: 'bg-[#5a6058] dark:bg-[#10b981]',
            icon: <CheckCircle2 className="w-16 h-16" strokeWidth={1.5} />,
            mainTitle: 'Güvenilir İçerik Tespit Edildi'
        };
    } else if (isFake) {
        theme = {
            bg: 'bg-[#e9ddd0] dark:bg-[#1a1210]',
            border: 'border-[#bc6c25] dark:border-[#7c3910]/80',
            title: 'text-[#bc6c25] dark:text-[#fb923c]',
            progressBg: 'bg-[#d8c4b0] dark:bg-[#2a1a10]',
            progressFill: 'bg-[#bc6c25] dark:bg-[#f59e0b]',
            icon: <XCircle className="w-16 h-16" strokeWidth={1.5} />,
            mainTitle: 'Yüksek Yanıltma Riski Mevcut'
        };
    } else {
        // Yapay Zeka Kararsız Kalırsa (Neutral State)
        theme = {
            bg: 'bg-gray-100 dark:bg-[#18181c]',
            border: 'border-gray-400 dark:border-[#303036]',
            title: 'text-gray-600 dark:text-[#8e8e99]',
            progressBg: 'bg-gray-200 dark:bg-[#26262b]',
            progressFill: 'bg-gray-500 dark:bg-[#52525b]',
            icon: <HelpCircle className="w-16 h-16" strokeWidth={1.5} />,
            mainTitle: 'Analiz Sonucu Belirsiz'
        };
    }

    return (
        <div className={`animate-fade-up mt-8 p-6 md:p-8 rounded-2xl border-2 shadow-lg relative ${theme.bg} ${theme.border}`}>
            
            {/* Analiz Yöntemi Badge */}
            <div className={`absolute -top-3 left-8 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm ${theme.progressFill}`}>
                <Info size={10} />
                {result.isDirectMatch ? 'Veritabanı Eşleşmesi' : 'Yapay Zeka Sınıflandırması'}
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

            {/* Progress Bar Bölümü */}
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex justify-between items-end">
                    <span className={`text-xs font-bold ${theme.title}`}>Analiz Skoru</span>
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
                <span className={`absolute -left-4 -top-2 text-4xl font-serif opacity-20 ${theme.title}`}>“</span>
                <p className="text-[#2a2c28] dark:text-[#c8c8d0] font-medium leading-relaxed text-sm md:text-lg italic px-2">
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