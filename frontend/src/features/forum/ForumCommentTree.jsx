import React from 'react';
import { ThumbsUp, MessageSquare, Link as LinkIcon, Flag, X } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    return `${Math.floor(diff / 86400)}g`;
}

const DEPTH_INDENT = 20; // px per depth level
const MAX_REPLY_DEPTH = 2; // depth 0,1,2 → Reply butonu görünür

function CommentNode({ comment, threadId, onReply, onHelpful, onReport, currentUserId, depth = 0 }) {
    const [showReplies, setShowReplies] = React.useState(true);

    const depthBorderColor = depth === 0
        ? `rgba(46,204,113,${comment.is_highlighted ? '0.60' : '0.25'})`
        : depth === 1
        ? 'var(--color-border)'
        : 'rgba(61,68,77,0.5)';

    const depthBg = depth === 0
        ? 'var(--color-bg-surface)'
        : 'var(--color-bg-base)';

    return (
        <div style={{ marginLeft: depth > 0 ? DEPTH_INDENT : 0, position: 'relative' }}>
            {/* Thread bağlantı çizgisi */}
            {depth > 0 && (
                <div style={{
                    position: 'absolute',
                    left:     -DEPTH_INDENT + 8,
                    top:      0,
                    bottom:   0,
                    width:    1,
                    background: 'var(--color-border)',
                    opacity:  depth === 1 ? 0.5 : 0.3,
                }} />
            )}
            <div
                className="rounded-lg p-3 mb-2 transition-colors"
                style={{
                    background:  depthBg,
                    borderLeft:  `2px solid ${depthBorderColor}`,
                    boxShadow:   comment.is_highlighted
                        ? '0 0 0 1px rgba(46,204,113,0.08) inset'
                        : 'none',
                }}
            >
                {/* Üst: avatar + kullanıcı adı + zaman */}
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                        style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-accent-blue)' }}
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
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                              style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--color-brand-primary)' }}>
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
                                style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.18)' }}
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
                            <span style={{ color: 'var(--color-brand-primary)' }}>{comment.helpful_count}</span>
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

                    {comment.user_id !== currentUserId && (
                        <button
                            onClick={() => onReport(comment.id)}
                            className="flex items-center gap-1 text-[9px] text-tx-secondary/50 hover:text-red-400 transition-colors"
                        >
                            <Flag className="w-2.5 h-2.5" />
                            Bildir
                        </button>
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
                            onReport={onReport}
                            currentUserId={currentUserId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

const ForumCommentTree = ({ comments, threadId, onReply, onNewComment }) => {
    const { user } = useAuth();
    const currentUserId = user?.id;

    const [reportTarget, setReportTarget] = React.useState(null);
    const [reportReason, setReportReason] = React.useState('spam');
    const [reportSent,   setReportSent]   = React.useState(false);

    const handleHelpful = async (commentId) => {
        try {
            await axiosInstance.post(`/forum/comments/${commentId}/vote`);
            onNewComment?.(); // parent'ı yeniden yükle
        } catch {
            // sessiz hata
        }
    };

    const handleReport = (commentId) => {
        setReportTarget(commentId);
        setReportSent(false);
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
                    onReport={handleReport}
                    currentUserId={currentUserId}
                />
            ))}

            {reportTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="rounded-xl p-6 w-80 border"
                         style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-tx-primary">Yorumu Bildir</span>
                            <button onClick={() => setReportTarget(null)}>
                                <X className="w-4 h-4 text-tx-secondary" />
                            </button>
                        </div>

                        {reportSent ? (
                            <p className="text-xs text-tx-secondary">Bildiriminiz alındı, teşekkürler.</p>
                        ) : (
                            <>
                                <div className="flex flex-col gap-2 mb-4">
                                    {[
                                        { value: 'spam',           label: 'Spam' },
                                        { value: 'hate_speech',    label: 'Hakaret / Nefret söylemi' },
                                        { value: 'misinformation', label: 'Yanıltıcı bilgi' },
                                        { value: 'off_topic',      label: 'Konu dışı' },
                                    ].map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={opt.value}
                                                checked={reportReason === opt.value}
                                                onChange={() => setReportReason(opt.value)}
                                            />
                                            <span className="text-xs text-tx-primary">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        axiosInstance.post(`/forum/comments/${reportTarget}/report`, { reason: reportReason })
                                            .then(() => setReportSent(true))
                                            .catch(() => setReportSent(true)); // sessiz hata
                                    }}
                                    className="w-full py-2 rounded-lg text-xs font-bold"
                                    style={{ background: 'var(--color-brand-primary)', color: 'var(--color-es-bg)' }}
                                >
                                    Bildir
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForumCommentTree;
