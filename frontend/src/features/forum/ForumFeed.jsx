import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    MessageSquare,
    Share2, Bookmark, Plus, Edit3, Link as LinkIcon,
    Flag, AlertCircle,
} from 'lucide-react';
import NewsVoteBar    from './NewsVoteBar';
import GeneralVoteBar from './GeneralVoteBar';
import axiosInstance from '../../api/axios';
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
import { useAuth } from '../../contexts/AuthContext';
import CreateThreadModal from './CreateThreadModal';

const STATUS_BADGE = {
    active:       { label: 'Aktif',    color: 'var(--color-brand-primary)', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)' },
    under_review: { label: 'İnceleme', color: 'var(--color-accent-amber)',  bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' },
    resolved:     { label: 'Çözüldü',  color: 'var(--color-accent-blue)',   bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.22)' },
};

const TRUST_CONFIG = [
    { minStars: 4, label: null, color: '#f59e0b',                          bg: 'rgba(245,158,11,0.10)'  },
    { minStars: 2, label: null, color: 'var(--color-brand-primary)',        bg: 'rgba(16,185,129,0.10)'  },
    { minStars: 0, label: 'Yeni Üye', color: 'var(--color-text-muted)',    bg: 'rgba(255,255,255,0.05)' },
];

function getTrustStyle(stars) {
    return TRUST_CONFIG.find(c => (stars ?? 0) >= c.minStars) ?? TRUST_CONFIG[2];
}

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return `${Math.floor(diff)}s`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function VoteBar({ suspicious, authentic, investigate }) {
    const total = suspicious + authentic + investigate || 1;
    return (
        <div className="flex gap-0.5 h-1 rounded-full overflow-hidden w-20">
            <div style={{ flex: suspicious / total, background: 'var(--color-fake-fill)',     minWidth: suspicious  ? 3 : 0 }} />
            <div style={{ flex: authentic  / total, background: 'var(--color-brand-primary)', minWidth: authentic   ? 3 : 0 }} />
            <div style={{ flex: investigate / total, background: 'var(--color-accent-amber)',  minWidth: investigate ? 3 : 0 }} />
        </div>
    );
}

function AuthorAvatar({ username, size = 8 }) {
    const colors = [
        'rgba(16,185,129,0.20)', 'rgba(59,130,246,0.20)',
        'rgba(245,158,11,0.20)', 'rgba(239,68,68,0.20)',
        'rgba(168,85,247,0.20)',
    ];
    const textColors = [
        'var(--color-brand-primary)', 'var(--color-accent-blue)',
        'var(--color-accent-amber)', '#ef4444', '#a855f7',
    ];
    const idx = (username?.charCodeAt(0) ?? 0) % colors.length;
    return (
        <div
            className={`w-${size} h-${size} rounded-full flex items-center justify-center font-black text-sm shrink-0`}
            style={{ background: colors[idx], color: textColors[idx] }}
        >
            {(username ?? '?')[0].toUpperCase()}
        </div>
    );
}

function ThreadCard({ thread }) {
    const { user }     = useAuth();
    const [localThread, setLocalThread] = React.useState(thread);
    const [voting, setVoting] = React.useState(false);
    const [bookmarked, setBookmarked] = React.useState(false);
    const [reportTarget, setReportTarget] = React.useState(null);

    const handleVote = async (voteType) => {
        if (!user || voting) return;
        setVoting(true);
        try {
            const { data } = await axiosInstance.post(
                `/forum/threads/${localThread.id}/vote`,
                { vote_type: voteType }
            );
            setLocalThread(prev => ({
                ...prev,
                vote_suspicious:   data.vote_suspicious,
                vote_authentic:    data.vote_authentic,
                vote_investigate:  data.vote_investigate,
                vote_up:           data.vote_up,
                vote_down:         data.vote_down,
                status:            data.status,
                current_user_vote: data.current_user_vote,
            }));
        } catch { /* sessiz */ }
        finally { setVoting(false); }
    };

    const handleBookmark = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        try {
            await axiosInstance.post(`/forum/threads/${localThread.id}/bookmark`);
            setBookmarked(v => !v);
        } catch { /* sessiz */ }
    };

    const handleShare = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleFlag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        setReportTarget(localThread.id);
    };

    const badge      = STATUS_BADGE[localThread.status] ?? STATUS_BADGE.active;
    const totalVotes = localThread.vote_suspicious + localThread.vote_authentic + localThread.vote_investigate;
    const trust      = getTrustStyle(localThread.author?.stars);

    return (
        <article
            className="rounded-xl transition-all duration-200 group"
            style={{
                background: 'var(--color-bg-surface)',
                boxShadow: '0 2px 14px rgba(0,0,0,0.28)',
            }}
            onMouseEnter={e  => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.42)'; }}
            onMouseLeave={e  => { e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.28)'; }}
        >
            <div className="p-5 flex flex-col gap-3">

                {/* ── Yazar satırı ── */}
                <div className="flex items-center gap-2.5">
                    <AuthorAvatar username={localThread.author?.username} />
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {localThread.author?.username ?? 'Anonim'}
                        </span>
                        {localThread.author?.display_label ? (
                            <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: trust.bg, color: trust.color }}
                            >
                                {'★'.repeat(Math.min(localThread.author.stars ?? 1, 5))} {localThread.author.display_label}
                            </span>
                        ) : (
                            <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
                            >
                                Yeni Üye
                            </span>
                        )}
                        <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                            {timeAgo(localThread.created_at)}
                        </span>
                    </div>
                </div>

                {/* ── Badges ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    {localThread.category && (
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                            style={{
                                background: 'rgba(59,130,246,0.10)',
                                color: 'var(--color-accent-blue)',
                                border: '1px solid rgba(59,130,246,0.20)',
                            }}
                        >
                            {localThread.category}
                        </span>
                    )}
                    <span
                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                    >
                        {badge.label}
                    </span>
                    {localThread.article_id && (
                        <span
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.18)' }}
                        >
                            <LinkIcon className="w-2.5 h-2.5" />
                            Haberle İlişkili
                        </span>
                    )}
                </div>

                {/* ── İçerik (tıklanabilir) ── */}
                <Link to={`/forum/${localThread.id}`} className="flex flex-col gap-2">
                    <h3
                        className="font-manrope font-black text-base leading-snug line-clamp-2 transition-colors group-hover:text-brand"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {localThread.title}
                    </h3>
                    {localThread.body && (
                        <p
                            className="text-sm leading-relaxed line-clamp-2"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {localThread.body}
                        </p>
                    )}
                </Link>

                {/* ── Etiketler ── */}
                {localThread.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {localThread.tags.map(t => (
                            <span
                                key={t.id}
                                className="text-[10px] px-2.5 py-0.5 rounded-full"
                                style={{
                                    background: t.is_system ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                                    color:      t.is_system ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                    border:     `1px solid ${t.is_system ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)'}`,
                                }}
                            >
                                {t.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Alt Bar ── */}
                <div
                    className="flex items-center gap-1 pt-3 flex-wrap"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                    {/* Oy butonları */}
                    {(() => {
                        const isNews = localThread.article_id || localThread.category === 'haberler';
                        return isNews
                            ? <NewsVoteBar    thread={localThread} onVote={(type) => handleVote(type)} disabled={voting} />
                            : <GeneralVoteBar thread={localThread} onVote={(type) => handleVote(type)} disabled={voting} />;
                    })()}

                    {/* Oy dağılım barı */}
                    <div className="flex items-center gap-2 mr-1">
                        <VoteBar
                            suspicious={localThread.vote_suspicious}
                            authentic={localThread.vote_authentic}
                            investigate={localThread.vote_investigate}
                        />
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {totalVotes} oy
                        </span>
                    </div>

                    {/* İncele oy */}
                    {localThread.vote_investigate > 0 && (
                        <button
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-accent-amber)' }}
                            onClick={e => e.preventDefault()}
                        >
                            <AlertCircle className="w-3 h-3" />
                            {localThread.vote_investigate} şüpheli
                        </button>
                    )}

                    {/* Yorumlar */}
                    <Link
                        to={`/forum/${localThread.id}`}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {localThread.comment_count} yorum
                    </Link>

                    <div className="flex items-center gap-1 ml-auto">
                        <button
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={handleShare}
                        >
                            <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors hover:bg-white/5"
                            style={{ color: bookmarked ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
                            onClick={handleBookmark}
                        >
                            <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors hover:text-red-400 hover:bg-white/5"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={handleFlag}
                        >
                            <Flag className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {reportTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.65)' }}
                    onClick={e => { e.stopPropagation(); setReportTarget(null); }}
                >
                    <div
                        className="rounded-2xl p-6 w-80 border"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                            Tartışmayı Bildir
                        </p>
                        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                            Bu tartışmayı neden bildiriyorsunuz?
                        </p>
                        <button
                            onClick={() => {
                                axiosInstance.post(`/forum/threads/${reportTarget}/report`, { reason: 'spam' })
                                    .catch(() => {});
                                setReportTarget(null);
                            }}
                            className="w-full py-2 rounded-xl text-xs font-bold"
                            style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                        >
                            Bildir
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

const ForumFeed = () => {
    const { user }          = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const category  = searchParams.get('category') ?? '';
    const tag       = searchParams.get('tag')      ?? '';
    const sort      = searchParams.get('sort')     ?? 'hot';

    const [threads,   setThreads]   = React.useState([]);
    const [total,     setTotal]     = React.useState(0);
    const [page,      setPage]      = React.useState(1);
    const [loading,   setLoading]   = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);
    const [showNudge, closeNudge]   = useLoginNudge();

    const SIZE = 20;

    const load = React.useCallback(async (pg = 1) => {
        setLoading(true);
        try {
            const params = { sort, page: pg, size: SIZE };
            if (category) params.category = category;
            if (tag)      params.tag      = tag;
            const { data } = await axiosInstance.get('/forum/threads', { params });
            setThreads(data.items);
            setTotal(data.total);
            setPage(data.page);
        } catch { /* sessiz */ }
        finally { setLoading(false); }
    }, [sort, category, tag]);

    React.useEffect(() => { load(1); }, [load]);

    const totalPages = Math.ceil(total / SIZE);

    return (
        <>
        <div className="flex flex-col gap-4">

            {/* ── Tartışma başlat çubuğu ── */}
            <div
                className="rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all group"
                style={{ background: 'var(--color-bg-surface)', boxShadow: '0 2px 14px rgba(0,0,0,0.25)' }}
                onClick={() => setShowModal(true)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.38)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.25)'; }}
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)' }}
                >
                    {user?.username?.[0]?.toUpperCase() ?? <Edit3 className="w-4 h-4" />}
                </div>
                <div
                    className="flex-1 rounded-full px-4 py-2.5 text-sm pointer-events-none select-none"
                    style={{
                        background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    Yeni bir tartışma başlat veya iddia paylaş...
                </div>
                <button
                    className="p-2.5 rounded-full transition-colors"
                    style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-brand-primary)' }}
                    onClick={e => { e.stopPropagation(); setShowModal(true); }}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* ── Başlık ── */}
            <div className="flex items-center gap-2">
                <h1 className="text-base font-manrope font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {category
                        ? `${category.charAt(0).toUpperCase() + category.slice(1)} Tartışmaları`
                        : tag ? tag : 'Tüm Tartışmalar'}
                </h1>
                {total > 0 && (
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        ({total})
                    </span>
                )}
            </div>

            {/* ── Aktif filtreler ── */}
            {(category || tag) && (
                <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>Filtre:</span>
                    {category && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(59,130,246,0.10)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.20)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.22)' }}
                        >
                            {tag} ✕
                        </button>
                    )}
                </div>
            )}

            {/* ── Thread listesi ── */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-36 rounded-xl animate-shimmer"
                             style={{ background: 'var(--color-skeleton)' }} />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-24" style={{ color: 'var(--color-text-muted)' }}>
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Henüz tartışma yok.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((t, i) => (
                        <div key={t.id} className="animate-fade-up"
                             style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                            <ThreadCard thread={t} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Sayfalama ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => load(page - 1)}
                        className="px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-white/5"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                        ← Önceki
                    </button>
                    <span className="text-xs font-medium px-3" style={{ color: 'var(--color-text-muted)' }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => load(page + 1)}
                        className="px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-white/5"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                        Sonraki →
                    </button>
                </div>
            )}
        </div>

        {showModal && <CreateThreadModal onClose={() => setShowModal(false)} />}
        {showNudge && <LoginNudgeModal onClose={closeNudge} />}
        </>
    );
};

export default ForumFeed;
