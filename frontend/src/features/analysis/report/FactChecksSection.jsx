import React from 'react';

const TONE_CONFIG = {
    confirmed: { border: '#3fff8b', bg: '#3fff8b08', label: 'Doğrulandı' },
    refuted:   { border: '#ff7351', bg: '#ff735108', label: 'Çürütüldü'  },
    mixed:     { border: '#f59e0b', bg: '#f59e0b08', label: 'Kısmen Doğru' },
    uncertain: { border: '#71717a', bg: '#71717a08', label: 'Doğrulanamadı' },
};

function FactCheckCard({ fc }) {
    const cfg = TONE_CONFIG[fc.tone] || TONE_CONFIG.uncertain;
    return (
        <div
            className="rounded-2xl p-5 flex flex-col gap-3 border border-l-4"
            style={{
                borderLeftColor: cfg.border,
                borderTopColor: 'rgba(255,255,255,0.06)',
                borderRightColor: 'rgba(255,255,255,0.06)',
                borderBottomColor: 'rgba(255,255,255,0.06)',
                background: cfg.bg,
            }}
        >
            <p className="text-tx-primary text-sm font-semibold leading-snug">
                "{fc.claim}"
            </p>
            <p className="text-tx-secondary text-xs leading-relaxed flex-1">
                {fc.finding}
            </p>
            <span
                className="self-start text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: cfg.border, background: `${cfg.border}22` }}
            >
                {cfg.label}
            </span>
        </div>
    );
}

export default function FactChecksSection({ factChecks }) {
    if (!factChecks?.length) return null;

    const pairs  = factChecks.filter((_, i) => i % 2 === 0).map((_, i) => [factChecks[i * 2], factChecks[i * 2 + 1]]);
    const isOdd  = factChecks.length % 2 !== 0;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-manrope font-bold text-base text-tx-primary flex items-center gap-2">
                Doğrulama Bulguları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {factChecks.map((fc, i) => {
                    const isLast = i === factChecks.length - 1 && isOdd;
                    return (
                        <div key={i} className={isLast ? 'md:col-span-2' : ''}>
                            <FactCheckCard fc={fc} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
