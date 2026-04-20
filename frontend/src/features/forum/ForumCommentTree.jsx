import React from 'react';
import { ThumbsUp, MessageSquare, Link as LinkIcon, Flag, X } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return `${Math.floor(diff)}s`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    return `${Math.floor(diff / 86400)}g`;
}

const AVATAR_COLORS = [
    ['rgba(16,185,129,0.15)',  'var(--color-brand-primary)'],
    ['rgba(59,130,246,0.15)',  'var(--color-accent-blue)'],
    ['rgba(245,158,11,0.15)',  'var(--color-accent-amber)'],
    ['rgba(168,85,247,0.15)',  '#a855f7'],
    ['rgba(239,68,68,0.15)',   'var(--color-fake-fill)'],
];

function getAvatarColor(username = '') {
    const idx = username.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

const DEPTH_INDENT = 20;
const MAX_REPLY_DEPTH = 2;

function CommentNode({ comment, threadId, onReply, onHelpful, onReport, currentUserId, depth = 0 }) {
    const [showReplies, setShowReplies] = React.useState(true);
    const [avatarBg, avatarColor]       = getAvatarColor(comment.username);

    const depthBorderColor = depth === 0
        ? `rgba(16,185,129,${comment.is_highlighted ? '0.55' : '0.20'})`
        : depth === 1
        ? 'var(--color-border)'
        : 'rgba(61,68,77,0.40)';

    const depthBg = depth === 0
        ? 'var(--color-bg-surface)'
        : 'var(--color-bg-base)';

    const avatarSize = depth === 0 ? 28 : depth === 1 ? 24 : 20;

    return (
        <div style={{ marginLeft: depth > 0 ? DEPTH_INDENT : 0, position: 'relative' }}>
            {/* Thread bağlantı çizgisi */}
            {depth > 0 && (
                <div style={{
                    position:   'absolute',
                    left:       -DEPTH_INDENT + 6,
                    top:        0,
                    bottom:     0,
                    width:      2,
                    background: 'var(--color-border)',
                    opacity:    depth === 1 ? 0.45 : 0.25,
                    borderRadius: 1,
                }} />
            )}

            <div
                className="rounded-xl p-3 mb-2 transition-colors"
                style={{
                    background: depthBg,
                    borderLeft: `2px solid ${depthBorderColor}`,
                    boxShadow:  comment.is_highlighted ? '0 0 0 1px rgba(16,185,129,0.07) inset' : 'none',
                }}
            >
                {/* Üst: avatar + kullanıcı + zaman */}
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{
                            width:      avatarSize,
                            height:     avatarSize,
                            background: avatarBg,
                            color:      avatarColor,
                        }}
                    >
                        {(comment.username ?? '?')[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {comment.username}
                    </span>
                    {comment.display_label && (
                        <span className="text-[8px] font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                            {'★'.repeat(comment.stars || 1)} {comment.display_label}
                        </span>
                    )}
                    {comment.is_highlighted && (
                        <span
                            className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.20)' }}
                        >
                            Öne Çıkan
                        </span>
                    )}
                    <span className="text-[9px] text-muted ml-auto">{timeAgo(comment.created_at)}</span>
                </div>

                {/* Gövde */}
                <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {comment.body}
                </p>

                {/* Kanıt linkleri */}
                {comment.evidence_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {comment.evidence_urls.map((url, i) => (
                            <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                                style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.18)' }}
                            >
                                <LinkIcon className="w-2.5 h-2.5" />
                                Kaynak {i + 1}
                            </a>
                        ))}
                    </div>
                )}

                {/* Alt: aksiyonlar */}
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
                        <span className="text-[8px] italic">↪ Maksimum derinlik</span>
                    )}

                    {comment.user_id !== currentUserId && (
                        <button
                            onClick={() => onReport(comment.id)}
                            className="flex items-center gap-1 hover:text-red-400 transition-colors opacity-50 hover:opacity-100"
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
            onNewComment?.();
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
            <p className="text-[11px] text-muted text-center py-8">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <div
                        className="rounded-2xl p-6 w-80 border"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Yorumu Bildir</span>
                            <button onClick={() => setReportTarget(null)}>
                                <X className="w-4 h-4 text-muted" />
                            </button>
                        </div>

                        {reportSent ? (
                            <p className="text-xs text-muted">Bildiriminiz alındı, teşekkürler.</p>
                        ) : (
                            <>
                                <div className="flex flex-col gap-2.5 mb-4">
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
                                            <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        axiosInstance.post(`/forum/comments/${reportTarget}/report`, { reason: reportReason })
                                            .then(() => setReportSent(true))
                                            .catch(() => setReportSent(true));
                                    }}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
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
