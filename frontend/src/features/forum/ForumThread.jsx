import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, Send, Link as LinkIcon, X, ShieldCheck, ShieldAlert, Search } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';
import ForumCommentTree from './ForumCommentTree';
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
import ShareDropdown from '../../components/ui/ShareDropdown';

const VOTE_OPTIONS = [
  { type: 'suspicious',  label: 'Şüpheli', emoji: '🚩', color: 'var(--color-fake-fill)',     activeBg: 'rgba(239,68,68,0.12)',  activeBorder: 'rgba(239,68,68,0.40)' },
  { type: 'authentic',   label: 'Doğru',   emoji: '✅', color: 'var(--color-brand-primary)', activeBg: 'rgba(46,204,113,0.12)', activeBorder: 'rgba(46,204,113,0.40)' },
  { type: 'investigate', label: 'İncele',  emoji: '🔍', color: 'var(--color-accent-amber)',  activeBg: 'rgba(245,158,11,0.12)', activeBorder: 'rgba(245,158,11,0.40)' },
];

const STATUS_LABEL = {
  active:       { text: 'Aktif',             color: 'var(--color-brand-primary)' },
  under_review: { text: 'İnceleme Altında',  color: 'var(--color-accent-amber)' },
  resolved:     { text: 'Çözüldü',           color: 'var(--color-accent-blue)' },
};

function VoteBar({ suspicious, authentic, investigate, size = 2 }) {
  const total = suspicious + authentic + investigate || 1;
  return (
    <div className={`flex gap-0.5 rounded-full overflow-hidden`} style={{ height: `${size * 4}px` }}>
      <div style={{ flex: suspicious / total, background: 'var(--color-fake-fill)',     minWidth: suspicious  ? 2 : 0 }} />
      <div style={{ flex: authentic  / total, background: 'var(--color-brand-primary)', minWidth: authentic   ? 2 : 0 }} />
      <div style={{ flex: investigate / total, background: 'var(--color-accent-amber)', minWidth: investigate ? 2 : 0 }} />
    </div>
  );
}

const ForumThread = () => {
    const { threadId } = useParams();
    const { subscribe } = useWebSocket();
    const [thread,   setThread]   = React.useState(null);
    const [loading,  setLoading]  = React.useState(true);
    const [voting,   setVoting]   = React.useState(false);

    const [showNudge, closeNudge] = useLoginNudge();

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
        } catch {
            // sessiz hata
        } finally {
            setLoading(false);
        }
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
            setThread(prev => ({
                ...prev,
                vote_suspicious:   data.vote_suspicious,
                vote_authentic:    data.vote_authentic,
                vote_investigate:  data.vote_investigate,
                status:            data.status,
                current_user_vote: data.current_user_vote,
            }));
        } catch {
            // sessiz hata
        } finally {
            setVoting(false);
        }
    };

    const handleReply = (commentId, username) => {
        setParentId(commentId);
        setReplyTo(username);
        document.getElementById('comment-input')?.focus();
    };

    const cancelReply = () => { setParentId(null); setReplyTo(null); };

    const addUrl = () => {
        const url = urlInput.trim();
        if (url && !evidenceUrls.includes(url)) {
            setEvidenceUrls(prev => [...prev, url]);
            setUrlInput('');
        }
    };

    const removeUrl = (url) => setEvidenceUrls(prev => prev.filter(u => u !== url));

    const submitComment = async (e) => {
        e.preventDefault();
        if (!body.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await axiosInstance.post(`/forum/threads/${threadId}/comments`, {
                body: body.trim(),
                parent_id: parentId ?? undefined,
                evidence_urls: evidenceUrls,
            });
            if (res.status === 202) {
                setModerationWarning(true);
            } else {
                setBody('');
                setParentId(null);
                setReplyTo(null);
                setEvidenceUrls([]);
                setModerationWarning(false);
                await load();
            }
        } catch {
            // sessiz hata
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl border animate-pulse"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }} />
                ))}
            </div>
        );
    }

    if (!thread) {
        return <p className="text-muted text-sm text-center py-16">Tartışma bulunamadı.</p>;
    }

    const totalVotes  = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;
    const statusInfo  = STATUS_LABEL[thread.status] ?? STATUS_LABEL.active;
    const isFake      = thread.article?.ai_verdict === 'FAKE';
    const confidencePct = thread.article ? Math.round(thread.article.confidence * 100) : null;

    return (
        <>
        <div className="flex gap-5 items-start">

            {/* ── Sol: Ana içerik ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">

                {/* Haber / Thread Kartı */}
                <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                >
                    <div className="p-6">
                        {/* Üst meta */}
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            {thread.article && (
                                <>
                                    <span className="text-[9px] text-muted">{thread.article.source_domain}</span>
                                    <span
                                        className="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full"
                                        style={{
                                            background: isFake ? 'rgba(239,68,68,0.10)' : 'rgba(46,204,113,0.10)',
                                            color:      isFake ? 'var(--color-fake-text)'  : 'var(--color-brand-primary)',
                                            border:     `1px solid ${isFake ? 'rgba(239,68,68,0.25)' : 'rgba(46,204,113,0.25)'}`,
                                        }}
                                    >
                                        {isFake
                                            ? <ShieldAlert className="w-3 h-3" />
                                            : <ShieldCheck className="w-3 h-3" />}
                                        AI: %{confidencePct} {isFake ? 'Yanıltıcı' : 'Güvenilir'}
                                    </span>
                                </>
                            )}
                            <span
                                className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ml-auto"
                                style={{ color: statusInfo.color, background: `${statusInfo.color}15`, border: `1px solid ${statusInfo.color}30` }}
                            >
                                {statusInfo.text}
                            </span>
                        </div>

                        {/* Başlık + paylaş */}
                        <div className="flex items-start gap-3 mb-3">
                            <h2 className="flex-1 text-xl font-bold font-manrope leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                                {thread.title}
                            </h2>
                            <ShareDropdown
                                url={`${window.location.origin}/s/forum/${thread.id}`}
                                text={`Forum: ${thread.title}`}
                            />
                        </div>

                        {/* Yazar + tarih */}
                        <p className="text-[11px] text-muted mb-4">
                            {thread.author?.username} · {new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>

                        {/* Under review uyarısı */}
                        {thread.status === 'under_review' && (
                            <div
                                className="flex items-center gap-2 p-3 rounded-xl text-[10px] mb-4"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
                            >
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-accent-amber)' }} />
                                <span style={{ color: 'var(--color-accent-amber)' }}>
                                    Topluluk kararı AI kararıyla çelişiyor — <strong>İnceleme Altında</strong>
                                </span>
                            </div>
                        )}

                        {/* Gövde */}
                        {thread.body && (
                            <p className="text-[13px] text-tx-secondary leading-relaxed mb-4">
                                {thread.body}
                            </p>
                        )}

                        {/* Etiketler */}
                        {thread.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-5">
                                {thread.tags.map(t => (
                                    <span
                                        key={t.id}
                                        className="text-[9px] px-2.5 py-0.5 rounded-full"
                                        style={{
                                            background: t.is_system ? 'rgba(46,204,113,0.08)' : 'rgba(255,255,255,0.04)',
                                            color:      t.is_system ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                            border:     `1px solid ${t.is_system ? 'rgba(46,204,113,0.20)' : 'rgba(255,255,255,0.08)'}`,
                                        }}
                                    >
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Topluluk oy özeti */}
                        {totalVotes > 0 && (
                            <div
                                className="flex items-center gap-3 pt-4 border-t"
                                style={{ borderColor: 'var(--color-border)' }}
                            >
                                <VoteBar
                                    suspicious={thread.vote_suspicious}
                                    authentic={thread.vote_authentic}
                                    investigate={thread.vote_investigate}
                                    size={2}
                                />
                                <span className="text-[9px] text-muted">
                                    🚩{thread.vote_suspicious} · ✅{thread.vote_authentic} · 🔍{thread.vote_investigate}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Oy butonları - alt bant */}
                    <div
                        className="flex items-center gap-2 px-6 py-4 border-t"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
                    >
                        <span className="text-[9px] text-muted uppercase tracking-wider font-bold mr-1">Oy ver:</span>
                        {VOTE_OPTIONS.map(v => (
                            <button
                                key={v.type}
                                disabled={voting}
                                onClick={() => handleVote(v.type)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold
                                           transition-all duration-150 disabled:opacity-50 hover:scale-[1.03] active:scale-[0.98]"
                                style={{
                                    background: thread.current_user_vote === v.type ? v.activeBg : 'rgba(255,255,255,0.03)',
                                    border:     `1px solid ${thread.current_user_vote === v.type ? v.activeBorder : 'var(--color-border)'}`,
                                    color:      v.color,
                                }}
                            >
                                <span>{v.emoji}</span>
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Yorum Bölümü */}
                <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                >
                    {/* Başlık */}
                    <div
                        className="flex items-center gap-3 px-6 py-4 border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        <span className="text-[11px] font-bold text-tx-primary uppercase tracking-wider">Tartışma</span>
                        <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(46,204,113,0.08)', color: 'var(--color-brand-primary)', border: '1px solid rgba(46,204,113,0.20)' }}
                        >
                            {thread.comment_count} yorum
                        </span>
                    </div>

                    <div className="p-6">
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
                        className="border-t p-6 flex flex-col gap-3"
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        {replyTo && (
                            <div
                                className="flex items-center gap-2 text-[10px] px-3 py-2 rounded-xl"
                                style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.15)' }}
                            >
                                <span className="text-muted">↪ <strong style={{ color: 'var(--color-brand-primary)' }}>{replyTo}</strong> kullanıcısına yanıt</span>
                                <button type="button" onClick={cancelReply} className="ml-auto hover:text-tx-primary">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {moderationWarning && (
                            <div
                                className="rounded-xl p-3 border"
                                style={{ borderColor: 'rgba(245,158,11,0.30)', background: 'rgba(245,158,11,0.08)' }}
                            >
                                <p className="text-xs" style={{ color: 'var(--color-accent-amber)' }}>
                                    Yorumunuz incelemeye alındı. İçeriği düzenleyerek tekrar gönderebilirsiniz.
                                </p>
                            </div>
                        )}

                        <textarea
                            id="comment-input"
                            value={body}
                            onChange={e => { setBody(e.target.value); setModerationWarning(false); }}
                            rows={3}
                            placeholder="Kanıt veya yorumunu ekle..."
                            className="w-full bg-transparent resize-none text-[12px] text-tx-primary placeholder:text-muted outline-none p-3 rounded-xl border transition-colors"
                            style={{
                                borderColor: 'var(--color-border)',
                                background:  'var(--color-bg-base)',
                            }}
                        />

                        {/* Kanıt URL'leri */}
                        {evidenceUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {evidenceUrls.map(url => (
                                    <div
                                        key={url}
                                        className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-lg"
                                        style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.18)' }}
                                    >
                                        <LinkIcon className="w-2.5 h-2.5" />
                                        <span className="max-w-[200px] truncate">{url}</span>
                                        <button type="button" onClick={() => removeUrl(url)}>
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 flex-1">
                                <Search className="w-3 h-3 text-muted flex-shrink-0" />
                                <input
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                                    placeholder="Kaynak linki ekle..."
                                    className="text-[10px] bg-transparent outline-none text-muted placeholder:text-muted flex-1"
                                />
                                {urlInput && (
                                    <button
                                        type="button"
                                        onClick={addUrl}
                                        className="text-[9px] px-2 py-1 rounded-lg"
                                        style={{ background: 'rgba(59,130,246,0.10)', color: 'var(--color-accent-blue)' }}
                                    >
                                        + Ekle
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={!body.trim() || submitting}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                            >
                                <Send className="w-3 h-3" />
                                Gönder
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── Sağ: İstatistik ── */}
            <div className="w-44 flex-shrink-0 flex flex-col gap-3">
                <div
                    className="rounded-2xl border p-4"
                    style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3">
                        Tartışma İstatistikleri
                    </p>
                    <div className="flex flex-col gap-2.5 text-[10px]">
                        <div className="flex justify-between items-center">
                            <span className="text-muted">Toplam Oy</span>
                            <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalVotes}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted">Yorum</span>
                            <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{thread.comment_count}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-muted">Durum</span>
                            <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}
                            >
                                {statusInfo.text}
                            </span>
                        </div>
                    </div>
                </div>

                {thread.article && (
                    <div
                        className="rounded-2xl border p-4"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2">
                            Bağlı Haber
                        </p>
                        <p className="text-[10px] text-muted leading-snug line-clamp-3">
                            {thread.article.title}
                        </p>
                        <Link
                            to={`/forum?article=${thread.article.id}`}
                            className="block mt-2 text-[9px] font-semibold hover:underline"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            Bu haberdeki diğer tartışmalar →
                        </Link>
                    </div>
                )}
            </div>

        </div>
        {showNudge && <LoginNudgeModal onClose={closeNudge} />}
        </>
    );
};

export default ForumThread;
