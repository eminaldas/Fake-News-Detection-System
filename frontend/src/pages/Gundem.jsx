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

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const { featured, articles, loading, loadingMore, error, newCount, hasMore, refresh, loadMore } =
        usePopularNews(category, dateFrom, dateTo);

    const { threads: trendThreads, loading: trendLoading } = useForumTrends();

    useEffect(() => {
        const unsub = subscribe('recommendations_updated', refresh);
        return unsub;
    }, [subscribe, refresh]);


    return (
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-16">

            {/* Yeni haber bildirimi */}
            {newCount > 0 && (
                <button
                    onClick={refresh}
                    className="w-full mb-6 flex items-center justify-center gap-2 py-3 px-4 font-mono text-xs font-bold cursor-pointer border transition-all hover:brightness-110"
                    style={{
                        background:  'var(--color-terminal-surface)',
                        borderColor: 'var(--color-terminal-border-raw)',
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
                    {category
                        ? <>{category.charAt(0).toUpperCase() + category.slice(1)}<span style={{ color: 'var(--color-brand-primary)' }}>.</span></>
                        : <>Sizin İçin<span style={{ color: 'var(--color-brand-primary)' }}>.</span></>
                    }
                </h1>
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
                featured={featured}
                articles={articles}
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
