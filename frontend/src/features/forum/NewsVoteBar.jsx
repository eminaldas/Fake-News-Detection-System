import React from 'react';

const VOTE_OPTIONS = [
    { type: 'suspicious',  label: 'Şüpheli', prefix: '!', color: 'var(--color-fake-fill)',     border: 'rgba(239,68,68,0.40)',  bg: 'rgba(239,68,68,0.08)'  },
    { type: 'authentic',   label: 'Doğru',   prefix: '✓', color: 'var(--color-brand-primary)', border: 'rgba(16,185,129,0.40)', bg: 'rgba(16,185,129,0.08)' },
    { type: 'investigate', label: 'İncele',  prefix: '?', color: 'var(--color-accent-amber)',  border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.08)' },
];

export default function NewsVoteBar({ thread, onVote, disabled }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {VOTE_OPTIONS.map(v => {
                const isActive = thread.current_user_vote === v.type;
                const count =
                    v.type === 'suspicious'  ? thread.vote_suspicious  :
                    v.type === 'authentic'   ? thread.vote_authentic   :
                    thread.vote_investigate;
                return (
                    <button
                        key={v.type}
                        disabled={disabled}
                        onClick={() => onVote(v.type)}
                        className="flex items-center gap-2 px-3 py-2 border font-mono text-sm font-semibold transition-all disabled:opacity-40"
                        style={{
                            color:       v.color,
                            borderColor: isActive ? v.border : 'var(--color-terminal-border-raw)',
                            background:  isActive ? v.bg     : 'transparent',
                        }}
                    >
                        <span className="font-black text-base leading-none">{v.prefix}</span>
                        {v.label}
                        <span className="font-mono text-xs opacity-70">{count}</span>
                    </button>
                );
            })}
        </div>
    );
}
