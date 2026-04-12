import React from 'react';
import { ThumbsUp, MessageSquare, Link as LinkIcon } from 'lucide-react';
import axiosInstance from '../../api/axios';

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    return `${Math.floor(diff / 86400)}g`;
}

const DEPTH_INDENT = 20; // px per depth level
const MAX_REPLY_DEPTH = 2; // depth 0,1,2 → Reply butonu görünür

function CommentNode({ comment, threadId, onReply, onHelpful, depth = 0 }) {
    const [showReplies, setShowReplies] = React.useState(true);

    const borderColors = ['#3fff8b40', '#33333380', '#22222280'];
    const borderColor  = borderColors[Math.min(depth, 2)];
    const bgAlpha      = depth === 0 ? '#111111' : depth === 1 ? '#0d0d0d' : '#0a0a0a';

    return (
        <div style={{ marginLeft: depth > 0 ? DEPTH_INDENT : 0 }}>
            <div
                className="rounded-lg p-3 mb-2"
                style={{
                    background: bgAlpha,
                    borderLeft: `2px solid ${depth === 0 && comment.is_highlighted ? '#3fff8b' : borderColor}`,
                }}
            >
                {/* Üst: avatar + kullanıcı adı + zaman */}
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                        style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}
                    >
                        {(comment.username ?? '?')[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-semibold text-tx-primary">{comment.username}</span>
                    {comment.display_label && (
                        <span className="text-[8px] text-brand ml-1">
                            {'★'.repeat(comment.stars || 1)} {comment.display_label}
                        </span>
                    )}
                    {comment.is_highlighted && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(63,255,139,0.1)', color: 'var(--color-brand)' }}>
                            Öne Çıkan
                        </span>
                    )}
                    <span className="text-[9px] text-muted ml-auto">{timeAgo(comment.created_at)}</span>
                </div>

                {/* Gövde */}
                <p className="text-[11px] text-tx-secondary leading-relaxed mb-2">{comment.body}</p>

                {/* Kanıt linkleri */}
                {comment.evidence_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {comment.evidence_urls.map((url, i) => (
                            <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded"
                                style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
                            >
                                <LinkIcon className="w-2.5 h-2.5" />
                                Kaynak {i + 1}
                            </a>
                        ))}
                    </div>
                )}

                {/* Alt: faydalı oy + yanıtla */}
                <div className="flex items-center gap-3 text-[9px] text-muted">
                    <button
                        onClick={() => onHelpful(comment.id)}
                        className="flex items-center gap-1 hover:text-brand transition-colors"
                    >
                        <ThumbsUp className="w-3 h-3" />
                        {comment.helpful_count > 0 && (
                            <span style={{ color: 'var(--color-brand)' }}>{comment.helpful_count}</span>
                        )}
                        Faydalı
                    </button>

                    {depth <= MAX_REPLY_DEPTH ? (
                        <button
                            onClick={() => onReply(comment.id, comment.username)}
                            className="flex items-center gap-1 hover:text-tx-primary transition-colors"
                        >
                            <MessageSquare className="w-3 h-3" />
                            Yanıtla
                        </button>
                    ) : (
                        <span className="text-[8px] text-muted italic">
                            ↪ Konuşma maksimum derinliğe ulaştı
                        </span>
                    )}

                    {comment.replies?.length > 0 && (
                        <button
                            onClick={() => setShowReplies(v => !v)}
                            className="text-[9px] text-muted hover:text-tx-primary transition-colors ml-auto"
                        >
                            {showReplies ? `▲ Gizle` : `▼ ${comment.replies.length} yanıt`}
                        </button>
                    )}
                </div>
            </div>

            {/* Alt yorumlar */}
            {showReplies && comment.replies?.length > 0 && (
                <div>
                    {comment.replies.map(reply => (
                        <CommentNode
                            key={reply.id}
                            comment={reply}
                            threadId={threadId}
                            onReply={onReply}
                            onHelpful={onHelpful}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

const ForumCommentTree = ({ comments, threadId, onReply, onNewComment }) => {
    const handleHelpful = async (commentId) => {
        try {
            await axiosInstance.post(`/forum/comments/${commentId}/vote`);
            onNewComment?.(); // parent'ı yeniden yükle
        } catch {
            // sessiz hata
        }
    };

    if (!comments?.length) {
        return (
            <p className="text-[11px] text-muted text-center py-6">
                Henüz yorum yok. İlk yorumu sen yap!
            </p>
        );
    }

    return (
        <div>
            {comments.map(c => (
                <CommentNode
                    key={c.id}
                    comment={c}
                    threadId={threadId}
                    onReply={onReply}
                    onHelpful={handleHelpful}
                />
            ))}
        </div>
    );
};

export default ForumCommentTree;
