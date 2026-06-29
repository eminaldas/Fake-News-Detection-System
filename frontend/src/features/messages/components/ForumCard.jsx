// frontend/src/features/messages/components/ForumCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import axiosInstance from '../../../api/axios';

export default function ForumCard({ threadId, isMine }) {
    const [thread, setThread] = useState(null);
    const [err,    setErr]    = useState(false);

    useEffect(() => {
        axiosInstance.get(`/forum/threads/${threadId}`)
            .then(r => setThread(r.data))
            .catch(() => setErr(true));
    }, [threadId]);

    if (err) return null;
    if (!thread) return (
        <div className="mt-2 border p-3 flex items-center gap-2"
             style={{ borderColor: isMine ? 'rgba(7,15,18,0.25)' : 'var(--color-terminal-border-raw)' }}>
            <Loader2 className="w-3 h-3 animate-spin shrink-0"
                     style={{ color: isMine ? '#070f12' : 'var(--color-brand-primary)' }} />
            <span className="font-mono text-xs" style={{ color: isMine ? '#070f1280' : 'var(--color-text-muted)' }}>
            </span>
        </div>
    );

    const bg  = isMine ? 'rgba(7,15,18,0.15)' : 'rgba(16,185,129,0.04)';
    const bdC = isMine ? 'rgba(7,15,18,0.25)' : 'var(--color-brand-primary)';
    const tc  = isMine ? '#070f12'            : 'var(--color-text-primary)';
    const mc  = isMine ? '#070f1280'          : 'var(--color-text-muted)';
    const bc  = isMine ? '#070f12'            : 'var(--color-brand-primary)';

    return (
        <Link to={`/forum/${threadId}`}
              className="mt-2 block border-l-2 pl-3 pr-2 py-2 transition-opacity hover:opacity-80"
              style={{ background: bg, borderColor: bdC }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: mc }}>
            </p>
            <p className="font-mono text-xs font-bold leading-snug line-clamp-2" style={{ color: tc }}>
                {thread.title}
            </p>
            {thread.category && (
                <p className="font-mono text-[10px] mt-1" style={{ color: bc }}>
                    #{thread.category}
                </p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
                <span className="font-mono text-[9px]" style={{ color: mc }}>
                    ↑ {thread.upvote_count ?? 0}
                </span>
                <span className="font-mono text-[9px]" style={{ color: mc }}>
                    💬 {thread.reply_count ?? 0}
                </span>
                <ExternalLink className="w-2.5 h-2.5 ml-auto" style={{ color: mc }} />
            </div>
        </Link>
    );
}
