import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { usePopularNews } from '../hooks/usePopularNews';
import PopularNewsGrid from '../components/features/gundem/PopularNewsGrid';
import DailySummaryPanel from '../components/features/gundem/DailySummaryPanel';
import TrendingPanel from '../components/features/gundem/TrendingPanel';
import { RefreshCw } from 'lucide-react';

export default function Gundem() {
    const [searchParams] = useSearchParams();
    const { subscribe } = useWebSocket();
    const category = searchParams.get('category');

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const { featured, articles, loading, loadingMore, error, newCount, hasMore, refresh, loadMore } =
        usePopularNews(category, dateFrom, dateTo);

    useEffect(() => {
        const unsub = subscribe('recommendations_updated', refresh);
        return unsub;
    }, [subscribe, refresh]);

    return (
        <div className="w-full pt-14 pb-16 px-4">
            <div className="max-w-400 mx-auto">

                {/* ── Header — üç sütunun üstünde, hepsi aynı hizada ── */}
                <div className="mb-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5"
                       style={{ color: 'var(--color-brand-primary)' }}>
                    </p>
                    <h1 key={category ?? 'for-you'}
                        className="text-4xl md:text-5xl font-extrabold font-manrope tracking-tight leading-none animate-fade-up"
                        style={{ color: 'var(--color-text-primary)' }}>
                        {category
                            ? <>{category.charAt(0).toLocaleUpperCase('tr-TR') + category.slice(1)}<span style={{ color: 'var(--color-brand-primary)' }}>.</span></>
                            : <>Sizin İçin<span style={{ color: 'var(--color-brand-primary)' }}>.</span></>
                        }
                    </h1>
                </div>

                {/* ── Üç sütun — hepsi aynı üst hizadan başlar ── */}
                <div className="flex gap-5 w-full items-start">

                    {/* Sol Sidebar: Günün Özeti */}
                    <aside className="hidden lg:block w-72 shrink-0 sticky top-14 self-start"
                           style={{ border: '1px solid var(--color-terminal-border-raw)' }}>
                        <DailySummaryPanel />
                    </aside>

                    {/* Orta: Ana İçerik */}
                    <main className="flex-1 min-w-0">

                        {newCount > 0 && (
                            <button
                                onClick={refresh}
                                className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 px-4 font-mono text-[11px] font-bold uppercase tracking-widest border transition-all hover:brightness-110"
                                style={{
                                    background:  'rgba(16,185,129,0.05)',
                                    borderColor: 'var(--color-brand-primary)',
                                    color:       'var(--color-brand-primary)',
                                }}>
                                <RefreshCw className="w-3.5 h-3.5" />
                                {newCount} yeni haber — yükle
                            </button>
                        )}

                        {(dateFrom || dateTo) && (
                            <div className="flex items-center gap-3 mb-4 font-mono text-xs"
                                 style={{ color: 'var(--color-text-muted)' }}>
                                <span>Tarih: {dateFrom || '…'} → {dateTo || '…'}</span>
                                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                        className="hover:underline"
                                        style={{ color: 'var(--color-brand-primary)' }}>
                                    Temizle
                                </button>
                            </div>
                        )}

                        {error && (
                            <p className="font-mono text-sm text-center py-10"
                               style={{ color: 'var(--color-es-error)', opacity: 0.7 }}>
                                {error}
                            </p>
                        )}

                        <PopularNewsGrid
                            featured={featured}
                            articles={articles}
                            loading={loading}
                            loadingMore={loadingMore}
                            hasMore={hasMore}
                            loadMore={loadMore}
                        />
                    </main>

                    {/* Sağ Sidebar: Bugün Trend */}
                    <aside className="hidden lg:block w-72 shrink-0 sticky top-14 self-start"
                           style={{ border: '1px solid var(--color-terminal-border-raw)' }}>
                        <TrendingPanel category={category} />
                    </aside>

                </div>
            </div>
        </div>
    );
}
