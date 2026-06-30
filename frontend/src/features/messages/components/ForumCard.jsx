// frontend/src/features/messages/components/ForumCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ExternalLink, MessageSquare } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import { C } from '../shared/ui';

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
             style={{ borderColor: isMine ? C.greenSoftBorder : C.border, borderRadius: 12 }}>
            <Loader2 className="w-3 h-3 animate-spin shrink-0"
                     style={{ color: C.green }} />
            <span className="font-mono text-xs" style={{ color: C.textSecondary }} />
        </div>
    );

    const bg  = isMine ? C.greenSoft        : 'rgba(16,185,129,0.04)';
    const bdC = isMine ? C.greenSoftBorder  : C.green;

    return (
        <Link to={`/forum/${threadId}`}
              className="mt-2 block border-l-2 pl-3 pr-2 py-2 transition-opacity hover:opacity-80"
              style={{ background: bg, borderColor: bdC, borderRadius: 12 }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-1"
               style={{ color: C.textSecondary }}>
            </p>
            <p className="font-mono text-xs font-bold leading-snug line-clamp-2"
               style={{ color: C.textPrimary }}>
                {thread.title}
            </p>
            {thread.category && (
                <p className="font-mono text-[10px] mt-1" style={{ color: C.green }}>
                    #{thread.category}
                </p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
                <span className="font-mono text-[9px]" style={{ color: C.textSecondary }}>
                    ↑ {thread.upvote_count ?? 0}
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px]"
                      style={{ color: C.textSecondary }}>
                    <MessageSquare className="w-2.5 h-2.5" /> {thread.reply_count ?? 0}
                </span>
                <ExternalLink className="w-2.5 h-2.5 ml-auto" style={{ color: C.textSecondary }} />
            </div>
        </Link>
    );
}
