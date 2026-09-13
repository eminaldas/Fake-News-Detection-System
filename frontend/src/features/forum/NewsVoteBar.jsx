import React from 'react';

const soft = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

const VOTE_OPTIONS = [
    { type: 'suspicious',  label: 'Şüpheli', v: '--color-fake-fill'     },
    { type: 'authentic',   label: 'Doğru',   v: '--color-brand-primary' },
    { type: 'investigate', label: 'İncele',  v: '--color-accent-amber'  },
];

export default function NewsVoteBar({ thread, onVote, disabled }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {VOTE_OPTIONS.map(opt => {
                const isActive = thread.current_user_vote === opt.type;
                const count =
                    opt.type === 'suspicious'  ? thread.vote_suspicious  :
                    opt.type === 'authentic'   ? thread.vote_authentic   :
                    thread.vote_investigate;
                return (
                    <button
                        key={opt.type}
                        disabled={disabled}
                        onClick={() => onVote(opt.type)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-[13.5px] font-bold transition-all duration-150 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                        style={{
                            color:      isActive ? `var(${opt.v})` : 'var(--color-text-secondary)',
                            background: isActive ? soft(opt.v, 14) : 'var(--color-bg-surface-solid)',
                        }}
                    >
                        {opt.label}
                        <span className="text-[12px] opacity-75">{count}</span>
                    </button>
                );
            })}
        </div>
    );
}
