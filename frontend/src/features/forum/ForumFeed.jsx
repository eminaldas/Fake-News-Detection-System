import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Flame, Clock, Zap, MessageSquare,
    Search,
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
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-16">
            <div style={{ flex: suspicious / total, background: 'var(--color-fake-fill)', minWidth: suspicious ? 2 : 0 }} />
            <div style={{ flex: authentic  / total, background: 'var(--color-brand-primary)', minWidth: authentic ? 2 : 0 }} />
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
            className="block rounded-xl border p-4 transition-all duration-200 hover:border-brand/25 hover:shadow-sm"
            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
        >
            {/* Üst satır: kategori, durum, tarih */}
            <div className="flex items-center gap-2 mb-2">
                {thread.category && (
                    <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
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
                    className="text-[9px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}30` }}
                >
                    {badge.label}
                </span>
                <span className="text-[9px] text-muted ml-auto">
                    {thread.author?.username}
                </span>
                <span className="text-[9px] text-muted">
                    {new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
            </div>

            {/* Başlık */}
            <h3 className="text-[13px] font-semibold text-tx-primary leading-snug mb-2 line-clamp-2">
                {thread.title}
            </h3>

            {/* Etiketler */}
            {thread.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {thread.tags.map(t => (
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

            {/* Alt satır: oy bar + sayılar + yorum sayısı */}
            <div className="flex items-center gap-3 text-[10px] text-muted">
                <VoteBar
                    suspicious={thread.vote_suspicious}
                    authentic={thread.vote_authentic}
                    investigate={thread.vote_investigate}
                />
                <span>{totalVotes} oy</span>
                <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {thread.comment_count}
                </span>
            </div>
        </Link>
    );
}

const ForumFeed = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') ?? '';
    const tag      = searchParams.get('tag') ?? '';
    const sort     = searchParams.get('sort') ?? 'hot';

    const [threads, setThreads] = React.useState([]);
    const [total,   setTotal]   = React.useState(0);
    const [page,    setPage]    = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const [tagSearch, setTagSearch] = React.useState(tag);
    const [showNudge, closeNudge] = useLoginNudge();

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

    React.useEffect(() => {
        load(1);
    }, [load]);

    const setSort = (s) => {
        const next = new URLSearchParams(searchParams);
        next.set('sort', s);
        setSearchParams(next);
    };

    const applyTagSearch = (e) => {
        e.preventDefault();
        const next = new URLSearchParams(searchParams);
        if (tagSearch.trim()) {
            next.set('tag', tagSearch.trim());
        } else {
            next.delete('tag');
        }
        setSearchParams(next);
    };

    const totalPages = Math.ceil(total / SIZE);

    return (
        <>
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

            {/* Başlık + Etiket arama */}
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-tx-primary flex-1">
                    {category
                        ? `${category.charAt(0).toUpperCase() + category.slice(1)} Tartışmaları`
                        : tag
                            ? `${tag}`
                            : 'Tüm Tartışmalar'}
                </h1>
                <form onSubmit={applyTagSearch} className="flex items-center gap-2">
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px]"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
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
                className="flex items-center gap-1 p-1 rounded-lg border w-fit"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
                {SORT_OPTIONS.map((opt) => (
                    <button
                        key={opt.key}
                        onClick={() => setSort(opt.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                        style={sort === opt.key
                            ? { background: 'rgba(46,204,113,0.10)', color: 'var(--color-brand-primary)' }
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
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.18)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setTagSearch(''); setSearchParams(n); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
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
                            className="h-24 rounded-xl border animate-pulse"
                            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
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
                        className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-30"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                    >
                        ← Önceki
                    </button>
                    <span className="text-[11px] text-muted">
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => load(page + 1)}
                        className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-30"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
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
