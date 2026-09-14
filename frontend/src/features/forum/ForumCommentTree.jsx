import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageSquare, Flag, X, ChevronDown, ChevronUp, ShieldCheck, Send } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import popup from '../../services/popup';
import MentionTextarea from './MentionTextarea';

const soft = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

const REPLIES_INITIAL = 3;

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return 'az önce';
    if (diff < 3600)   return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
    return `${Math.floor(diff / 604800)} hafta önce`;
}

const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#a855f7','var(--color-fake-fill)'];
const PAL_BG   = ['#1a9e4f22','#3b82f622','#f59e0b22','#a855f722','#dc262622'];

function avatarIdx(username = '') { return username.charCodeAt(0) % PAL_BG.length; }

const DEPTH_INDENT  = 30;
const MAX_DEPTH     = 3;

function CommentNode({ comment, threadId, onHelpful, onReport, onNewComment, currentUserId, canModerate = false, depth = 0 }) {
    const [showReplies,  setShowReplies]  = React.useState(false);
    const [visibleCount, setVisibleCount] = React.useState(REPLIES_INITIAL);
    const [editMode,     setEditMode]     = React.useState(false);
    const [editBody,     setEditBody]     = React.useState('');
    const [replyOpen,    setReplyOpen]    = React.useState(false);
    const [replyBody,    setReplyBody]    = React.useState('');
    const [replySending, setReplySending] = React.useState(false);
    const [verifiedCount, setVerifiedCount] = React.useState(comment.verified_count ?? 0);
    const [userVerified,  setUserVerified]  = React.useState(comment.current_user_verified ?? false);
    const isAuthor = comment.user_id === currentUserId;
    const idx      = avatarIdx(comment.username);
    const avatarSz = depth === 0 ? 34 : 28;

    const replies       = comment.replies ?? [];
    const visibleReplies = replies.slice(0, visibleCount);
    const hiddenCount    = replies.length - visibleCount;

    const handleEdit = async () => {
        try {
            await axiosInstance.put(`/forum/comments/${comment.id}`, { body: editBody });
            setEditMode(false);
            onNewComment?.();
        } catch {}
    };

    const handleDelete = async () => {
        popup.confirm({
            title: 'Yorumu sil',
            message: 'Bu yorumu silmek istediğinizden emin misiniz?',
            confirmLabel: 'Sil',
            cancelLabel: 'İptal',
            onConfirm: async () => {
                try { await axiosInstance.delete(`/forum/comments/${comment.id}`); onNewComment?.(); } catch {}
            },
        });
    };

    const handleVerify = async () => {
        if (!comment.evidence_urls?.length) return;
        try {
            const { data } = await axiosInstance.post(`/forum/comments/${comment.id}/verify`);
            setVerifiedCount(data.verified_count);
            setUserVerified(data.verified);
        } catch {}
    };

    const submitReply = async () => {
        if (!replyBody.trim() || replySending) return;
        setReplySending(true);
        try {
            await axiosInstance.post(`/forum/threads/${threadId}/comments`, {
                body: replyBody.trim(), parent_id: comment.id,
            });
            setReplyBody('');
            setReplyOpen(false);
            setShowReplies(true);
            onNewComment?.();
        } catch {}
        finally { setReplySending(false); }
    };

    return (
        <div style={{ marginLeft: depth > 0 ? DEPTH_INDENT : 0, position: 'relative' }}>
            {depth > 0 && (
                <div style={{
                    position: 'absolute', left: -DEPTH_INDENT + 15, top: 0, bottom: 16,
                    width: 2, borderRadius: 2, background: 'var(--color-border)',
                }} />
            )}

            <div className="py-3">
                {/* Üst: avatar + kullanıcı + zaman */}
                <div className="flex items-start gap-3">
                    <div
                        className="rounded-full overflow-hidden flex items-center justify-center font-extrabold shrink-0"
                        style={{ width: avatarSz, height: avatarSz, background: PAL_BG[idx], color: PAL_TEXT[idx], fontSize: depth === 0 ? 14 : 12 }}
                    >
                        {comment.avatar_url
                            ? <img src={comment.avatar_url} alt={comment.username}
                                   style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                   referrerPolicy="no-referrer"
                                   onError={e => { e.currentTarget.style.display = 'none'; }} />
                            : (comment.username ?? '?')[0].toUpperCase()
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                to={`/users/${comment.user_id}`}
                                className="text-[14px] font-bold transition-colors hover:text-brand"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                {comment.username}
                            </Link>
                            {comment.display_label && (
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                                    {comment.display_label}
                                </span>
                            )}
                            {comment.is_highlighted && (
                                <span className="text-[11px] font-bold pl-2" style={{ color: 'var(--color-brand-primary)', borderLeft: '2px solid var(--color-brand-primary)' }}>
                                    Öne çıkan
                                </span>
                            )}
                            <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                                · {timeAgo(comment.created_at)}
                            </span>
                        </div>

                        {/* Gövde */}
                        {editMode ? (
                            <div className="flex flex-col gap-2 mt-1.5">
                                <textarea
                                    value={editBody}
                                    onChange={e => setEditBody(e.target.value)}
                                    rows={3}
                                    className="w-full text-[14px] bg-transparent outline-none px-3.5 py-2.5 resize-none"
                                    style={{ background: 'transparent', border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleEdit}
                                        className="text-[12.5px] px-4 py-1.5 font-bold transition-opacity hover:opacity-85"
                                        style={{ background: 'var(--color-brand-primary)', color: '#fff' }}>
                                        Kaydet
                                    </button>
                                    <button onClick={() => setEditMode(false)}
                                        className="text-[12.5px] px-4 py-1.5 font-bold transition-colors border"
                                        style={{ background: 'transparent', color: 'var(--color-text-primary)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                        İptal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {comment.is_featured_evidence && (
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Öne Çıkan Kanıt
                                    </div>
                                )}
                                <p className="text-[14.5px] leading-relaxed mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                                    {comment.body}
                                    {comment.is_edited && (
                                        <span className="ml-2 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>(düzenlendi)</span>
                                    )}
                                </p>
                            </>
                        )}

                        {/* Alt: aksiyonlar */}
                        <div className="flex items-center gap-1 -ml-2.5 mt-1 flex-wrap">
                            <button
                                onClick={() => onHelpful(comment.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: comment.helpful_count > 0 ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                            >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {comment.helpful_count > 0 ? comment.helpful_count : 'Faydalı'}
                            </button>

                            {(comment.evidence_urls?.length > 0) && (
                                <button
                                    onClick={handleVerify}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: userVerified ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                                    title="Kaynağı inceledim ve doğruladım"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {userVerified ? 'Doğrulandı' : 'Doğrula'} {verifiedCount > 0 && `(${verifiedCount})`}
                                </button>
                            )}

                            {depth <= MAX_DEPTH && (
                                <button
                                    onClick={() => setReplyOpen(v => !v)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: replyOpen ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Yanıtla
                                </button>
                            )}

                            {isAuthor && !editMode && (
                                <button
                                    onClick={() => { setEditBody(comment.body); setEditMode(true); }}
                                    className="px-2.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Düzenle
                                </button>
                            )}
                            {(isAuthor || canModerate) && !editMode && (
                                <button
                                    onClick={handleDelete}
                                    title={!isAuthor && canModerate ? 'Moderatör olarak sil' : undefined}
                                    className="px-2.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: 'var(--color-fake-fill)' }}
                                >
                                    Sil
                                </button>
                            )}

                            {comment.user_id !== currentUserId && (
                                <button
                                    onClick={() => onReport(comment.id)}
                                    aria-label="Yorumu bildir"
                                    className="p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    <Flag className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {replies.length > 0 && (
                                <button
                                    onClick={() => { setShowReplies(v => !v); if (!showReplies) setVisibleCount(REPLIES_INITIAL); }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12.5px] font-bold ml-auto transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: 'var(--color-brand-primary)' }}
                                >
                                    {showReplies
                                        ? <><ChevronUp className="w-3.5 h-3.5" /> Gizle</>
                                        : <><ChevronDown className="w-3.5 h-3.5" /> {replies.length} yanıt</>
                                    }
                                </button>
                            )}
                        </div>

                        {/* Satır içi yanıt kutusu — tam bu yorumun altında */}
                        {replyOpen && (
                            <div className="mt-2.5">
                                <MentionTextarea
                                    value={replyBody}
                                    onChange={setReplyBody}
                                    rows={2}
                                    placeholder={`${comment.username} kullanıcısına yanıt yaz…`}
                                    className="w-full block resize-none text-[14px] leading-normal outline-none px-3.5 py-2.5 transition-colors box-border"
                                    style={{ background: 'transparent', border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={submitReply}
                                        disabled={!replyBody.trim() || replySending}
                                        className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold transition-all duration-150 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                                        style={{ background: 'var(--color-brand-primary)', color: '#fff' }}
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Yanıtla
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alt yanıtlar */}
            {replies.length > 0 && (
                <div className="grid transition-all duration-200 ease-out"
                     style={{ gridTemplateRows: showReplies ? '1fr' : '0fr', opacity: showReplies ? 1 : 0 }}>
                    <div className="overflow-hidden">
                        {visibleReplies.map(reply => (
                            <CommentNode
                                key={reply.id}
                                comment={reply}
                                threadId={threadId}
                                onHelpful={onHelpful}
                                onReport={onReport}
                                onNewComment={onNewComment}
                                currentUserId={currentUserId}
                                canModerate={canModerate}
                                depth={depth + 1}
                            />
                        ))}
                        {hiddenCount > 0 && (
                            <button
                                onClick={() => setVisibleCount(v => v + REPLIES_INITIAL)}
                                className="mb-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-colors"
                                style={{ background: soft('--color-brand-primary', 10), color: 'var(--color-brand-primary)' }}
                            >
                                + {hiddenCount} yanıt daha göster
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const ForumCommentTree = ({ comments, threadId, onNewComment }) => {
    const { user } = useAuth();
    const currentUserId = user?.id;
    const canModerate   = ['admin', 'superadmin', 'moderator'].includes(user?.role);

    const [reportTarget, setReportTarget] = React.useState(null);
    const [reportReason, setReportReason] = React.useState('spam');
    const [reportSent,   setReportSent]   = React.useState(false);
    const [visible,      setVisible]      = React.useState(false);

    React.useEffect(() => {
        if (reportTarget) setTimeout(() => setVisible(true), 20);
        else setVisible(false);
    }, [reportTarget]);

    const closeReport = () => { setVisible(false); setTimeout(() => setReportTarget(null), 180); };

    const handleHelpful = async (commentId) => {
        try { await axiosInstance.post(`/forum/comments/${commentId}/vote`); onNewComment?.(); } catch {}
    };

    const handleReport = (commentId) => { setReportTarget(commentId); setReportSent(false); };

    if (!comments?.length) {
        return (
            <p className="text-[14px] text-center py-10 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Henüz yorum yok — ilk yorumu sen yaz.
            </p>
        );
    }

    return (
        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {comments.map(c => (
                <CommentNode
                    key={c.id}
                    comment={c}
                    threadId={threadId}
                    onHelpful={handleHelpful}
                    onReport={handleReport}
                    onNewComment={onNewComment}
                    currentUserId={currentUserId}
                    canModerate={canModerate}
                />
            ))}

            {reportTarget && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-9999"
                        style={{
                            background:           visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                            backdropFilter:       visible ? 'blur(4px)' : 'blur(0px)',
                            WebkitBackdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
                            transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
                        }}
                        onClick={closeReport}
                    />
                    <div className="fixed inset-0 z-10000 flex items-center justify-center px-4 pointer-events-none">
                        <div
                            className="w-80 max-w-full p-6 pointer-events-auto relative"
                            style={{
                                background: 'var(--color-terminal-surface)',
                                boxShadow:  '0 24px 64px rgba(0,0,0,0.35)',
                                transform:  visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
                                opacity:    visible ? 1 : 0,
                                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
                            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
                            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[15px] font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                                    Yorumu bildir
                                </span>
                                <button onClick={closeReport} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {reportSent ? (
                                <p className="text-[14px] font-medium" style={{ color: 'var(--color-brand-primary)' }}>
                                    Bildiriminiz alındı, teşekkürler.
                                </p>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1 mb-5 -mx-2">
                                        {[
                                            { value: 'spam',           label: 'Spam' },
                                            { value: 'hate_speech',    label: 'Hakaret / Nefret söylemi' },
                                            { value: 'misinformation', label: 'Yanıltıcı bilgi' },
                                            { value: 'off_topic',      label: 'Konu dışı' },
                                        ].map(opt => (
                                            <label key={opt.value}
                                                   className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer"
                                                   style={{ background: reportReason === opt.value ? soft('--color-brand-primary', 10) : 'transparent' }}>
                                                <input
                                                    type="radio"
                                                    name="reason"
                                                    value={opt.value}
                                                    checked={reportReason === opt.value}
                                                    onChange={() => setReportReason(opt.value)}
                                                    style={{ accentColor: 'var(--color-brand-primary)' }}
                                                />
                                                <span className="text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            axiosInstance.post(`/forum/comments/${reportTarget}/report`, { reason: reportReason })
                                                .then(() => setReportSent(true))
                                                .catch(() => setReportSent(true));
                                        }}
                                        className="w-full py-2.5 text-[13.5px] font-bold transition-all duration-150 hover:scale-105"
                                        style={{ background: 'var(--color-brand-primary)', color: '#fff' }}
                                    >
                                        Bildir
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default ForumCommentTree;
