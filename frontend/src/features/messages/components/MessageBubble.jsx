import React, { useState } from 'react';
import { Reply, Trash2, Check, CheckCheck } from 'lucide-react';
import { extractForumId } from '../shared/linkify';
import { timeStr } from '../shared/format';
import LinkedText from '../shared/LinkedText';
import ForumCard from './ForumCard';
import ReplyQuote from './ReplyQuote';

export default function MessageBubble({ msg, isMine, isFirst, isLast, onReply, onDelete, meId }) {
    const [hover, setHover] = useState(false);
    const isGif   = msg.msg_type === 'gif';
    const isEmoji = msg.msg_type === 'emoji';
    const forumId = !isGif && !isEmoji ? extractForumId(msg.content) : null;
    const mb = isLast ? 'mb-3' : 'mb-0.5';

    const actions = (
        <div className={`absolute top-0 flex items-center gap-1 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}
             style={{ opacity: hover ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: hover ? 'auto' : 'none' }}>
            <button onClick={() => onReply(msg)} title="Yanıtla"
                    className="p-1 transition-colors hover:bg-white/10"
                    style={{ color: 'var(--color-text-muted)' }}>
                <Reply className="w-3.5 h-3.5" />
            </button>
            {isMine && (
                <button onClick={() => onDelete(msg.id)} title="Sil"
                        className="p-1 transition-colors hover:bg-white/10"
                        style={{ color: '#ef4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${mb} px-4`}
             onMouseEnter={() => setHover(true)}
             onMouseLeave={() => setHover(false)}>
            {isGif ? (
                <div className={`max-w-60 overflow-hidden relative ${isMine ? 'ml-16' : 'mr-16'}`}
                     style={{ border: '1px solid var(--color-terminal-border-raw)' }}>
                    {actions}
                    <img src={msg.content} alt="gif" className="w-full" />
                    {isLast && (
                        <p className="font-mono text-[9px] px-2 py-1 text-right"
                           style={{ color: 'var(--color-text-muted)' }}>
                            {timeStr(msg.created_at)}
                        </p>
                    )}
                </div>
            ) : isEmoji ? (
                <div className={`flex flex-col relative ${isMine ? 'items-end' : 'items-start'}`}>
                    {actions}
                    <span className="text-4xl leading-none">{msg.content}</span>
                    {isLast && (
                        <span className="font-mono text-[9px] mt-0.5"
                              style={{ color: 'var(--color-text-muted)' }}>
                            {timeStr(msg.created_at)}
                        </span>
                    )}
                </div>
            ) : (
                <div className={`max-w-[72%] relative ${isMine ? 'ml-16' : 'mr-16'}`}>
                    {actions}
                    <div className="px-3.5 py-2.5"
                         style={{
                             background:   isMine ? 'var(--color-brand-primary)' : 'var(--color-bg-base)',
                             border:       isMine ? 'none' : '1px solid var(--color-terminal-border-raw)',
                             color:        isMine ? '#070f12' : 'var(--color-text-primary)',
                             borderRadius: isMine
                                 ? `${isFirst ? 8 : 2}px 8px 8px ${isLast ? 8 : 2}px`
                                 : `8px ${isFirst ? 8 : 2}px ${isLast ? 8 : 2}px 8px`,
                         }}>
                        {msg.reply_to && (
                            <ReplyQuote replyTo={msg.reply_to} isMine={isMine} meId={meId} />
                        )}
                        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                            <LinkedText text={msg.content} />
                        </p>
                        {forumId && <ForumCard threadId={forumId} isMine={isMine} />}
                    </div>
                    {isLast && (
                        <p className={`font-mono text-[9px] mt-1 flex items-center gap-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                           style={{ color: 'var(--color-text-muted)' }}>
                            {timeStr(msg.created_at)}
                            {isMine && (msg.is_read
                                ? <CheckCheck className="w-2.5 h-2.5" />
                                : <Check className="w-2.5 h-2.5 opacity-40" />
                            )}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
