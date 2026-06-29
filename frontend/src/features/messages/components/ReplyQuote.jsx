// frontend/src/features/messages/components/ReplyQuote.jsx
import React from 'react';

export default function ReplyQuote({ replyTo, isMine, meId }) {
    if (!replyTo) return null;
    const isMyReply = replyTo.sender_id === meId;
    const bg  = isMine ? 'rgba(7,15,18,0.18)' : 'rgba(16,185,129,0.07)';
    const bc  = isMine ? 'rgba(7,15,18,0.35)' : 'var(--color-brand-primary)';
    const tc  = isMine ? '#070f12'            : 'var(--color-text-secondary)';
    return (
        <div className="border-l-2 pl-2 pb-1.5 mb-2" style={{ borderColor: bc, background: bg }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5"
               style={{ color: isMine ? '#070f1260' : 'var(--color-text-muted)' }}>
                {isMyReply ? 'Sen' : 'Karşı taraf'}
            </p>
            <p className="font-mono text-xs line-clamp-2" style={{ color: tc }}>
                {replyTo.content}
            </p>
        </div>
    );
}
