import React from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUp, MessageSquare, Link as LinkIcon, Flag, X, ChevronDown, ChevronUp } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return `${Math.floor(diff)}S`;
    if (diff < 3600)   return `${Math.floor(diff / 60)}DK`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}SA`;
    return `${Math.floor(diff / 86400)}G`;
}

const PAL_BG   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(168,85,247,0.15)','rgba(239,68,68,0.15)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#a855f7','var(--color-fake-fill)'];

function avatarIdx(username = '') { return username.charCodeAt(0) % PAL_BG.length; }

const DEPTH_INDENT  = 24;
const MAX_DEPTH     = 2;

/* Derinliğe göre sol-border rengi */
function depthBorderColor(depth, highlighted) {
    if (highlighted) return 'var(--color-brand-primary)';
    if (depth === 0) return 'rgba(16,185,129,0.35)';
    if (depth === 1) return 'rgba(16,185,129,0.18)';
    return 'rgba(16,185,129,0.08)';
}

function CommentNode({ comment, threadId, onReply, onHelpful, onReport, onNewComment, currentUserId, depth = 0 }) {
    const [showReplies,    setShowReplies]    = React.useState(true);
    const [editMode,       setEditMode]       = React.useState(false);
    const [editBody,       setEditBody]       = React.useState('');
    const isAuthor = comment.user_id === currentUserId;
    const idx      = avatarIdx(comment.username);
    const borderL  = depthBorderColor(depth, comment.is_highlighted);
    const avatarSz = depth === 0 ? 32 : 26;

    const handleEdit = async () => {
        try {
            await axiosInstance.put(`/forum/comments/${comment.id}`, { body: editBody });
            setEditMode(false);
            onNewComment?.();
        } catch {}
    };

    const handleDelete = async () => {
        if (!window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
        try { await axiosInstance.delete(`/forum/comments/${comment.id}`); onNewComment?.(); } catch {}
    };

    return (
        <div style={{ marginLeft: depth > 0 ? DEPTH_INDENT : 0, position: 'relative' }}>
            {/* Derinlik bağlantı çizgisi */}
            {depth > 0 && (
                <div style={{
                    position:   'absolute',
                    left:       -DEPTH_INDENT + 8,
                    top:        0,
                    bottom:     12,
                    width:      2,
                    background: depth === 1 ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)',
                }} />
            )}

            {/* Yorum kartı */}
            <div
                className="mb-3 border-l-[3px] transition-colors"
                style={{
                    ...TS,
                    borderLeftColor: borderL,
                    background: comment.is_highlighted
                        ? 'rgba(16,185,129,0.04)'
                        : 'var(--color-terminal-surface)',
                }}
            >
                {/* Üst: avatar + kullanıcı + zaman */}
                <div className="flex items-center gap-3 px-4 py-3 border-b" style={BD}>
                    {/* Kare avatar */}
                    <div
                        className="flex items-center justify-center font-mono font-black shrink-0"
                        style={{
                            width:      avatarSz,
                            height:     avatarSz,
                            background: PAL_BG[idx],
                            color:      PAL_TEXT[idx],
                            border:     `1px solid ${PAL_TEXT[idx]}30`,
                            fontSize:   depth === 0 ? 14 : 11,
                        }}
                    >
                        {(comment.username ?? '?')[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {comment.username}
                        </span>
                        {comment.display_label && (
                            <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--color-brand-primary)' }}>
                                {'▓'.repeat(Math.min(comment.stars || 1, 5))} {comment.display_label}
                            </span>
                        )}
                        {comment.is_highlighted && (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 border"
                                  style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)' }}>
                                ÖNE ÇIKAN
                            </span>
                        )}
                    </div>

                    <span className="font-mono text-xs shrink-0 tracking-widest" style={{ color: 'var(--color-text-primary)', opacity: 0.4 }}>
                        {timeAgo(comment.created_at)} ÖNCE
                    </span>
                </div>

                {/* Gövde */}
                <div className="px-4 py-3">
                    {editMode ? (
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={editBody}
                                onChange={e => setEditBody(e.target.value)}
                                rows={3}
                                className="w-full font-mono text-sm bg-transparent outline-none px-3 py-2 border resize-none"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleEdit}
                                    className="font-mono text-sm px-4 py-1.5 font-bold transition-opacity hover:opacity-80"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                                    [ KAYDET ]
                                </button>
                                <button onClick={() => setEditMode(false)}
                                    className="font-mono text-sm px-4 py-1.5 border transition-opacity hover:opacity-70"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
                                    İptal
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="font-mono text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                            {comment.body}
                            {comment.is_edited && (
                                <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--color-text-primary)', opacity: 0.35 }}>
                                    (düzenlendi)
                                </span>
                            )}
                        </p>
                    )}

                    {/* Kanıt linkleri */}
                    {comment.evidence_urls?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {comment.evidence_urls.map((url, i) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 border transition-opacity hover:opacity-70"
                                    style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.25)' }}
                                >
                                    <LinkIcon className="w-3 h-3" />
                                    Kaynak {i + 1}
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alt: aksiyonlar */}
                <div className="flex items-center gap-1 px-4 py-2 border-t flex-wrap" style={BD}>
                    <button
                        onClick={() => onHelpful(comment.id)}
                        className="flex items-center gap-1.5 px-2 py-1 font-mono text-xs transition-colors hover:text-brand"
                        style={{ color: comment.helpful_count > 0 ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {comment.helpful_count > 0 ? comment.helpful_count : 'Faydalı'}
                    </button>

                    {depth <= MAX_DEPTH ? (
                        <button
                            onClick={() => onReply(comment.id, comment.username)}
                            className="flex items-center gap-1.5 px-2 py-1 font-mono text-xs transition-colors hover:text-brand"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Yanıtla
                        </button>
                    ) : (
                        <span className="font-mono text-xs px-2 py-1" style={{ color: 'var(--color-text-primary)', opacity: 0.35 }}>
                            ↪ max derinlik
                        </span>
                    )}

                    {isAuthor && !editMode && (
                        <>
                            <button
                                onClick={() => { setEditBody(comment.body); setEditMode(true); }}
                                className="px-2 py-1 font-mono text-xs transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                düzenle
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-2 py-1 font-mono text-xs transition-opacity hover:opacity-60"
                                style={{ color: '#ef4444' }}
                            >
                                sil
                            </button>
                        </>
                    )}

                    {comment.user_id !== currentUserId && (
                        <button
                            onClick={() => onReport(comment.id)}
                            className="flex items-center gap-1 px-2 py-1 font-mono text-xs transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-primary)', opacity: 0.35 }}
                        >
                            <Flag className="w-3 h-3" />
                        </button>
                    )}

                    {comment.replies?.length > 0 && (
                        <button
                            onClick={() => setShowReplies(v => !v)}
                            className="flex items-center gap-1 px-2 py-1 font-mono text-xs ml-auto transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            {showReplies
                                ? <><ChevronUp className="w-3.5 h-3.5" /> Gizle</>
                                : <><ChevronDown className="w-3.5 h-3.5" /> {comment.replies.length} yanıt</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* Alt yanıtlar */}
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
                            onNewComment={onNewComment}
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
        try { await axiosInstance.post(`/forum/comments/${commentId}/vote`); onNewComment?.(); } catch {}
    };

    const handleReport = (commentId) => { setReportTarget(commentId); setReportSent(false); };

    if (!comments?.length) {
        return (
            <p className="font-mono text-sm text-center py-8" style={{ color: 'var(--color-text-primary)', opacity: 0.4 }}>
                // henüz yorum yok — ilk yorumu sen yap
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
                    onNewComment={onNewComment}
                    currentUserId={currentUserId}
                />
            ))}

            {/* Bildir modalı */}
            {reportTarget && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.75)' }}
                    onClick={() => setReportTarget(null)}
                >
                    <div
                        className="relative border p-6 w-80"
                        style={TS}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Köşe aksanları */}
                        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand" />
                        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand" />
                        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand" />
                        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand" />

                        <div className="flex items-center justify-between mb-4">
                            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                                // YORUMU BİLDİR
                            </span>
                            <button onClick={() => setReportTarget(null)} style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {reportSent ? (
                            <p className="font-mono text-sm" style={{ color: 'var(--color-brand-primary)' }}>
                                [ OK ] Bildiriminiz alındı, teşekkürler.
                            </p>
                        ) : (
                            <>
                                <div className="flex flex-col gap-3 mb-5">
                                    {[
                                        { value: 'spam',           label: 'Spam' },
                                        { value: 'hate_speech',    label: 'Hakaret / Nefret söylemi' },
                                        { value: 'misinformation', label: 'Yanıltıcı bilgi' },
                                        { value: 'off_topic',      label: 'Konu dışı' },
                                    ].map(opt => (
                                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={opt.value}
                                                checked={reportReason === opt.value}
                                                onChange={() => setReportReason(opt.value)}
                                                style={{ accentColor: 'var(--color-brand-primary)' }}
                                            />
                                            <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        axiosInstance.post(`/forum/comments/${reportTarget}/report`, { reason: reportReason })
                                            .then(() => setReportSent(true))
                                            .catch(() => setReportSent(true));
                                    }}
                                    className="w-full py-2.5 font-mono text-sm font-bold tracking-wider transition-opacity hover:opacity-80"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                                >
                                    [ BİLDİR ]
                                </button>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ForumCommentTree;
