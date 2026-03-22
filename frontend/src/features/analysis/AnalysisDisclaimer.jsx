import React from 'react';
import { Info } from 'lucide-react';

const AnalysisDisclaimer = () => {
    return (
        <div className="
            animate-in fade-in slide-in-from-bottom-4 duration-700
            mt-8 p-4 rounded-2xl
            bg-info-bg border border-info-border
            flex items-start md:items-center gap-4
            shadow-sm backdrop-blur-sm
            transition-all duration-300
        ">
            <div className="flex-shrink-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-info-icon-bg flex items-center justify-center text-info-icon">
                    <Info size={22} strokeWidth={2.5} />
                </div>
            </div>

            <p className="text-sm md:text-[15px] leading-relaxed font-medium text-info-text">
                <span className="text-info-title font-semibold">
                    Önemli Not:
                </span>
                {" "}Analiz sonuçları dilbilimsel verilere dayalı bir tahmindir;
                <span className="font-bold text-info-accent decoration-info-accent/30 underline-offset-2 mx-1">
                    kesinlik ifade etmez.
                </span>
                Lütfen bilgileri resmi kaynaklardan teyit etmeyi unutmayınız.
            </p>
        </div>
    );
};

export default AnalysisDisclaimer;
