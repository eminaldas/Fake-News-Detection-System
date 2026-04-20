import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Search, ChevronUp, ChevronDown, Share2, Bookmark, Plus, Edit3 } from 'lucide-react';
import axiosInstance from '../../api/axios';
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';
import { useAuth } from '../../contexts/AuthContext';
import CreateThreadModal from './CreateThreadModal';

const STATUS_BADGE = {
    active:       { label: 'Aktif',    color: 'var(--color-brand-primary)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.20)' },
    under_review: { label: 'İnceleme', color: 'var(--color-accent-amber)',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.20)' },
    resolved:     { label: 'Çözüldü',  color: 'var(--color-accent-blue)',   bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.20)' },
};

function VoteBar({ suspicious, authentic, investigate }) {
    const total = suspicious + authentic + investigate || 1;
    return (
        <div className="flex gap-0.5 h-1 rounded-full overflow-hidden w-16">
            <div style={{ flex: suspicious / total, background: 'var(--color-fake-fill)',     minWidth: suspicious  ? 2 : 0 }} />
            <div style={{ flex: authentic  / total, background: 'var(--color-brand-primary)', minWidth: authentic   ? 2 : 0 }} />
            <div style={{ flex: investigate / total, background: 'var(--color-accent-amber)',  minWidth: investigate ? 2 : 0 }} />
        </div>
    );
}

function ThreadCard({ thread }) {
    const badge      = STATUS_BADGE[thread.status] ?? STATUS_BADGE.active;
    const totalVotes = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;
    const date       = new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

    return (
        <article
            className="rounded-xl transition-all duration-200 group"
            style={{
                background: 'var(--color-bg-surface)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.40)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)';
            }}
        >
            <div className="p-5 flex gap-4">

                {/* Dikey oy widget */}
                <div
                    className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 flex-shrink-0 h-fit"
                    style={{ background: 'rgba(0,0,0,0.20)' }}
                >
                    <button
                        className="transition-transform hover:scale-110 active:scale-95"
                        style={{ color: 'var(--color-brand-primary)' }}
                        onClick={e => e.preventDefault()}
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black font-manrope" style={{ color: 'var(--color-text-primary)' }}>
                        {totalVotes > 999 ? `${(totalVotes / 1000).toFixed(1)}k` : totalVotes}
                    </span>
                    <button
                        className="transition-transform hover:scale-110 active:scale-95"
                        style={{ color: 'var(--color-text-muted)' }}
                        onClick={e => e.preventDefault()}
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>

                {/* İçerik */}
                <Link to={`/forum/${thread.id}`} className="flex-1 min-w-0 flex flex-col gap-2.5">

                    {/* Üst satır */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {thread.category && (
                            <span
                                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                style={{
                                    background: 'rgba(59,130,246,0.08)',
                                    color: 'var(--color-accent-blue)',
                                    border: '1px solid rgba(59,130,246,0.18)',
                                }}
                            >
                                {thread.category}
                            </span>
                        )}
                        <span
                            className="text-[9px] font-semibold px-2 py-0.5 rounded"
                            style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                        >
                            {badge.label}
                        </span>
                        <span className="text-[9px] ml-auto font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            {thread.author?.username}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>· {date}</span>
                    </div>

                    {/* Başlık */}
                    <h3
                        className="font-manrope font-bold text-[15px] leading-snug line-clamp-2 transition-colors group-hover:text-brand"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {thread.title}
                    </h3>

                    {/* Etiketler */}
                    {thread.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {thread.tags.map(t => (
                                <span
                                    key={t.id}
                                    className="text-[9px] px-2 py-0.5 rounded"
                                    style={{
                                        background: t.is_system ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.04)',
                                        color:      t.is_system ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                        border:     `1px solid ${t.is_system ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)'}`,
                                    }}
                                >
                                    {t.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Alt satır */}
                    <div className="flex items-center gap-4 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <button
                            className="flex items-center gap-1.5 transition-colors hover:text-brand"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={e => e.preventDefault()}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold">{thread.comment_count} yorum</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <VoteBar
                                suspicious={thread.vote_suspicious}
                                authentic={thread.vote_authentic}
                                investigate={thread.vote_investigate}
                            />
                            <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                {totalVotes} oy
                            </span>
                        </div>

                        <button
                            className="ml-auto flex items-center gap-1.5 transition-colors hover:text-brand"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={e => e.preventDefault()}
                        >
                            <Share2 className="w-3 h-3" />
                            <span className="text-[10px]">Paylaş</span>
                        </button>

                        <button
                            className="flex items-center gap-1.5 transition-colors hover:text-brand"
                            style={{ color: 'var(--color-text-muted)' }}
                            onClick={e => e.preventDefault()}
                        >
                            <Bookmark className="w-3 h-3" />
                            <span className="text-[10px]">Kaydet</span>
                        </button>
                    </div>
                </Link>
            </div>
        </article>
    );
}

const ForumFeed = () => {
    const { user }          = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const category  = searchParams.get('category') ?? '';
    const tag       = searchParams.get('tag')      ?? '';
    const sort      = searchParams.get('sort')     ?? 'hot';

    const [threads,     setThreads]     = React.useState([]);
    const [total,       setTotal]       = React.useState(0);
    const [page,        setPage]        = React.useState(1);
    const [loading,     setLoading]     = React.useState(false);
    const [tagSearch,   setTagSearch]   = React.useState(tag);
    const [showModal,   setShowModal]   = React.useState(false);
    const [showNudge,   closeNudge]     = useLoginNudge();

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
        } catch { /* sessiz hata */ }
        finally { setLoading(false); }
    }, [sort, category, tag]);

    React.useEffect(() => { load(1); }, [load]);

    const applyTagSearch = (e) => {
        e.preventDefault();
        const next = new URLSearchParams(searchParams);
        if (tagSearch.trim()) next.set('tag', tagSearch.trim());
        else next.delete('tag');
        setSearchParams(next);
    };

    const totalPages = Math.ceil(total / SIZE);

    return (
        <>
        <div className="flex flex-col gap-5">

            {/* ── Tartışma başlat çubuğu ── */}
            <div
                className="rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
                style={{
                    background: 'var(--color-bg-surface)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
                }}
                onClick={() => setShowModal(true)}
            >
                {/* Avatar */}
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-manrope font-black text-sm flex-shrink-0"
                    style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)' }}
                >
                    {user?.username?.[0]?.toUpperCase() ?? <Edit3 className="w-4 h-4" />}
                </div>

                {/* Placeholder */}
                <div
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm pointer-events-none select-none"
                    style={{
                        background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    Yeni bir tartışma başlat veya iddia paylaş...
                </div>

                {/* + butonu */}
                <button
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-brand-primary)' }}
                    onClick={e => { e.stopPropagation(); setShowModal(true); }}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* ── Başlık + Etiket arama ── */}
            <div className="flex items-center gap-3">
                <h1 className="text-base font-manrope font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    {category
                        ? `${category.charAt(0).toUpperCase() + category.slice(1)} Tartışmaları`
                        : tag ? tag : 'Tüm Tartışmalar'}
                </h1>
                <form onSubmit={applyTagSearch}>
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px]"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <Search className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            placeholder="Etiket ara..."
                            className="bg-transparent outline-none w-24"
                            style={{ color: 'var(--color-text-primary)' }}
                        />
                    </div>
                </form>
            </div>

            {/* ── Aktif filtreler ── */}
            {(category || tag) && (
                <div className="flex items-center gap-2 text-[10px]">
                    <span style={{ color: 'var(--color-text-muted)' }}>Filtre:</span>
                    {category && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded"
                            style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.18)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setTagSearch(''); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded"
                            style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--color-brand-primary)', border: '1px solid rgba(16,185,129,0.20)' }}
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
                        <div
                            key={i}
                            className="h-28 rounded-xl border animate-shimmer"
                            style={{ background: 'var(--color-skeleton)', borderColor: 'var(--color-border)' }}
                        />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-20 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Henüz tartışma yok.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((t, i) => (
                        <div
                            key={t.id}
                            className="animate-fade-up"
                            style={{ animationDelay: `${i * 35}ms`, animationFillMode: 'both' }}
                        >
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
                        className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-30 transition-opacity"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                        ← Önceki
                    </button>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => load(page + 1)}
                        className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-30 transition-opacity"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                        Sonraki →
                    </button>
                </div>
            )}
        </div>

        {/* Modal */}
        {showModal && <CreateThreadModal onClose={() => setShowModal(false)} />}

        {showNudge && <LoginNudgeModal onClose={closeNudge} />}
        </>
    );
};

export default ForumFeed;
