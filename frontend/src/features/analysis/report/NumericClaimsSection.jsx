import React from 'react';

const TONE = {
    confirmed: { color: '#3fff8b', label: 'doğru' },
    refuted:   { color: '#ff7351', label: 'yanlış' },
    mixed:     { color: '#f59e0b', label: 'kısmen' },
    uncertain: { color: '#8b949e', label: 'belirsiz' },
};

export default function NumericClaimsSection({ claims }) {
    if (!claims?.length) return null;
    return (
        <div className="flex flex-col gap-2">
            {claims.map((c, i) => {
                const t = TONE[c.tone] || TONE.uncertain;
                return (
                    <div key={i} className="font-mono text-xs flex flex-col gap-1 py-2"
                         style={{ borderBottom: i < claims.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{c.claim}</span>
                        <div className="flex items-center gap-3 flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                            <span>belirtilen: <span style={{ color: 'var(--color-text-secondary)' }}>{c.stated_value ?? '—'}</span></span>
                            <span>doğrulanan: <span style={{ color: 'var(--color-text-secondary)' }}>{c.verified_value ?? '—'}</span></span>
                            <span className="px-1.5 py-0.5 rounded-sm" style={{ color: t.color, background: `${t.color}1a` }}>{t.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
