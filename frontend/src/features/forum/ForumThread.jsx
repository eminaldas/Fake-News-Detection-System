import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, Send, Link as LinkIcon, X } from 'lucide-react';
import axiosInstance from '../../api/axios';
import ForumCommentTree from './ForumCommentTree';

const VOTE_OPTIONS = [
    { type: 'suspicious',  label: 'Şüpheli',  emoji: '🚩', color: '#ff6b6b' },
    { type: 'authentic',   label: 'Doğru',    emoji: '✅', color: '#3fff8b' },
    { type: 'investigate', label: 'İncele',   emoji: '🔍', color: '#ffd700' },
];

const STATUS_LABEL = {
    active:       { text: 'Aktif',    color: 'var(--color-brand)' },
    under_review: { text: 'İnceleme Altında', color: '#ffd700' },
    resolved:     { text: 'Çözüldü', color: '#60a5fa' },
};

function VoteBar({ suspicious, authentic, investigate, size = 4 }) {
    const total = suspicious + authentic + investigate || 1;
    return (
        <div className={`flex gap-0.5 h-${size} rounded-full overflow-hidden`}>
            <div style={{ flex: suspicious / total, background: '#ff6b6b', minWidth: suspicious ? 2 : 0 }} />
            <div style={{ flex: authentic  / total, background: '#3fff8b', minWidth: authentic ? 2 : 0 }} />
            <div style={{ flex: investigate / total, background: '#ffd700', minWidth: investigate ? 2 : 0 }} />
        </div>
    );
}

const ForumThread = () => {
    const { threadId } = useParams();
    const [thread,   setThread]   = React.useState(null);
    const [loading,  setLoading]  = React.useState(true);
    const [voting,   setVoting]   = React.useState(false);

    // Yorum formu
    const [body,         setBody]         = React.useState('');
    const [parentId,     setParentId]     = React.useState(null);
    const [replyTo,      setReplyTo]      = React.useState(null); // username
    const [evidenceUrls, setEvidenceUrls] = React.useState([]);
    const [urlInput,     setUrlInput]     = React.useState('');
    const [submitting,   setSubmitting]   = React.useState(false);

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

    const handleVote = async (voteType) => {
        if (voting) return;
        setVoting(true);
        try {
            const { data } = await axiosInstance.post(`/forum/threads/${threadId}/vote`, { vote_type: voteType });
            setThread(prev => ({
                ...prev,
                vote_suspicious:  data.vote_suspicious,
                vote_authentic:   data.vote_authentic,
                vote_investigate: data.vote_investigate,
                status:           data.status,
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

    const cancelReply = () => {
        setParentId(null);
        setReplyTo(null);
    };

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
            await axiosInstance.post(`/forum/threads/${threadId}/comments`, {
                body: body.trim(),
                parent_id: parentId ?? undefined,
                evidence_urls: evidenceUrls,
            });
            setBody('');
            setParentId(null);
            setReplyTo(null);
            setEvidenceUrls([]);
            await load();
        } catch {
            // sessiz hata
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 rounded-xl border animate-pulse"
                            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (!thread) {
        return <p className="text-muted text-sm text-center py-16">Tartışma bulunamadı.</p>;
    }

    const totalVotes = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;
    const statusInfo = STATUS_LABEL[thread.status] ?? STATUS_LABEL.active;

    return (
        <div className="flex gap-4 items-start">

            {/* ── Sol: Ana içerik ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">

                {/* Haber Özeti Kartı */}
                <div
                    className="rounded-xl border p-4"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                    {/* Başlık + meta */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            {thread.article && (
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[9px] text-muted">
                                        {thread.article.source_domain}
                                    </span>
                                    <span
                                        className="text-[9px] font-bold px-2 py-0.5 rounded"
                                        style={{
                                            background: thread.article.ai_verdict === 'FAKE'
                                                ? 'rgba(255,107,107,0.1)' : 'rgba(63,255,139,0.1)',
                                            color: thread.article.ai_verdict === 'FAKE' ? '#ff6b6b' : '#3fff8b',
                                        }}
                                    >
                                        AI: {thread.article.ai_verdict === 'FAKE'
                                            ? `%${Math.round(thread.article.confidence * 100)} Yanıltıcı`
                                            : `%${Math.round(thread.article.confidence * 100)} Güvenilir`}
                                    </span>
                                </div>
                            )}
                            <h2 className="text-[14px] font-bold text-tx-primary leading-snug">
                                {thread.title}
                            </h2>
                            <p className="text-[11px] text-muted mt-1">
                                {thread.author?.username} ·{' '}
                                {new Date(thread.created_at).toLocaleDateString('tr-TR', {
                                    day: 'numeric', month: 'long', year: 'numeric',
                                })}
                            </p>
                        </div>

                        {/* Oy butonları */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                            {VOTE_OPTIONS.map(v => (
                                <button
                                    key={v.type}
                                    disabled={voting}
                                    onClick={() => handleVote(v.type)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                                    style={{
                                        background: thread.current_user_vote === v.type
                                            ? `${v.color}22` : 'rgba(255,255,255,0.03)',
                                        border:     `1px solid ${thread.current_user_vote === v.type
                                            ? `${v.color}60` : 'rgba(255,255,255,0.08)'}`,
                                        color: v.color,
                                    }}
                                >
                                    <span>{v.emoji}</span>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topluluk oy özeti */}
                    {totalVotes > 0 && (
                        <div className="flex items-center gap-3 mb-3">
                            <VoteBar
                                suspicious={thread.vote_suspicious}
                                authentic={thread.vote_authentic}
                                investigate={thread.vote_investigate}
                                size={1}
                            />
                            <span className="text-[9px] text-muted">
                                🚩{thread.vote_suspicious} · ✅{thread.vote_authentic} · 🔍{thread.vote_investigate}
                            </span>
                            <span
                                className="text-[9px] font-semibold ml-auto px-2 py-0.5 rounded"
                                style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}
                            >
                                {statusInfo.text}
                            </span>
                        </div>
                    )}

                    {/* Under review uyarısı */}
                    {thread.status === 'under_review' && (
                        <div
                            className="flex items-center gap-2 p-2.5 rounded-lg text-[10px]"
                            style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}
                        >
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ffd700' }} />
                            <span style={{ color: '#ffd700' }}>
                                Topluluk kararı AI kararıyla çelişiyor — <strong>İnceleme Altında</strong>
                            </span>
                        </div>
                    )}

                    {/* Thread açılış metni */}
                    <p className="text-[12px] text-tx-secondary leading-relaxed mt-3">
                        {thread.body}
                    </p>

                    {/* Etiketler */}
                    {thread.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {thread.tags.map(t => (
                                <span
                                    key={t.id}
                                    className="text-[9px] px-2 py-0.5 rounded-full"
                                    style={{
                                        background: t.is_system ? 'rgba(63,255,139,0.08)' : 'rgba(255,255,255,0.04)',
                                        color:      t.is_system ? 'var(--color-brand)'     : 'var(--color-muted)',
                                        border:     `1px solid ${t.is_system ? 'rgba(63,255,139,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                    }}
                                >
                                    {t.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Yorum Bölümü */}
                <div
                    className="rounded-xl border overflow-hidden"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-2.5 border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                            {thread.comment_count} Yorum
                        </span>
                    </div>

                    <div className="p-4">
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
                        className="border-t p-4 flex flex-col gap-2"
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        {replyTo && (
                            <div className="flex items-center gap-2 text-[10px] text-muted">
                                <span>↪ <strong className="text-brand">{replyTo}</strong> kullanıcısına yanıt</span>
                                <button type="button" onClick={cancelReply} className="ml-auto hover:text-tx-primary">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        <textarea
                            id="comment-input"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={3}
                            placeholder="Kanıt veya yorumunu ekle..."
                            className="w-full bg-transparent resize-none text-[12px] text-tx-primary placeholder:text-muted outline-none p-3 rounded-lg border"
                            style={{ borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}
                        />

                        {/* Kanıt URL'leri */}
                        {evidenceUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {evidenceUrls.map(url => (
                                    <div
                                        key={url}
                                        className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded"
                                        style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
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
                                        className="text-[9px] px-2 py-1 rounded"
                                        style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}
                                    >
                                        + Ekle
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={!body.trim() || submitting}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 transition-opacity"
                                style={{ background: 'var(--color-brand)', color: '#070f12' }}
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
                    className="rounded-xl border p-3"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3">
                        Tartışma İstatistikleri
                    </p>
                    <div className="flex flex-col gap-2 text-[10px]">
                        <div className="flex justify-between">
                            <span className="text-muted">Toplam Oy</span>
                            <span className="text-tx-primary font-semibold">{totalVotes}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Yorum</span>
                            <span className="text-tx-primary font-semibold">{thread.comment_count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Durum</span>
                            <span className="font-semibold" style={{ color: statusInfo.color }}>
                                {statusInfo.text}
                            </span>
                        </div>
                    </div>
                </div>

                {thread.article && (
                    <div
                        className="rounded-xl border p-3"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2">
                            Bağlı Haber
                        </p>
                        <p className="text-[10px] text-muted leading-snug line-clamp-3">
                            {thread.article.title}
                        </p>
                        <Link
                            to={`/forum?article=${thread.article.id}`}
                            className="block mt-2 text-[9px] text-brand hover:underline"
                        >
                            Bu haberdeki diğer tartışmalar →
                        </Link>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ForumThread;
