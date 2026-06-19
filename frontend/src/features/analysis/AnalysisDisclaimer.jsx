import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AnalysisDisclaimer = () => {
    return (
        <div
            className="animate-fade-up relative mt-6 md:mt-8 p-4 overflow-hidden"
            style={{
                background: 'var(--color-info-bg)',
                border:     '1px solid var(--color-info-border)',
            }}
        >
            {/* Köşe notch'ları */}
            {[
                'top-0 left-0 w-3 h-[2px]', 'top-0 left-0 h-3 w-[2px]',
                'top-0 right-0 w-3 h-[2px]', 'top-0 right-0 h-3 w-[2px]',
                'bottom-0 left-0 w-3 h-[2px]', 'bottom-0 left-0 h-3 w-[2px]',
                'bottom-0 right-0 w-3 h-[2px]', 'bottom-0 right-0 h-3 w-[2px]',
            ].map((cls, i) => (
                <div key={i} className={`absolute ${cls} pointer-events-none`}
                     style={{ background: 'var(--color-accent-blue)' }} />
            ))}

            <div className="flex items-start gap-3">
                {/* İkon */}
                <div
                    className="shrink-0 w-8 h-8 flex items-center justify-center"
                    style={{ background: 'var(--color-info-icon-bg)' }}
                >
                    <AlertTriangle size={15} style={{ color: 'var(--color-info-icon)' }} strokeWidth={2.5} />
                </div>

                {/* Metin */}
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-1.5"
                       style={{ color: 'var(--color-info-icon)' }}>
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-info-text)' }}>
                        <span className="font-semibold" style={{ color: 'var(--color-info-title)' }}>
                            Önemli Not:
                        </span>
                        {' '}Analiz sonuçları dilbilimsel verilere dayalı bir{' '}
                        <span className="font-semibold" style={{ color: 'var(--color-info-accent)' }}>
                            tahmindir
                        </span>
                        {' '}— kesinlik ifade etmez. Bilgileri resmi kaynaklardan teyit etmeyi unutmayınız.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AnalysisDisclaimer;
