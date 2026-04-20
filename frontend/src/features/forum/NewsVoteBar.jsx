import React from 'react';

const VOTE_OPTIONS = [
    { type: 'suspicious',  label: 'Şüpheli', emoji: '🚩', color: 'var(--color-fake-fill)',     activeBg: 'rgba(239,68,68,0.12)',  activeBorder: 'rgba(239,68,68,0.40)' },
    { type: 'authentic',   label: 'Doğru',   emoji: '✅', color: 'var(--color-brand-primary)', activeBg: 'rgba(16,185,129,0.12)', activeBorder: 'rgba(16,185,129,0.40)' },
    { type: 'investigate', label: 'İncele',  emoji: '🔍', color: 'var(--color-accent-amber)',  activeBg: 'rgba(245,158,11,0.12)', activeBorder: 'rgba(245,158,11,0.40)' },
];

export default function NewsVoteBar({ thread, onVote, disabled }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {VOTE_OPTIONS.map(v => (
                <button
                    key={v.type}
                    disabled={disabled}
                    onClick={() => onVote(v.type)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold transition-all duration-150 disabled:opacity-50 hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                        background: thread.current_user_vote === v.type ? v.activeBg : 'rgba(255,255,255,0.03)',
                        border:     `1px solid ${thread.current_user_vote === v.type ? v.activeBorder : 'var(--color-border)'}`,
                        color:      v.color,
                    }}
                >
                    <span>{v.emoji}</span>
                    {v.label}
                    <span className="opacity-60">
                        {v.type === 'suspicious'  ? thread.vote_suspicious
                        : v.type === 'authentic'  ? thread.vote_authentic
                        : thread.vote_investigate}
                    </span>
                </button>
            ))}
        </div>
    );
}
