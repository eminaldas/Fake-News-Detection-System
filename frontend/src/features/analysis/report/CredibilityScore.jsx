import React from 'react';

const SUB_META = [
    { key: 'evidence_strength',     label: 'Kanıt gücü' },
    { key: 'source_reliability',    label: 'Kaynak güvenilirliği' },
    { key: 'language_manipulation', label: 'Dil / manipülasyon' },
    { key: 'consistency_temporal',  label: 'Tutarlılık / zaman' },
];

function scoreColor(s) {
    return s >= 60 ? '#3fff8b' : s >= 35 ? '#f59e0b' : '#ff7351';
}

const S = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function CredibilityScore({ credibilityScore }) {
    const overall = credibilityScore?.overall;
    const subs    = credibilityScore?.sub_scores || {};
    if (overall == null) return null;

    const oColor = scoreColor(overall);
    const SEGS   = 16;
    const filled = Math.round((overall / 100) * SEGS);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Genel skor */}
            <div className="relative border p-5" style={S}>
                <p className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    // GÜVENİLİRLİK_SKORU
                </p>
                <div className="flex items-end gap-3 mb-3">
                    <span className="font-mono text-5xl font-black leading-none" style={{ color: oColor }}>{overall}</span>
                    <span className="font-mono text-sm mb-1" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>/ 100</span>
                </div>
                <div className="flex gap-[3px]">
                    {Array.from({ length: SEGS }).map((_, i) => (
                        <div key={i} className="h-2 flex-1"
                             style={{ background: i < filled ? oColor : 'var(--color-terminal-border-raw)',
                                      opacity: i < filled ? (0.35 + (i / SEGS) * 0.65) : 1 }} />
                    ))}
                </div>
            </div>

            {/* Alt skorlar */}
            <div className="relative border p-5 md:col-span-2 flex flex-col justify-center gap-3" style={S}>
                <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    // ALT_BOYUTLAR
                </p>
                {SUB_META.map(({ key, label }) => {
                    const node = subs[key] || {};
                    const sc   = typeof node.score === 'number' ? node.score : 0;
                    const c    = scoreColor(sc);
                    return (
                        <div key={key}>
                            <div className="flex items-center justify-between font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                                <span>{label}</span>
                                <span style={{ color: c }}>{sc}</span>
                            </div>
                            <div className="h-1.5 mt-1" style={{ background: 'var(--color-terminal-border-raw)' }}>
                                <div className="h-full" style={{ width: `${sc}%`, background: c }} />
                            </div>
                            {node.rationale && (
                                <p className="font-mono text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)', opacity: 0.65 }}>
                                    {node.rationale}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
