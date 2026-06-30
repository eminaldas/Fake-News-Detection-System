// frontend/src/features/messages/components/ReplyQuote.jsx
import React from 'react';
import { C } from '../shared/ui';

export default function ReplyQuote({ replyTo, isMine, meId }) {
    if (!replyTo) return null;
    const isMyReply = replyTo.sender_id === meId;
    // isMine (outgoing): soft green tint to sit inside outgoing bubble
    // !isMine (incoming): very faint green tint, brand-primary left border
    const bg = isMine ? C.greenSoft        : 'rgba(16,185,129,0.07)';
    const bc = isMine ? C.greenSoftBorder  : C.green;
    return (
        <div className="border-l-2 pl-2 pb-1.5 mb-2"
             style={{ borderColor: bc, background: bg, borderRadius: 12 }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5"
               style={{ color: C.textSecondary }}>
                {isMyReply ? 'Sen' : 'Karşı taraf'}
            </p>
            <p className="font-mono text-xs line-clamp-2" style={{ color: C.textPrimary }}>
                {replyTo.content}
            </p>
        </div>
    );
}
