import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { usePopularNews } from '../hooks/usePopularNews';
import { useForumTrends } from '../hooks/useForumTrends';
import PopularNewsGrid from '../components/features/gundem/PopularNewsGrid';
import ForumTrendBand from '../components/features/gundem/ForumTrendBand';

export default function Gundem() {
    const [searchParams]  = useSearchParams();
    const { subscribe }   = useWebSocket();
    const category        = searchParams.get('category');

    const [search,   setSearch]   = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const { articles, loading, loadingMore, error, newCount, hasMore, refresh, loadMore } =
        usePopularNews(category, dateFrom, dateTo);

    const { threads: trendThreads, loading: trendLoading } = useForumTrends();

    useEffect(() => {
        const unsub = subscribe('recommendations_updated', refresh);
        return unsub;
    }, [subscribe, refresh]);

    const filtered = search.trim()
        ? articles.filter(a => a.title?.toLowerCase().includes(search.trim().toLowerCase()))
        : articles;

    return (
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-16">

            {/* Yeni haber bildirimi */}
            {newCount > 0 && (
                <button
                    onClick={refresh}
                    className="w-full mb-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold cursor-pointer border transition-colors"
                    style={{
                        background:  'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--color-brand-primary) 40%, transparent)',
                        color:       'var(--color-brand-primary)',
                    }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    {newCount} yeni haber
                </button>
            )}

            {/* Başlık */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-px" style={{ background: 'var(--color-brand-primary)' }} />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        Güncel Haberler
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-tx-primary font-manrope tracking-tight leading-none">
                    Gündem<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
                </h1>
            </div>

            {/* Arama */}
            <div className="relative mb-8">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
                </svg>
                <input
                    type="text"
                    placeholder="Haberlerde ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-3 rounded-lg text-sm font-medium bg-surface border border-brutal-border text-tx-primary placeholder:text-muted focus:outline-none transition-all w-72"
                    onFocus={e => { e.target.style.borderColor = 'var(--color-brand-primary)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'var(--color-border)'; }}
                />
            </div>

            {/* Tarih filtresi aktifse temizle */}
            {(dateFrom || dateTo) && (
                <div className="flex items-center gap-3 mb-4 text-xs text-muted">
                    <span>Tarih filtresi: {dateFrom || '…'} → {dateTo || '…'}</span>
                    <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                            className="text-brand hover:underline">
                        Temizle
                    </button>
                </div>
            )}

            {/* Hata */}
            {error && (
                <p className="text-red-400/70 text-sm text-center py-10">{error}</p>
            )}

            {/* Popüler haberler */}
            <PopularNewsGrid
                articles={filtered}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                loadMore={loadMore}
            />

            {/* Forum trend bandı */}
            <ForumTrendBand threads={trendThreads} loading={trendLoading} />

        </div>
    );
}
