import React from 'react';

const SEGS = 10;

function SegBar({ weight, color }) {
    const filled = Math.round(Math.max(0, Math.min(1, weight)) * SEGS);
    return (
        <span className="font-mono tracking-tight" style={{ color, letterSpacing: '1px' }}>
            {Array.from({ length: SEGS }).map((_, i) => (i < filled ? '▓' : '░')).join('')}
        </span>
    );
}

export default function DecisiveFactors({ factors }) {
    if (!factors?.length) return null;

    return (
        <div className="flex flex-col">
            {factors.map((f, i) => {
                const supportsTrue = f.direction === 'supports_true';
                const color = supportsTrue ? '#3fff8b' : '#ff7351';
                const arrow = supportsTrue ? '▲' : '▼';
                const dirLabel = supportsTrue ? 'lehte' : 'aleyhte';
                const weight = typeof f.weight === 'number' ? f.weight : 0;
                return (
                    <div key={i} className="flex items-start gap-3 py-2.5"
                         style={{ borderBottom: i < factors.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                        <span className="font-mono text-sm font-black shrink-0 mt-0.5" style={{ color }}>{arrow}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>{f.factor}</p>
                            {f.explanation && (
                                <p className="font-mono text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                    {f.explanation}
                                </p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <SegBar weight={weight} color={color} />
                            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                {dirLabel} · {weight.toFixed(2).replace(/^0/, '')}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
