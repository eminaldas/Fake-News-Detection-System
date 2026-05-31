import React from 'react';

const STAGES = [
    { n: 1, label: 'İddialar' },
    { n: 2, label: 'Kaynaklar' },
    { n: 3, label: 'Sentez' },
];

export default function StageStepper({ stage }) {
    return (
        <div className="flex items-center gap-2">
            {STAGES.map((st, i) => {
                const done = st.n < stage;
                const active = st.n === stage;
                const color = done ? '#3fff8b' : active ? '#f59e0b' : 'var(--color-terminal-border-raw)';
                return (
                    <React.Fragment key={st.n}>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm" style={{ color }}>{done ? '●' : active ? '◉' : '○'}</span>
                            <span className="text-[11px]" style={{ color: active ? 'var(--color-text-secondary)' : 'var(--color-text-muted-accent)' }}>{st.label}</span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <span className="flex-1 border-t" style={{ borderColor: st.n < stage ? '#3fff8b55' : 'var(--color-terminal-border-raw)' }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
