import React from 'react';
import { Info } from 'lucide-react';

const AnalysisDisclaimer = () => {
    return (
        <div className="
            animate-in fade-in slide-in-from-bottom-4 duration-700
            mt-8 p-4 rounded-2xl
            /* Light Mode: Soft Blue Tint & Deep Navy Text */
            bg-blue-50/50 border border-blue-200/60
            /* Dark Mode: Deep Navy Background & Muted Blue Text */
            dark:bg-blue-950/20 dark:border-blue-900/40
            flex items-start md:items-center gap-4 
            shadow-sm backdrop-blur-sm
            transition-all duration-300
        ">
            {/* Icon Container - Daha rafine bir görünüm için */}
            <div className="flex-shrink-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
                    <Info size={22} strokeWidth={2.5} />
                </div>
            </div>

            {/* Metin Alanı */}
            <p className="text-sm md:text-[15px] leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                <span className="text-blue-900 dark:text-blue-100 font-semibold">
                    Önemli Not:
                </span>
                {" "}Analiz sonuçları dilbilimsel verilere dayalı bir tahmindir;
                <span className="font-bold text-blue-800 dark:text-blue-300 decoration-blue-500/30 underline-offset-2 mx-1">
                    kesinlik ifade etmez.
                </span>
                Lütfen bilgileri resmi kaynaklardan teyit etmeyi unutmayınız.
            </p>
        </div>
    );
};

export default AnalysisDisclaimer;