import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function GeneralVoteBar({ thread, onVote, disabled }) {
    const score = (thread.vote_up ?? 0) - (thread.vote_down ?? 0);
    const isUp   = thread.current_user_vote === 'up';
    const isDown = thread.current_user_vote === 'down';

    return (
        <div className="flex items-center border overflow-hidden" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
            <button
                disabled={disabled}
                onClick={() => onVote('up')}
                className="flex items-center gap-1.5 px-3 py-2 font-mono text-sm font-bold transition-colors disabled:opacity-40"
                style={{
                    color:      isUp ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                    background: isUp ? 'rgba(16,185,129,0.08)' : 'transparent',
                }}
            >
                <ChevronUp className="w-4 h-4" />
                <span>{score}</span>
            </button>
            <div style={{ width: 1, background: 'var(--color-terminal-border-raw)', alignSelf: 'stretch' }} />
            <button
                disabled={disabled}
                onClick={() => onVote('down')}
                className="flex items-center px-3 py-2 font-mono text-sm font-bold transition-colors disabled:opacity-40"
                style={{
                    color:      isDown ? 'var(--color-fake-fill)' : 'var(--color-text-primary)',
                    background: isDown ? 'rgba(239,68,68,0.08)' : 'transparent',
                }}
            >
                <ChevronDown className="w-4 h-4" />
            </button>
        </div>
    );
}
