import React, { useState } from 'react';
import { Reply, Trash2, Check, CheckCheck } from 'lucide-react';
import { extractForumId } from '../shared/linkify';
import { timeStr } from '../shared/format';
import LinkedText from '../shared/LinkedText';
import ForumCard from './ForumCard';
import ReplyQuote from './ReplyQuote';
import { C, RADIUS } from '../shared/ui';

const R  = RADIUS.bubble; // 16
const T  = RADIUS.tail;   // 5  — outer tail (single-bubble / group-end corner)
const TC = 4;             // connecting corners between consecutive grouped bubbles

export default function MessageBubble({ msg, isMine, isFirst, isLast, onReply, onDelete, meId }) {
    const [hover, setHover] = useState(false);
    const isGif   = msg.msg_type === 'gif';
    const isEmoji = msg.msg_type === 'emoji';
    const forumId = !isGif && !isEmoji ? extractForumId(msg.content) : null;
    const mb = isLast ? 'mb-4' : 'mb-[2px]';

    // Bubble border-radius — tail at bottom-right for outgoing, bottom-left for incoming.
    // isFirst grouping uses the "inner" side (left for outgoing, right for incoming) matching
    // the side the old 2px corners were on, mapped to the new T (5px) radius.
    const bubbleRadius = isMine
        ? `${isFirst ? R : TC}px ${R}px ${isLast ? T : R}px ${R}px`
        : `${R}px ${isFirst ? R : TC}px ${R}px ${isLast ? T : R}px`;

    const actions = (
        <div className={`absolute top-0 flex items-center gap-1 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}
             style={{ opacity: hover ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: hover ? 'auto' : 'none' }}>
            <button onClick={() => onReply(msg)} title="Yanıtla"
                    className="p-1 transition-colors hover:bg-white/10"
                    style={{ color: C.textMuted }}>
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
                     style={{ border: `1px solid ${C.border}`, borderRadius: 14 }}>
                    {actions}
                    <img src={msg.content} alt="gif" className="w-full" />
                    {isLast && (
                        <p className="font-mono text-[10px] px-2 py-1 text-right"
                           style={{ color: C.textSecondary }}>
                            {timeStr(msg.created_at)}
                        </p>
                    )}
                </div>
            ) : isEmoji ? (
                <div className={`flex flex-col relative ${isMine ? 'items-end' : 'items-start'}`}>
                    {actions}
                    <span className="text-4xl leading-none">{msg.content}</span>
                    {isLast && (
                        <span className="font-mono text-[10px] mt-0.5"
                              style={{ color: C.textSecondary }}>
                            {timeStr(msg.created_at)}
                        </span>
                    )}
                </div>
            ) : (
                <div className={`max-w-[72%] relative ${isMine ? 'ml-16' : 'mr-16'}`}>
                    {actions}
                    <div className="px-3.5 py-2.5"
                         style={{
                             background:   isMine ? C.outBubbleBg  : C.surface,
                             border:       isMine
                                 ? `1px solid ${C.outBubbleBorder}`
                                 : `1px solid ${C.border}`,
                             color:        isMine ? C.outBubbleText : C.inBubbleText,
                             borderRadius: bubbleRadius,
                         }}>
                        {msg.reply_to && (
                            <ReplyQuote replyTo={msg.reply_to} isMine={isMine} meId={meId} />
                        )}
                        <p className="font-mono text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                            <LinkedText text={msg.content} />
                        </p>
                        {forumId && <ForumCard threadId={forumId} isMine={isMine} />}
                    </div>
                    {isLast && (
                        <p className={`font-mono text-[10px] mt-1 flex items-center gap-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                           style={{ color: C.textSecondary }}>
                            {timeStr(msg.created_at)}
                            {isMine && (msg.is_read
                                ? <CheckCheck className="w-2.5 h-2.5" style={{ color: C.green }} />
                                : <Check className="w-2.5 h-2.5" style={{ color: C.textMuted }} />
                            )}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
