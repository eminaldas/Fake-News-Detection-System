import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function GeneralVoteBar({ thread, onVote, disabled }) {
    const score = (thread.vote_up ?? 0) - (thread.vote_down ?? 0);
    return (
        <div className="flex items-center rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.22)' }}>
            <button
                disabled={disabled}
                onClick={() => onVote('up')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{ color: thread.current_user_vote === 'up' ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
            >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>{score}</span>
            </button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
            <button
                disabled={disabled}
                onClick={() => onVote('down')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{ color: thread.current_user_vote === 'down' ? 'var(--color-fake-fill)' : 'var(--color-text-muted)' }}
            >
                <ChevronDown className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
