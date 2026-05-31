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
            {fc.sources?.length > 0 && (
                <div className="flex flex-col gap-1 pt-2 mt-1" style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted-accent)' }}>Kaynaklar</span>
                    {fc.sources.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {s.url ? (
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: 'var(--color-brand-primary)' }}>
                                    {s.name || s.domain || 'kaynak'}
                                </a>
                            ) : (
                                <span className="font-semibold">{s.name || s.domain || 'kaynak'}</span>
                            )}
                            {s.domain && <span style={{ color: 'var(--color-text-muted-accent)' }}>{s.domain}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FactChecksSection({ factChecks }) {
    if (!factChecks?.length) return null;

    const isOdd  = factChecks.length % 2 !== 0;

    return (
        <div className="flex flex-col gap-4">
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
