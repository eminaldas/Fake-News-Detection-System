import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const soft = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

export default function GeneralVoteBar({ thread, onVote, disabled }) {
    const score  = (thread.vote_authentic ?? 0) - (thread.vote_suspicious ?? 0);
    const isUp   = thread.current_user_vote === 'authentic';
    const isDown = thread.current_user_vote === 'suspicious';

    return (
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--color-bg-surface-solid)' }}>
            <button
                disabled={disabled}
                onClick={() => onVote('authentic')}
                aria-label={isUp ? 'Güvenilir oyunu geri al' : 'Güvenilir oy ver'}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[14px] font-bold transition-all duration-150 disabled:opacity-40"
                style={{
                    color:      isUp ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                    background: isUp ? soft('--color-brand-primary', 14) : 'transparent',
                }}
            >
                <ChevronUp className="w-4 h-4" />
                <span>{score}</span>
            </button>
            <button
                disabled={disabled}
                onClick={() => onVote('suspicious')}
                aria-label={isDown ? 'Şüpheli oyunu geri al' : 'Şüpheli oy ver'}
                className="flex items-center px-3.5 py-2 rounded-full transition-all duration-150 disabled:opacity-40"
                style={{
                    color:      isDown ? 'var(--color-fake-fill)' : 'var(--color-text-secondary)',
                    background: isDown ? soft('--color-fake-fill', 14) : 'transparent',
                }}
            >
                <ChevronDown className="w-4 h-4" />
            </button>
        </div>
    );
}
