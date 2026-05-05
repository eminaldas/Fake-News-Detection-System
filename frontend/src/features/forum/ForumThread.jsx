import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    AlertTriangle, Send, Link as LinkIcon, X,
    ShieldCheck, ShieldAlert, ChevronDown, ChevronUp,
    ArrowLeft, MessageSquare,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import ForumCommentTree from './ForumCommentTree';
import MentionTextarea from './MentionTextarea';
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
import ShareDropdown from '../../components/ui/ShareDropdown';
import NewsVoteBar    from './NewsVoteBar';
import GeneralVoteBar from './GeneralVoteBar';

/* ── Tasarım sabitleri ── */
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const STATUS_COLOR = {
    active:       'var(--color-brand-primary)',
    under_review: 'var(--color-accent-amber)',
    resolved:     'var(--color-accent-blue)',
};
const STATUS_LABEL = {
    active:       'AKTİF',
    under_review: 'İNCELEME ALTINDA',
    resolved:     'ÇÖZÜLDÜ',
};

/* Section wrapper */
function Block({ title, children, footer }) {
    return (
        <div className="relative border overflow-hidden" style={TS}>
            <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />
            {title && (
                <div className="px-4 py-3 border-b" style={BD}>
                    <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                        {title}
                    </span>
                </div>
            )}
            <div>{children}</div>
            {footer && (
                <div className="border-t px-4 py-2 flex justify-between items-center" style={BD}>
                    {footer}
                </div>
            )}
        </div>
    );
}

/* Oy dağılım barı — segmented */
function VoteSegBar({ suspicious, authentic, investigate }) {
    const total = suspicious + authentic + investigate || 1;
    const SEGS  = 10;
    const sSegs = Math.round((suspicious / total) * SEGS);
    const aSegs = Math.round((authentic  / total) * SEGS);
    const iSegs = SEGS - sSegs - aSegs;
    return (
        <div className="flex gap-[2px]">
            {Array(sSegs).fill('var(--color-fake-fill)').concat(
             Array(Math.max(0,aSegs)).fill('var(--color-brand-primary)'),
             Array(Math.max(0,iSegs)).fill('var(--color-accent-amber)')
            ).map((c, i) => (
                <div key={i} className="h-2 w-3" style={{ background: c }} />
            ))}
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

    const [showNudge, closeNudge] = useLoginNudge();
    const isAuthor = user?.id === thread?.author?.id;

    const [editMode,  setEditMode]  = React.useState(false);
    const [editTitle, setEditTitle] = React.useState('');
    const [editBody,  setEditBody]  = React.useState('');

    const [body,              setBody]              = React.useState('');
    const [parentId,          setParentId]          = React.useState(null);
    const [replyTo,           setReplyTo]           = React.useState(null);
    const [evidenceUrls,      setEvidenceUrls]      = React.useState([]);
    const [urlInput,          setUrlInput]          = React.useState('');
    const [submitting,        setSubmitting]        = React.useState(false);
    const [moderationWarning, setModerationWarning] = React.useState(false);

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

    const handleReply   = (commentId, username) => { setParentId(commentId); setReplyTo(username); document.getElementById('comment-input')?.focus(); };
    const cancelReply   = () => { setParentId(null); setReplyTo(null); };
    const handleDelete  = async () => {
        if (!window.confirm('Tartışmayı silmek istediğinizden emin misiniz?')) return;
        try { await axiosInstance.delete(`/forum/threads/${threadId}`); navigate('/forum'); } catch {}
    };
    const submitEdit    = async () => {
        try { await axiosInstance.put(`/forum/threads/${threadId}`, { title: editTitle, body: editBody }); setEditMode(false); await load(); } catch {}
    };
    const addUrl        = () => { const u = urlInput.trim(); if (u && !evidenceUrls.includes(u)) { setEvidenceUrls(p => [...p, u]); setUrlInput(''); } };
    const removeUrl     = (u) => setEvidenceUrls(p => p.filter(x => x !== u));

    const submitComment = async (e) => {
        e.preventDefault();
        if (!body.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await axiosInstance.post(`/forum/threads/${threadId}/comments`, {
                body: body.trim(), parent_id: parentId ?? undefined, evidence_urls: evidenceUrls,
            });
            if (res.status === 202) {
                setModerationWarning(true);
            } else {
                setBody(''); setParentId(null); setReplyTo(null); setEvidenceUrls([]); setModerationWarning(false);
                await load();
            }
        } catch {}
        finally { setSubmitting(false); }
    };

    /* ── Skeleton ── */
    if (loading) return (
        <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 border animate-pulse" style={TS} />
            ))}
        </div>
    );

    if (!thread) return (
        <p className="font-mono text-sm text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            // tartışma bulunamadı
        </p>
    );

    const totalVotes    = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;
    const statusColor   = STATUS_COLOR[thread.status] ?? STATUS_COLOR.active;
    const statusLabel   = STATUS_LABEL[thread.status] ?? 'AKTİF';
    const isFake        = thread.article?.ai_verdict === 'FAKE';
    const confidencePct = thread.article ? Math.round(thread.article.confidence * 100) : null;
    const isNews        = thread.article_id || thread.category === 'haberler';

    return (
        <>
        <div className="flex gap-5 items-start">

            {/* ══════ SOL — Ana içerik ══════ */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">

                {/* ── Geri + başlık ── */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 font-mono text-sm font-semibold transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        <ArrowLeft className="w-4 h-4" /> geri
                    </button>
                </div>

                {/* ── Thread Header kartı ── */}
                <Block>
                    <div className="p-5 flex flex-col gap-4">

                        {/* Meta badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {thread.article && (
                                <span
                                    className="flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 border"
                                    style={{
                                        color:       isFake ? 'var(--color-fake-text)'  : 'var(--color-brand-primary)',
                                        borderColor: isFake ? 'rgba(239,68,68,0.35)'    : 'rgba(16,185,129,0.35)',
                                        background:  isFake ? 'rgba(239,68,68,0.06)'    : 'rgba(16,185,129,0.06)',
                                    }}
                                >
                                    {isFake ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                    AI: %{confidencePct} {isFake ? 'Yanıltıcı' : 'Güvenilir'}
                                </span>
                            )}
                            {thread.category && (
                                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border"
                                      style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}>
                                    {thread.category}
                                </span>
                            )}
                            <span
                                className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border ml-auto"
                                style={{ color: statusColor, borderColor: statusColor + '50' }}
                            >
                                {statusLabel}
                            </span>
                        </div>

                        {/* Başlık */}
                        {editMode ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full bg-transparent font-mono text-base font-bold outline-none px-3 py-2 border"
                                    style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-text-primary)', background: 'var(--color-bg-base)' }}
                                />
                                <textarea
                                    value={editBody}
                                    onChange={e => setEditBody(e.target.value)}
                                    rows={4}
                                    className="w-full bg-transparent font-mono text-sm outline-none px-3 py-2 border resize-none"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-base)' }}
                                />
                                <div className="flex gap-2">
                                    <button onClick={submitEdit}
                                        className="px-4 py-2 font-mono text-sm font-bold transition-opacity hover:opacity-80"
                                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                                        [ KAYDET ]
                                    </button>
                                    <button onClick={() => setEditMode(false)}
                                        className="px-4 py-2 font-mono text-sm border transition-opacity hover:opacity-70"
                                        style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                                        İptal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <h2 className="flex-1 font-mono text-xl font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                                    {thread.title}
                                </h2>
                                <div className="flex items-center gap-2 shrink-0">
                                    <ShareDropdown url={`${window.location.origin}/s/forum/${thread.id}`} text={`Forum: ${thread.title}`} />
                                    {isAuthor && (
                                        <>
                                            <button
                                                onClick={() => { setEditTitle(thread.title); setEditBody(thread.body ?? ''); setEditMode(true); }}
                                                className="font-mono text-xs px-2 py-1 border transition-opacity hover:opacity-70"
                                                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                                            >
                                                düzenle
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="font-mono text-xs px-2 py-1 border transition-opacity hover:opacity-70"
                                                style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#ef4444' }}
                                            >
                                                sil
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Yazar + tarih */}
                        <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.55 }}>
                            {thread.author?.username} · {new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>

                        {/* İnceleme uyarısı */}
                        {thread.status === 'under_review' && (
                            <div
                                className="flex items-center gap-2.5 px-3 py-2.5 border font-mono text-sm"
                                style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.30)', color: 'var(--color-accent-amber)' }}
                            >
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Topluluk kararı AI kararıyla çelişiyor — inceleme altında
                            </div>
                        )}

                        {/* Etiketler */}
                        {thread.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {thread.tags.map(t => (
                                    <span
                                        key={t.id}
                                        className="font-mono text-[10px] px-2 py-0.5 border"
                                        style={{
                                            color:       t.is_system ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                            borderColor: t.is_system ? 'rgba(16,185,129,0.25)' : 'var(--color-terminal-border-raw)',
                                        }}
                                    >
                                        #{t.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Oy butonları */}
                        <div className="flex items-center gap-3 pt-3 border-t flex-wrap" style={BD}>
                            <span className="font-mono text-xs font-bold tracking-widest uppercase shrink-0" style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                OY VER:
                            </span>
                            {isNews
                                ? <NewsVoteBar    thread={thread} onVote={handleVote} disabled={voting} />
                                : <GeneralVoteBar thread={thread} onVote={handleVote} disabled={voting} />
                            }
                        </div>
                    </div>
                </Block>

                {/* ── Açıklama / Gövde — thread ile yorumlar arasında, katlanabilir ── */}
                {thread.body && !editMode && (
                    <div className="relative border overflow-hidden" style={TS}>
                        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                        <button
                            className="w-full flex items-center justify-between px-4 py-3 border-b font-mono text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-80"
                            style={{ ...BD, color: 'var(--color-brand-primary)', background: 'transparent' }}
                            onClick={() => setBodyOpen(v => !v)}
                        >
                            <span>// AÇIKLAMA</span>
                            {bodyOpen
                                ? <ChevronUp className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />
                            }
                        </button>
                        {bodyOpen && (
                            <div className="px-5 py-4">
                                <p className="font-mono text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                    {thread.body}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Yorumlar ── */}
                <Block
                    title={`// tartışma · ${thread.comment_count} yorum`}
                    footer={
                        <span className="font-mono text-[10px] opacity-30" style={{ color: 'var(--color-text-muted)' }}>
                            // COMMENT_STREAM
                        </span>
                    }
                >
                    <div className="px-5 py-4">
                        <ForumCommentTree
                            comments={thread.comments ?? []}
                            threadId={threadId}
                            onReply={handleReply}
                            onNewComment={load}
                        />
                    </div>

                    {/* Yorum formu */}
                    <form
                        onSubmit={submitComment}
                        className="border-t flex flex-col gap-3 p-5"
                        style={BD}
                    >
                        {replyTo && (
                            <div
                                className="flex items-center gap-2 font-mono text-xs px-3 py-2 border"
                                style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.20)', color: 'var(--color-text-muted)' }}
                            >
                                <span>↪ <strong style={{ color: 'var(--color-brand-primary)' }}>{replyTo}</strong> kullanıcısına yanıt</span>
                                <button type="button" onClick={cancelReply} className="ml-auto">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {moderationWarning && (
                            <div className="border px-3 py-2.5" style={{ borderColor: 'rgba(245,158,11,0.30)', background: 'rgba(245,158,11,0.06)' }}>
                                <p className="font-mono text-sm" style={{ color: 'var(--color-accent-amber)' }}>
                                    Yorumunuz incelemeye alındı. İçeriği düzenleyip tekrar gönderebilirsiniz.
                                </p>
                            </div>
                        )}

                        <MentionTextarea
                            id="comment-input"
                            value={body}
                            onChange={(val) => { setBody(val); setModerationWarning(false); }}
                            rows={3}
                            placeholder="Kanıt veya yorumunu ekle..."
                            className="w-full bg-transparent resize-none font-mono text-sm outline-none px-3 py-2.5 border transition-colors"
                            style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
                        />

                        {/* Kanıt URL'leri */}
                        {evidenceUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {evidenceUrls.map(url => (
                                    <div
                                        key={url}
                                        className="flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 border"
                                        style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.25)' }}
                                    >
                                        <LinkIcon className="w-3 h-3" />
                                        <span className="max-w-[180px] truncate">{url}</span>
                                        <button type="button" onClick={() => removeUrl(url)} className="ml-1">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1 border px-3 py-2" style={BD}>
                                <span className="font-mono text-xs shrink-0" style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                                <input
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                                    placeholder="kaynak linki ekle..."
                                    className="font-mono text-sm bg-transparent outline-none flex-1"
                                    style={{ color: 'var(--color-text-primary)' }}
                                />
                                {urlInput && (
                                    <button type="button" onClick={addUrl}
                                        className="font-mono text-xs px-2 py-0.5 border transition-opacity hover:opacity-70"
                                        style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.25)' }}>
                                        + ekle
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={!body.trim() || submitting}
                                className="flex items-center gap-2 px-5 py-2.5 font-mono text-sm font-bold tracking-wider disabled:opacity-40 transition-opacity hover:opacity-80"
                                style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                            >
                                <Send className="w-4 h-4" />
                                [ GÖNDER ]
                            </button>
                        </div>
                    </form>
                </Block>
            </div>

            {/* ══════ SAĞ — İstatistik ══════ */}
            <div className="w-52 flex-shrink-0 flex flex-col gap-4" style={{ position: 'sticky', top: '6rem', alignSelf: 'start' }}>

                {/* Tartışma istatistikleri */}
                <Block title="// istatistikler">
                    <div className="px-4 py-3 flex flex-col gap-0">
                        {[
                            { label: 'TOPLAM OY',   value: totalVotes,           color: 'var(--color-text-primary)' },
                            { label: 'YORUM',       value: thread.comment_count, color: 'var(--color-text-primary)' },
                        ].map(({ label, value }, idx, arr) => (
                            <div key={label}>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
                                    <span className="font-mono text-sm font-black" style={{ color: 'var(--color-brand-primary)' }}>{value}</span>
                                </div>
                                {idx < arr.length - 1 && <div className="h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />}
                            </div>
                        ))}
                        <div className="h-px mt-1" style={{ background: 'var(--color-terminal-border-raw)' }} />
                        <div className="flex items-center justify-between py-2.5">
                            <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--color-text-primary)' }}>DURUM</span>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 border" style={{ color: statusColor, borderColor: statusColor + '50' }}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>

                    {/* Oy dağılımı */}
                    {totalVotes > 0 && (
                        <div className="px-4 pb-4 flex flex-col gap-2">
                            <VoteSegBar
                                suspicious={thread.vote_suspicious}
                                authentic={thread.vote_authentic}
                                investigate={thread.vote_investigate}
                            />
                            <div className="flex items-center gap-3 font-mono text-[10px]">
                                <span style={{ color: 'var(--color-fake-fill)' }}>! {thread.vote_suspicious}</span>
                                <span style={{ color: 'var(--color-brand-primary)' }}>✓ {thread.vote_authentic}</span>
                                <span style={{ color: 'var(--color-accent-amber)' }}>? {thread.vote_investigate}</span>
                            </div>
                        </div>
                    )}
                </Block>

                {/* Bağlı haber */}
                {thread.article && (
                    <Block title="// bağlı_haber">
                        <div className="px-4 py-3 flex flex-col gap-3">
                            <p className="font-mono text-sm leading-snug line-clamp-3" style={{ color: 'var(--color-text-primary)' }}>
                                {thread.article.title}
                            </p>
                            {thread.article.source_domain && (
                                <p className="font-mono text-xs" style={{ color: 'var(--color-text-primary)', opacity: 0.45 }}>
                                    {thread.article.source_domain}
                                </p>
                            )}
                            <Link
                                to={`/forum?article=${thread.article.id}`}
                                className="flex items-center gap-1.5 font-mono text-xs font-bold transition-opacity hover:opacity-70"
                                style={{ color: 'var(--color-brand-primary)' }}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                bu haberdeki tartışmalar →
                            </Link>
                        </div>
                    </Block>
                )}
            </div>

        </div>
        {showNudge && <LoginNudgeModal onClose={closeNudge} />}
        </>
    );
};

export default ForumThread;
