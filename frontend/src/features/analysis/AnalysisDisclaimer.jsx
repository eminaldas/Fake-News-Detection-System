import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AnalysisDisclaimer = () => {
    return (
        <div
            className="animate-fade-up relative mt-6 md:mt-8 p-4 overflow-hidden transition-all duration-300"
            style={{
                background: 'var(--color-info-bg)',
                border:     '1px solid var(--color-info-border)',
            }}
        >
            {/* Mavi köşe notch'ları — 4 köşe */}
            <div className="absolute top-0 left-0 w-3 h-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute top-0 left-0 h-3 w-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute top-0 right-0 w-3 h-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute top-0 right-0 h-3 w-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute bottom-0 left-0 w-3 h-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute bottom-0 left-0 h-3 w-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute bottom-0 right-0 w-3 h-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />
            <div className="absolute bottom-0 right-0 h-3 w-[2px] pointer-events-none" style={{ background: 'var(--color-accent-blue)' }} />

            <div className="flex items-start gap-3">
                {/* İkon kutusu */}
                <div
                    className="shrink-0 w-8 h-8 flex items-center justify-center"
                    style={{ background: 'var(--color-info-icon-bg)' }}
                >
                    <AlertTriangle size={15} style={{ color: 'var(--color-info-icon)' }} strokeWidth={2.5} />
                </div>

                {/* Metin */}
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-1"
                       style={{ color: 'var(--color-info-icon)' }}>
                        // DİKKAT
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-info-text)' }}>
                        <span className="font-bold" style={{ color: 'var(--color-info-title)' }}>
                            Önemli Not:
                        </span>
                        {' '}Analiz sonuçları dilbilimsel verilere dayalı bir tahmindir;{' '}
                        <span className="font-bold" style={{ color: 'var(--color-info-accent)' }}>
                            kesinlik ifade etmez.
                        </span>
                        {' '}Lütfen bilgileri resmi kaynaklardan teyit etmeyi unutmayınız.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AnalysisDisclaimer;
