import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Flame, Clock, Zap, MessageSquare,
    Search, ChevronUp, ChevronDown,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import LoginNudgeModal, { useLoginNudge } from '../../components/ui/LoginNudgeModal';

const SORT_OPTIONS = [
    { key: 'hot',          label: 'Popüler',    Icon: Flame },
    { key: 'new',          label: 'Yeni',       Icon: Clock },
    { key: 'controversial', label: 'Tartışmalı', Icon: Zap },
];

const STATUS_BADGE = {
    active:       { label: 'Aktif',    color: 'var(--color-brand-primary)', bg: 'rgba(46,204,113,0.08)' },
    under_review: { label: 'İnceleme', color: 'var(--color-accent-amber)',  bg: 'rgba(245,158,11,0.08)' },
    resolved:     { label: 'Çözüldü',  color: 'var(--color-accent-blue)',   bg: 'rgba(59,130,246,0.08)' },
};

function VoteBar({ suspicious, authentic, investigate }) {
    const total = suspicious + authentic + investigate || 1;
    return (
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-20">
            <div style={{ flex: suspicious / total, background: 'var(--color-fake-fill)',     minWidth: suspicious  ? 2 : 0 }} />
            <div style={{ flex: authentic  / total, background: 'var(--color-brand-primary)', minWidth: authentic   ? 2 : 0 }} />
            <div style={{ flex: investigate / total, background: 'var(--color-accent-amber)', minWidth: investigate ? 2 : 0 }} />
        </div>
    );
}

function ThreadCard({ thread }) {
    const badge = STATUS_BADGE[thread.status] ?? STATUS_BADGE.active;
    const totalVotes = thread.vote_suspicious + thread.vote_authentic + thread.vote_investigate;

    return (
        <Link
            to={`/forum/${thread.id}`}
            className="block rounded-2xl border transition-all duration-200 hover:border-brand/30 hover:shadow-xl hover:-translate-y-0.5 group"
            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
        >
            <div className="flex p-6 gap-4">
                {/* Sol: Oy sayacı */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <div
                        className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl"
                        style={{
                            background: 'var(--color-bg-base)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <ChevronUp
                            className="w-3.5 h-3.5"
                            style={{ color: 'var(--color-brand-primary)' }}
                        />
                        <span
                            className="text-[11px] font-bold font-manrope tabular-nums min-w-[2.5ch] text-center"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {totalVotes >= 1000 ? `${(totalVotes / 1000).toFixed(1)}k` : totalVotes}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-20" />
                    </div>
                </div>

                {/* Sağ: İçerik */}
                <div className="flex-1 min-w-0">
                    {/* Üst satır: kategori + durum + yazar + tarih */}
                    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        {thread.category && (
                            <span
                                className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                style={{
                                    background: 'rgba(59,130,246,0.08)',
                                    color:      'var(--color-accent-blue)',
                                    border:     '1px solid rgba(59,130,246,0.18)',
                                }}
                            >
                                {thread.category}
                            </span>
                        )}
                        <span
                            className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                            style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}30` }}
                        >
                            {badge.label}
                        </span>
                        <span className="text-[9px] text-muted ml-auto flex-shrink-0">
                            {thread.author?.username} · {new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>

                    {/* Başlık */}
                    <h3
                        className="text-[15px] font-bold font-manrope leading-snug mb-2.5 line-clamp-2 group-hover:text-brand transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {thread.title}
                    </h3>

                    {/* Etiketler */}
                    {thread.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {thread.tags.slice(0, 4).map(t => (
                                <span
                                    key={t.id}
                                    className="text-[9px] px-2 py-0.5 rounded-full"
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

                    {/* Alt satır: oy bar + yorum sayısı */}
                    <div
                        className="flex items-center gap-3 pt-3 border-t"
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        <VoteBar
                            suspicious={thread.vote_suspicious}
                            authentic={thread.vote_authentic}
                            investigate={thread.vote_investigate}
                        />
                        <span className="text-[9px] text-muted">{totalVotes} oy</span>
                        <span className="flex items-center gap-1 text-[9px] text-muted ml-auto">
                            <MessageSquare className="w-3 h-3" />
                            {thread.comment_count} yorum
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

const ForumFeed = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') ?? '';
    const tag      = searchParams.get('tag') ?? '';
    const sort     = searchParams.get('sort') ?? 'hot';

    const [threads,   setThreads]   = React.useState([]);
    const [total,     setTotal]     = React.useState(0);
    const [page,      setPage]      = React.useState(1);
    const [loading,   setLoading]   = React.useState(false);
    const [tagSearch, setTagSearch] = React.useState(tag);
    const [showNudge, closeNudge]   = useLoginNudge();

    const SIZE = 20;

    const load = React.useCallback(async (pg = 1) => {
        setLoading(true);
        try {
            const params = { sort, page: pg, size: SIZE };
            if (category) params.category = category;
            if (tag)      params.tag = tag;
            const { data } = await axiosInstance.get('/forum/threads', { params });
            setThreads(data.items);
            setTotal(data.total);
            setPage(data.page);
        } catch {
            // sessiz hata
        } finally {
            setLoading(false);
        }
    }, [sort, category, tag]);

    React.useEffect(() => { load(1); }, [load]);

    const setSort = (s) => {
        const next = new URLSearchParams(searchParams);
        next.set('sort', s);
        setSearchParams(next);
    };

    const applyTagSearch = (e) => {
        e.preventDefault();
        const next = new URLSearchParams(searchParams);
        if (tagSearch.trim()) next.set('tag', tagSearch.trim());
        else                  next.delete('tag');
        setSearchParams(next);
    };

    const totalPages = Math.ceil(total / SIZE);

    return (
        <>
        <div className="max-w-2xl mx-auto flex flex-col gap-5">

            {/* Başlık + Etiket arama */}
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-manrope flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    {category
                        ? `${category.charAt(0).toUpperCase() + category.slice(1)} Tartışmaları`
                        : tag ? tag : 'Tüm Tartışmalar'}
                </h1>
                <form onSubmit={applyTagSearch}>
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px]"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <Search className="w-3 h-3 text-muted flex-shrink-0" />
                        <input
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            placeholder="Etiket ara..."
                            className="bg-transparent outline-none text-tx-primary w-28 placeholder:text-muted"
                        />
                    </div>
                </form>
            </div>

            {/* Sıralama sekmeleri */}
            <div
                className="flex items-center gap-1 p-1 rounded-xl border w-fit"
                style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
            >
                {SORT_OPTIONS.map((opt) => (
                    <button
                        key={opt.key}
                        onClick={() => setSort(opt.key)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                        style={sort === opt.key
                            ? { background: 'rgba(46,204,113,0.12)', color: 'var(--color-brand-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                            : { color: 'var(--color-text-muted)' }
                        }
                    >
                        <opt.Icon className="w-3 h-3" />
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Aktif filtreler */}
            {(category || tag) && (
                <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted">Filtre:</span>
                    {category && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.18)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setTagSearch(''); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(46,204,113,0.08)', color: 'var(--color-brand-primary)', border: '1px solid rgba(46,204,113,0.20)' }}
                        >
                            {tag} ✕
                        </button>
                    )}
                </div>
            )}

            {/* Thread listesi */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="h-28 rounded-2xl border animate-pulse"
                            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                        />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-16 text-muted text-sm">
                    Henüz tartışma yok.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((t, i) => (
                        <div
                            key={t.id}
                            className="animate-fade-up"
                            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                        >
                            <ThreadCard thread={t} />
                        </div>
                    ))}
                </div>
            )}

            {/* Sayfalama */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => load(page - 1)}
                        className="px-4 py-2 rounded-xl border text-[11px] font-semibold disabled:opacity-30 hover:border-brand/30 transition-colors"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-bg-surface)' }}
                    >
                        ← Önceki
                    </button>
                    <span className="text-[11px] text-muted px-2">{page} / {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => load(page + 1)}
                        className="px-4 py-2 rounded-xl border text-[11px] font-semibold disabled:opacity-30 hover:border-brand/30 transition-colors"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-bg-surface)' }}
                    >
                        Sonraki →
                    </button>
                </div>
            )}

        </div>
        {showNudge && <LoginNudgeModal onClose={closeNudge} />}
        </>
    );
};

export default ForumFeed;
