import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MessageSquare } from 'lucide-react';
import axiosInstance from '../api/axios';

/* ── Basit thread kartı (kaydedilenler için) ─────────────────── */
function BookmarkThreadCard({ thread }) {
    function timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60)     return `${Math.floor(diff)}s`;
        if (diff < 3600)   return `${Math.floor(diff / 60)}dk`;
        if (diff < 86400)  return `${Math.floor(diff / 3600)}sa`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }

    const colors = [
        'rgba(16,185,129,0.20)', 'rgba(59,130,246,0.20)',
        'rgba(245,158,11,0.20)', 'rgba(239,68,68,0.20)',
        'rgba(168,85,247,0.20)',
    ];
    const textColors = [
        'var(--color-brand-primary)', 'var(--color-accent-blue)',
        'var(--color-accent-amber)', '#ef4444', '#a855f7',
    ];
    const username = thread.author?.username ?? '';
    const idx = (username.charCodeAt(0) ?? 0) % colors.length;

    return (
        <article
            className="rounded-xl p-5 transition-all duration-200"
            style={{
                background: 'var(--color-bg-surface)',
                boxShadow: '0 2px 14px rgba(0,0,0,0.28)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.42)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.28)'; }}
        >
            <div className="flex flex-col gap-2">

                {/* Yazar + kategori */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                        style={{ background: colors[idx], color: textColors[idx] }}
                    >
                        {(username || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        {username || 'Anonim'}
                    </span>
                    {thread.category && (
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ml-1"
                            style={{
                                background: 'rgba(59,130,246,0.10)',
                                color: 'var(--color-accent-blue)',
                                border: '1px solid rgba(59,130,246,0.20)',
                            }}
                        >
                            {thread.category}
                        </span>
                    )}
                </div>

                {/* Başlık + özet */}
                <Link to={`/forum/${thread.id}`}>
                    <h3
                        className="font-manrope font-black text-base leading-snug line-clamp-2 hover:text-brand transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {thread.title}
                    </h3>
                </Link>
                {thread.body && (
                    <p
                        className="text-sm leading-relaxed line-clamp-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {thread.body}
                    </p>
                )}

                {/* Alt bar */}
                <div
                    className="flex items-center gap-3 pt-2 text-xs"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
                >
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {thread.comment_count ?? 0} yorum
                    </span>
                    <span className="ml-auto">{timeAgo(thread.created_at)}</span>
                </div>
            </div>
        </article>
    );
}

/* ── Spinner ─────────────────────────────────────────────────── */
function Spinner() {
    return (
        <div className="flex items-center justify-center py-24 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Yükleniyor...</span>
        </div>
    );
}

/* ── Ana sayfa ────────────────────────────────────────────────── */
export default function Bookmarks() {
    const [threads,  setThreads]  = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);

    const SIZE = 20;

    const load = useCallback((pg = 1) => {
        setLoading(true);
        setError(null);
        axiosInstance.get('/forum/bookmarks/me', { params: { page: pg, size: SIZE } })
            .then(({ data }) => {
                setThreads(data.items ?? []);
                setTotal(data.total ?? 0);
                setPage(pg);
            })
            .catch(() => setError('Kaydedilenler yüklenemedi.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(1); }, [load]);

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">

            {/* ── Başlık ── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-px" style={{ background: 'var(--color-brand-primary)' }} />
                    <span
                        className="text-[10px] uppercase tracking-[0.25em] font-bold"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        Kaydettiklerim
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold font-manrope tracking-tight leading-none"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Kaydedilenler<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
                </h1>
            </div>

            {/* ── İçerik ── */}
            {loading ? (
                <Spinner />
            ) : error ? (
                <p className="text-center text-sm py-20" style={{ color: 'var(--color-text-muted)' }}>
                    {error}
                </p>
            ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4"
                     style={{ color: 'var(--color-text-muted)' }}>
                    <Bookmark className="w-12 h-12 opacity-25" />
                    <p className="text-sm">Henüz kaydedilen tartışma yok.</p>
                    <Link
                        to="/forum"
                        className="text-xs font-semibold hover:underline"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        Foruma git
                    </Link>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-base font-manrope font-bold"
                            style={{ color: 'var(--color-text-primary)' }}>
                            Kaydedilen Tartışmalar
                        </h2>
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            ({total})
                        </span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {threads.map(t => (
                            <BookmarkThreadCard key={t.id} thread={t} />
                        ))}
                    </div>

                    {/* ── Sayfalama ── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <button
                                disabled={page <= 1}
                                onClick={() => load(page - 1)}
                                className="px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-white/5"
                                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                                Önceki
                            </button>
                            <span className="text-xs px-3" style={{ color: 'var(--color-text-muted)' }}>
                                {page} / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => load(page + 1)}
                                className="px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-white/5"
                                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                                Sonraki
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
