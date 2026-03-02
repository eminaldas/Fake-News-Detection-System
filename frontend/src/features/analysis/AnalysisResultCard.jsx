import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const AnalysisResultCard = ({ result }) => {
    if (!result) return null;

    const status = result.prediction || 'UNKNOWN';
    const isFake = status === 'FAKE';
    const isAuthentic = status === 'AUTHENTIC';

    let titleColorClass = 'text-app-charcoal';
    let themeAccentBorder = 'border-app-charcoal';
    let themeAccentBg = 'bg-app-charcoal';
    let mainTitle = 'SONUÇ BELİRSİZ (VERİ EKSİK)';

    if (isFake) {
        titleColorClass = 'text-app-burgundy';
        themeAccentBorder = 'border-app-burgundy';
        themeAccentBg = 'bg-app-burgundy';
        mainTitle = 'İDDİA YANLIŞ / ASILSIZ';
    } else if (isAuthentic) {
        titleColorClass = 'text-app-plum';
        themeAccentBorder = 'border-app-plum';
        themeAccentBg = 'bg-app-plum';
        mainTitle = 'İDDİA DOĞRU / DOĞRULANMIŞ';
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-app-charcoal mb-4 flex items-center gap-2">
                Ayrıntılı Analiz Raporu
                <span className="text-sm font-normal px-2 py-1 bg-app-gray rounded-md opacity-70">
                    {result.isDirectMatch ? 'Veritabanı (Vektör) Eşleşmesi' : 'Yapay Zeka Sınıflandırması'}
                </span>
            </h2>

            <div className={`rounded-2xl border-2 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start transition-colors bg-app-surface ${themeAccentBorder} border-opacity-30`}>

                {/* Status Icon */}
                <div className={`p-4 rounded-full shrink-0 text-white ${themeAccentBg}`}>
                    {isFake ? <ShieldAlert className="w-12 h-12" /> : <ShieldCheck className="w-12 h-12" />}
                </div>

                {/* Content Breakdown */}
                <div className="flex-grow text-center md:text-left w-full">
                    <div className="mb-2">
                        <p className="text-sm font-bold tracking-wider uppercase opacity-60 text-app-charcoal">Sistem Kararı</p>
                        <h3 className={`text-2xl md:text-3xl font-black mt-1 ${titleColorClass}`}>
                            {mainTitle}
                        </h3>
                    </div>

                    {result.isDirectMatch ? (
                        <div className="mt-6 text-app-charcoal bg-app-bg p-5 rounded-xl border border-app-gray shadow-sm text-left">
                            <h4 className="font-bold text-lg mb-2">{result.message}</h4>
                            <div className="space-y-2 mt-4 text-sm md:text-base">
                                <div className="flex">
                                    <span className="font-bold w-32 shrink-0">Orijinal Durum:</span>
                                    <span className="font-medium opacity-90">{result.directMatchData?.original_status || 'Belirtilmemiş'}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-bold w-32 shrink-0">Dayanak / Kanıt:</span>
                                    <span className="font-medium opacity-90">{result.directMatchData?.evidence || 'Bilinmiyor'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-app-bg p-3 rounded-lg border border-app-gray text-center shadow-sm">
                                <p className="text-xs font-bold text-app-charcoal opacity-50 uppercase mb-1">Confidence</p>
                                <p className="text-xl font-bold text-app-charcoal">{(parseFloat(result.confidence || 0) * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-app-bg p-3 rounded-lg border border-app-gray text-center shadow-sm">
                                <p className="text-xs font-bold text-app-charcoal opacity-50 uppercase mb-1">Text Length</p>
                                <p className="text-xl font-bold text-app-charcoal">{result.processed_text_length || 0}</p>
                            </div>
                            <div className="bg-app-bg p-3 rounded-lg border border-app-gray text-center shadow-sm">
                                <p className="text-xs font-bold text-app-charcoal opacity-50 uppercase mb-1">Exclamations</p>
                                <p className="text-xl font-bold text-app-charcoal">
                                    {((result.signals?.exclamation_ratio || 0) * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="bg-app-bg p-3 rounded-lg border border-app-gray text-center shadow-sm">
                                <p className="text-xs font-bold text-app-charcoal opacity-50 uppercase mb-1">Uppercase</p>
                                <p className="text-xl font-bold text-app-charcoal">
                                    {((result.signals?.uppercase_ratio || 0) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultCard;
