import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    AlertTriangle, Send,
    ShieldCheck, ShieldAlert, ChevronDown, ChevronUp,
    ArrowLeft, ExternalLink,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import popup from '../../services/popup';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import ForumCommentTree from './ForumCommentTree';
import MentionTextarea from './MentionTextarea';
import LoginNudgeModal from '../../components/ui/LoginNudgeModal';
import ShareDropdown from '../../components/ui/ShareDropdown';
import SendToFriendModal from './SendToFriendModal';
import NewsVoteBar    from './NewsVoteBar';
import GeneralVoteBar from './GeneralVoteBar';
import VerdictModal   from './VerdictModal';
import VerdictBox     from './VerdictBox';

const soft = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;
const CARD = { background: 'var(--color-navbar-bg)', border: '1px solid var(--color-border)' };
const CHIP = { background: 'var(--color-bg-surface-solid)', color: 'var(--color-text-secondary)' };

const STATUS_LABEL = { under_review: 'İncelemede', resolved: 'Çözüldü' };

function Card({ children, className = '' }) {
    return (
        <div className={`rounded-2xl overflow-hidden ${className}`} style={CARD}>
            {children}
        </div>
    );
}

const ForumThread = () => {
    const { threadId } = useParams();
    const { subscribe } = useWebSocket();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [thread,   setThread]   = React.useState(null);
    const [loading,  setLoading]  = React.useState(true);
    const [voting,   setVoting]   = React.useState(false);
    const [bodyOpen, setBodyOpen] = React.useState(true);

    const isAuthor    = user?.id === thread?.author?.id;
    const canModerate = ['admin', 'superadmin', 'moderator'].includes(user?.role);

    const [editMode,  setEditMode]  = React.useState(false);
    const [editTitle, setEditTitle] = React.useState('');
    const [editBody,  setEditBody]  = React.useState('');

    const [body,              setBody]              = React.useState('');
    const [submitting,        setSubmitting]        = React.useState(false);
    const [moderationWarning, setModerationWarning] = React.useState(false);
    const [sendModal,         setSendModal]         = React.useState(false);
    const [verdictModal,      setVerdictModal]      = React.useState(false);
    const [following,        setFollowing]         = React.useState(false);

    const load = React.useCallback(async () => {
        try {
            const { data } = await axiosInstance.get(`/forum/threads/${threadId}`);
            setThread(data);
        } catch {}
        finally { setLoading(false); }
    }, [threadId]);

    React.useEffect(() => { load(); }, [load]);

    React.useEffect(() => {
        const unsub = subscribe('forum.new_comment', (payload) => {
            if (payload?.thread_id === threadId) load();
        });
        return unsub;
    }, [subscribe, threadId, load]);

    const handleVote = async (voteType) => {
        if (voting) return;
        setVoting(true);
        try {
            const { data } = await axiosInstance.post(`/forum/threads/${threadId}/vote`, { vote_type: voteType });
            setThread(prev => ({ ...prev, ...data }));
        } catch {}
        finally { setVoting(false); }
    };

    const handleDelete  = async () => {
        popup.confirm({
            title: 'Tartışmayı sil',
            message: 'Bu tartışmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
            confirmLabel: 'Sil',
            cancelLabel: 'İptal',
            onConfirm: async () => {
                try { await axiosInstance.delete(`/forum/threads/${threadId}`); navigate('/forum'); } catch {}
            },
        });
    };
    const toggleFollow  = async () => {
        if (!user || !thread?.author?.id) return;
        setFollowing(v => !v);
        try { await axiosInstance.post(`/users/${thread.author.id}/follow`); }
        catch { setFollowing(v => !v); }
    };
    const submitEdit    = async () => {
        try { await axiosInstance.put(`/forum/threads/${threadId}`, { title: editTitle, body: editBody }); setEditMode(false); await load(); } catch {}
    };

    const submitComment = async (e) => {
        e.preventDefault();
        if (!body.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await axiosInstance.post(`/forum/threads/${threadId}/comments`, {
                body: body.trim(),
            });
            if (res.status === 202) {
                setModerationWarning(true);
            } else {
                setBody(''); setModerationWarning(false);
                await load();
            }
        } catch {}
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--color-bg-surface-solid)' }} />
            ))}
        </div>
    );

    if (!thread) return null;

    const statusLabel   = STATUS_LABEL[thread.status];
    const isFake        = thread.article?.ai_verdict === 'FAKE';
    const confidencePct = thread.article ? Math.round(thread.article.confidence * 100) : null;
    const isNews        = thread.article_id || thread.category === 'haberler';

    return (
        <>
        <div className="flex flex-col gap-5">

            {/* Geri */}
            <button
                onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/forum')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-bold transition-colors self-start"
                style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-surface-solid)' }}
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Forum'a Dön
            </button>

            {/* ── Ana kart: başlık + açıklama + meta ── */}
            <Card>
                <div className="p-6 flex flex-col gap-4">

                    {/* Meta badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {thread.article && (
                            <span
                                className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full"
                                style={{
                                    color:      isFake ? 'var(--color-fake-fill)' : 'var(--color-brand-primary)',
                                    background: soft(isFake ? '--color-fake-fill' : '--color-brand-primary', 10),
                                }}
                            >
                                {isFake ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                AI: %{confidencePct} {isFake ? 'Yanıltıcı' : 'Güvenilir'}
                            </span>
                        )}
                        {thread.category && (
                            <button
                                type="button"
                                onClick={() => navigate(`/forum?category=${encodeURIComponent(thread.category)}`)}
                                className="text-[12px] font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-75"
                                style={CHIP}
                            >
                                {thread.category}
                            </button>
                        )}
                        {statusLabel && (
                            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full ml-auto" style={CHIP}>
                                {statusLabel}
                            </span>
                        )}
                    </div>

                    {/* Başlık + gövde (birleşik) */}
                    {editMode ? (
                        <div className="flex flex-col gap-3">
                            <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="w-full bg-transparent text-[18px] font-extrabold outline-none px-0 py-2 border-b-2"
                                style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-text-primary)' }}
                            />
                            <textarea
                                value={editBody}
                                onChange={e => setEditBody(e.target.value)}
                                rows={4}
                                className="w-full bg-transparent text-[14.5px] outline-none px-3.5 py-3 rounded-xl resize-none"
                                style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-surface-solid)' }}
                            />
                            <div className="flex gap-2">
                                <button onClick={submitEdit}
                                    className="px-5 py-2 rounded-full text-[13px] font-bold transition-opacity hover:opacity-85"
                                    style={{ background: 'var(--color-brand-primary)', color: '#fff' }}>
                                    Kaydet
                                </button>
                                <button onClick={() => setEditMode(false)}
                                    className="px-5 py-2 rounded-full text-[13px] font-bold transition-colors"
                                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)' }}>
                                    İptal
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            <div className="flex items-start gap-3">
                                <h2 className="flex-1 font-manrope text-[22px] font-extrabold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                                    {thread.title}
                                </h2>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <ShareDropdown
                                        url={`${window.location.origin}/forum/${thread.id}`}
                                        text={`Forum: ${thread.title}`}
                                        onSendToFriend={() => setSendModal(true)}
                                    />
                                    {isAuthor && (
                                        <button
                                            onClick={() => { setEditTitle(thread.title); setEditBody(thread.body ?? ''); setEditMode(true); }}
                                            className="text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors"
                                            style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)' }}
                                        >
                                            Düzenle
                                        </button>
                                    )}
                                    {(isAuthor || canModerate) && (
                                        <button
                                            onClick={handleDelete}
                                            title={!isAuthor && canModerate ? 'Moderatör olarak sil' : undefined}
                                            className="text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors"
                                            style={{ color: 'var(--color-fake-fill)', background: soft('--color-fake-fill', 10) }}
                                        >
                                            Sil
                                        </button>
                                    )}
                                    {isAuthor && !thread.verdict && (
                                        thread.featured_comment_id ? (
                                            <div
                                                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-semibold"
                                                style={{ color: 'var(--color-accent-amber)', background: soft('--color-accent-amber', 10) }}
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                Yüksek güvenilirlikte kanıt var — topluluk oyuna bırakılıyor
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setVerdictModal(true)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-bold transition-all duration-150 hover:scale-105"
                                                style={{ color: '#fff', background: 'var(--color-brand-primary)' }}
                                            >
                                                Sonuçlandır
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Thread görselleri */}
                            {thread.image_urls?.length > 0 && (
                                <div className={`grid gap-1.5 ${
                                    thread.image_urls.length === 1 ? 'grid-cols-1' :
                                    thread.image_urls.length === 2 ? 'grid-cols-2' :
                                    thread.image_urls.length === 3 ? 'grid-cols-3' :
                                    'grid-cols-2'
                                }`}>
                                    {thread.image_urls.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className={`overflow-hidden rounded-xl ${
                                                thread.image_urls.length === 4 && idx === 0 ? 'col-span-2 row-span-1' : ''
                                            }`}
                                        >
                                            <img
                                                src={url}
                                                alt=""
                                                className={`w-full object-cover ${
                                                    thread.image_urls.length === 1 ? 'max-h-72' : 'h-40'
                                                }`}
                                                onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Açıklama — başlıkla aynı kart içinde */}
                            {thread.body && (
                                <>
                                    <button
                                        className="flex items-center gap-1.5 text-[12px] font-bold transition-opacity hover:opacity-70 self-start"
                                        style={{ color: 'var(--color-brand-primary)' }}
                                        onClick={() => setBodyOpen(v => !v)}
                                    >
                                        {bodyOpen
                                            ? <><ChevronUp className="w-3.5 h-3.5" /> Açıklamayı gizle</>
                                            : <><ChevronDown className="w-3.5 h-3.5" /> Açıklamayı gör</>
                                        }
                                    </button>
                                    <div className="grid transition-all duration-200 ease-out"
                                         style={{ gridTemplateRows: bodyOpen ? '1fr' : '0fr', opacity: bodyOpen ? 1 : 0 }}>
                                        <div className="overflow-hidden">
                                            <p className="text-[15px] leading-relaxed rounded-xl px-4 py-3"
                                               style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-surface-solid)' }}>
                                                {thread.body}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Yazar + tarih + takip */}
                    <div className="flex items-center gap-2.5">
                        <p className="text-[13px] font-medium flex-1" style={{ color: 'var(--color-text-muted)' }}>
                            <Link to={`/users/${thread.author?.id}`} className="font-bold hover:text-brand transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                                {thread.author?.username}
                            </Link>
                            {' · '}{new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {!isAuthor && thread.author?.id && (
                            <button
                                type="button"
                                onClick={toggleFollow}
                                className="text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all duration-150 hover:scale-105 shrink-0"
                                style={following
                                    ? { color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)' }
                                    : { color: '#fff', background: 'var(--color-brand-primary)' }}
                            >
                                {following ? 'Takip ediliyor' : 'Takip Et'}
                            </button>
                        )}
                    </div>

                    {/* İnceleme uyarısı */}
                    {thread.status === 'under_review' && (
                        <div
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-medium"
                            style={{ background: soft('--color-accent-amber', 10), color: 'var(--color-accent-amber)' }}
                        >
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Topluluk kararı AI kararıyla çelişiyor — inceleme altında
                        </div>
                    )}

                    {/* Etiketler */}
                    {thread.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {thread.tags.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => navigate(`/forum?tag=${encodeURIComponent(t.name)}`)}
                                    className="text-[12px] font-bold px-2.5 py-0.5 rounded-full transition-opacity hover:opacity-75"
                                    style={t.is_system ? { background: soft('--color-brand-primary', 12), color: 'var(--color-brand-primary)' } : CHIP}
                                >
                                    #{t.name.replace(/^#/, '')}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Bağlı haber kartı ── */}
                    {thread.article && (
                        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: 'var(--color-bg-surface-solid)' }}>
                            {thread.article.image_url && (
                                <img
                                    src={thread.article.image_url}
                                    alt=""
                                    className="w-14 h-11 object-cover shrink-0 rounded-lg"
                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                                    {thread.article.title}
                                </p>
                                {thread.article.source_name && (
                                    <span className="text-[12px] mt-1 block" style={{ color: 'var(--color-text-muted)' }}>
                                        {thread.article.source_name}
                                    </span>
                                )}
                            </div>
                            {thread.article.source_url && (
                                <a
                                    href={thread.article.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-bold shrink-0 transition-all duration-150 hover:scale-105"
                                    style={{ background: 'var(--color-brand-primary)', color: '#fff' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Habere Git
                                </a>
                            )}
                        </div>
                    )}

                    {/* ── Verdict kutusu ── */}
                    {thread.verdict && <VerdictBox thread={thread} />}

                    {/* ── Alt satır: oy butonları ── */}
                    {!thread.verdict && (
                        <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                            {isNews
                                ? <NewsVoteBar    thread={thread} onVote={handleVote} disabled={voting} />
                                : <GeneralVoteBar thread={thread} onVote={handleVote} disabled={voting} />
                            }
                        </div>
                    )}
                </div>
            </Card>

            {/* ── Yorumlar ── */}
            <Card>
                <div className="px-6 pt-5 pb-1">
                    <h3 className="text-[16px] font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                        Tartışma <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>· {thread.comment_count} yorum</span>
                    </h3>
                </div>

                {/* Yorum formu — ÜSTTE */}
                <form onSubmit={submitComment} className="flex flex-col gap-3 p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {moderationWarning && (
                        <div className="px-3.5 py-3 rounded-xl" style={{ background: soft('--color-accent-amber', 10) }}>
                            <p className="text-[14px] font-medium" style={{ color: 'var(--color-accent-amber)' }}>
                                Yorumunuz incelemeye alındı. İçeriği düzenleyip tekrar gönderebilirsiniz.
                            </p>
                        </div>
                    )}

                    <MentionTextarea
                        id="comment-input"
                        value={body}
                        onChange={(val) => { setBody(val); setModerationWarning(false); }}
                        rows={3}
                        placeholder="Kanıt veya yorumunu ekle…"
                        className="w-full resize-none text-[14.5px] outline-none px-4 py-3 rounded-xl transition-colors"
                        style={{ background: 'var(--color-bg-surface-solid)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                    />

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!body.trim() || submitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-bold disabled:opacity-40 transition-all duration-150 hover:scale-105 disabled:hover:scale-100"
                            style={{ background: 'var(--color-brand-primary)', color: '#fff' }}
                        >
                            <Send className="w-4 h-4" />
                            Gönder
                        </button>
                    </div>
                </form>

                {/* Yorum listesi */}
                <div className="px-6 py-5">
                    <ForumCommentTree
                        comments={thread.comments ?? []}
                        threadId={threadId}
                        onNewComment={load}
                    />
                </div>
            </Card>
        </div>
        {sendModal && (
            <SendToFriendModal
                threadTitle={thread.title}
                threadUrl={`${window.location.origin}/forum/${thread.id}`}
                onClose={() => setSendModal(false)}
            />
        )}
        {verdictModal && (
            <VerdictModal
                threadId={threadId}
                postType={thread.post_type || 'iddia'}
                onClose={() => setVerdictModal(false)}
                onResolved={(data) => {
                    setThread(prev => ({ ...prev, ...data }));
                }}
            />
        )}
        </>
    );
};

export default ForumThread;
