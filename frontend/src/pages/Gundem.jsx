import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NewsService from '../services/news.service';

/* hot: true → admin tarafından kırmızı/trend olarak işaretlenebilir */
const CATEGORIES = [
    { label: 'Tümü',      value: null,        hot: false },
    { label: 'Gündem',    value: 'gündem',     hot: true  },
    { label: 'Ekonomi',   value: 'ekonomi',    hot: false },
    { label: 'Spor',      value: 'spor',       hot: false },
    { label: 'Sağlık',    value: 'sağlık',     hot: false },
    { label: 'Teknoloji', value: 'teknoloji',  hot: false },
    { label: 'Kültür',    value: 'kültür',     hot: false },
    { label: 'Yaşam',     value: 'yaşam',      hot: false },
];

function TrustBadge({ score }) {
    if (!score || score < 0.9) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-authentic-bg border border-authentic-border
                         text-authentic-text text-[9px] font-bold tracking-wider uppercase">
            <span className="w-1 h-1 rounded-full bg-authentic-fill inline-block" />
            Güvenilir Kaynak
        </span>
    );
}

function SourcePill({ count }) {
    if (!count || count <= 1) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-surface-solid border border-brutal-border
                         text-muted text-[9px] font-semibold">
            {count} kaynak
        </span>
    );
}

function formatDate(pub_date) {
    if (!pub_date) return '';
    return new Date(pub_date).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

/* ── Büyük öne çıkan kart ─────────────────────────────────────────── */
function FeaturedCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    const inner = (
        <article className="group relative flex flex-col justify-end min-h-[400px] rounded-2xl
                            overflow-hidden cursor-pointer transition-shadow duration-300
                            hover:shadow-xl">
            {hasImg ? (
                <img src={article.image_url} alt={article.title}
                     className="absolute inset-0 w-full h-full object-cover
                                transition-transform duration-700 group-hover:scale-105"
                     onError={() => setImgErr(true)} />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br
                                from-emerald-950 via-zinc-900 to-zinc-800
                                dark:from-emerald-950 dark:via-[#111b1f] dark:to-zinc-900
                                flex items-center justify-center p-8">
                    <p className="text-white/20 text-2xl font-bold font-manrope
                                  leading-snug text-center line-clamp-4">
                        {article.title}
                    </p>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="relative z-10 p-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <TrustBadge score={article.trust_score} />
                    <SourcePill count={article.source_count} />
                </div>
                <p className="text-white/50 text-xs italic">{article.source_name}</p>
                <h3 className="text-xl font-bold text-white leading-snug line-clamp-3">
                    {article.title}
                </h3>
                <div className="flex items-center justify-between text-white/35 text-xs pt-1">
                    <span>{formatDate(article.pub_date)}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity
                                     text-emerald-400 text-[11px] font-medium">
                        Haberi oku →
                    </span>
                </div>
            </div>
        </article>
    );

    return article.source_url ? (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="block" style={{ textDecoration: 'none' }}>
            {inner}
        </a>
    ) : inner;
}

/* ── Metin kartı ──────────────────────────────────────────────────── */
function TextCard({ article }) {
    const inner = (
        <article className="group flex flex-col justify-between p-6 rounded-2xl cursor-pointer
                            bg-surface border border-brutal-border
                            hover:border-brand/30 hover:shadow-md transition-all min-h-[240px]">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <TrustBadge score={article.trust_score} />
                    <SourcePill count={article.source_count} />
                </div>
                <p className="text-muted italic text-xs">{article.source_name}</p>
                <h3 className="text-lg font-bold text-tx-primary leading-snug line-clamp-4">
                    {article.title}
                </h3>
            </div>
            <div className="pt-4 mt-4 border-t border-brutal-border flex items-center justify-between">
                <span className="text-muted text-xs">{formatDate(article.pub_date)}</span>
                {article.source_url && (
                    <span className="text-[11px] text-muted group-hover:text-tx-secondary
                                     transition-colors opacity-0 group-hover:opacity-100">
                        Haberi oku →
                    </span>
                )}
            </div>
        </article>
    );

    return article.source_url ? (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="block" style={{ textDecoration: 'none' }}>
            {inner}
        </a>
    ) : inner;
}

/* ── Geniş yatay bento kart ───────────────────────────────────────── */
function WideCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    const inner = (
        <article className="group md:col-span-2 flex flex-col md:flex-row rounded-2xl
                            overflow-hidden bg-surface border border-brutal-border
                            hover:border-brand/30 hover:shadow-md cursor-pointer transition-all">
            <div className="md:w-2/5 relative h-56 md:h-auto overflow-hidden flex-shrink-0">
                {hasImg ? (
                    <img src={article.image_url} alt={article.title}
                         className="w-full h-full object-cover
                                    transition-transform duration-500 group-hover:scale-105"
                         onError={() => setImgErr(true)} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br
                                    from-emerald-950 to-zinc-900
                                    dark:from-emerald-950 dark:to-[#0a1a1a]
                                    flex items-center justify-center p-8">
                        <p className="text-white/25 text-lg font-bold font-manrope
                                      leading-snug text-center line-clamp-4">
                            {article.title}
                        </p>
                    </div>
                )}
            </div>

            <div className="md:w-3/5 p-7 flex flex-col justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <TrustBadge score={article.trust_score} />
                        <SourcePill count={article.source_count} />
                    </div>
                    <p className="text-muted italic text-xs">{article.source_name}</p>
                    <h3 className="text-2xl font-bold text-tx-primary leading-tight line-clamp-3">
                        {article.title}
                    </h3>
                </div>
                <div className="flex items-center justify-between mt-6 pt-5
                                border-t border-brutal-border">
                    <span className="text-muted text-xs">{formatDate(article.pub_date)}</span>
                    {article.source_url && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            Haberi Oku
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>
        </article>
    );

    return article.source_url ? (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="block md:col-span-2" style={{ textDecoration: 'none' }}>
            {inner}
        </a>
    ) : inner;
}

/* ── Normal kart ──────────────────────────────────────────────────── */
function NormalCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    const inner = (
        <article className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer
                            bg-surface border border-brutal-border
                            hover:border-brand/30 hover:shadow-md transition-all duration-200">
            <div className="relative h-44 overflow-hidden flex-shrink-0">
                {hasImg ? (
                    <>
                        <img src={article.image_url} alt={article.title}
                             className="w-full h-full object-cover
                                        transition-transform duration-500 group-hover:scale-105"
                             onError={() => setImgErr(true)} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br
                                    from-surface-solid to-surface
                                    border-b border-brutal-border
                                    flex items-center justify-center p-5">
                        <p className="text-tx-primary/30 text-base font-bold font-manrope
                                      leading-snug text-center line-clamp-4">
                            {article.title}
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <TrustBadge score={article.trust_score} />
                    <SourcePill count={article.source_count} />
                </div>
                <h3 className="text-sm font-semibold text-tx-primary leading-snug line-clamp-3">
                    {article.title}
                </h3>
                <div className="flex items-center justify-between mt-auto pt-2
                                text-xs text-muted border-t border-brutal-border">
                    <span className="italic">{article.source_name}</span>
                    <span>{formatDate(article.pub_date)}</span>
                </div>
            </div>
        </article>
    );

    return article.source_url ? (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="block" style={{ textDecoration: 'none' }}>
            {inner}
        </a>
    ) : inner;
}

/* ── Spinner ──────────────────────────────────────────────────────── */
function Spinner() {
    return (
        <div className="flex items-center justify-center py-24 gap-3 text-muted">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Yükleniyor...</span>
        </div>
    );
}

/* ── Sayfa numaraları algoritması ─────────────────────────────────── */
function pageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total]);
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
        result.push(sorted[i]);
    }
    return result;
}

const SIZE = 20;
const POLL_INTERVAL = 3 * 60 * 1000;

export default function Gundem() {
    const [articles, setArticles] = useState([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [category, setCategory] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);
    const [search, setSearch]     = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');
    const [newCount, setNewCount] = useState(0);
    const totalRef = React.useRef(0);

    const fetchNews = useCallback(async (cat, pg, silent = false, dfrom = dateFrom, dto = dateTo) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await NewsService.getNews({
                category: cat,
                page: pg,
                size: SIZE,
                date_from: dfrom || undefined,
                date_to:   dto   || undefined,
            });
            if (silent) {
                const diff = data.total - totalRef.current;
                if (diff > 0) {
                    setArticles(data.items);
                    setTotal(data.total);
                    totalRef.current = data.total;
                    setNewCount(diff);
                    setTimeout(() => setNewCount(0), 4000);
                }
            } else {
                setArticles(data.items);
                setTotal(data.total);
                totalRef.current = data.total;
                setNewCount(0);
            }
        } catch {
            if (!silent) setError('Haberler yüklenemedi.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchNews(category, page); }, [category, page, fetchNews]);

    useEffect(() => {
        if (page !== 1) return;
        const id = setInterval(() => fetchNews(category, 1, true), POLL_INTERVAL);
        return () => clearInterval(id);
    }, [category, page, fetchNews]);

    const applyNewArticles = () => { fetchNews(category, 1); setPage(1); };

    const handleCategory = (val) => { setCategory(val); setPage(1); setSearch(''); };

    const handleDateFilter = () => { setPage(1); fetchNews(category, 1, false, dateFrom, dateTo); };
    const clearDateFilter  = () => { setDateFrom(''); setDateTo(''); setPage(1); fetchNews(category, 1, false, '', ''); };

    const sorted = useMemo(() => {
        let filtered = articles;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = articles.filter(a => a.title?.toLowerCase().includes(q));
        }
        const bySrc = [...filtered].sort((a, b) => (b.source_count || 1) - (a.source_count || 1));
        const top2 = bySrc.slice(0, 2);
        const rest = filtered.filter(a => !top2.includes(a));
        return [...top2, ...rest];
    }, [articles, search]);

    const totalPages = Math.ceil(total / SIZE);

    function renderCard(article, index) {
        if (index === 0 || index === 1) return <FeaturedCard key={article.id} article={article} />;
        if (index === 2)                return <WideCard     key={article.id} article={article} />;
        if (index === 3)                return <TextCard     key={article.id} article={article} />;
        return                                 <NormalCard   key={article.id} article={article} />;
    }

    const hasDateFilter = dateFrom || dateTo;

    return (
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">

            {/* ── Yeni haber banner ── */}
            {newCount > 0 && (
                <button
                    onClick={applyNewArticles}
                    className="w-full mb-6 flex items-center justify-center gap-2
                               py-3 px-4 rounded-xl text-sm font-bold cursor-pointer
                               border transition-colors"
                    style={{
                        background:   'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)',
                        borderColor:  'color-mix(in srgb, var(--color-brand-primary) 40%, transparent)',
                        color:        'var(--color-brand-primary)',
                    }}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {newCount} yeni haber — yüklemek için tıkla
                </button>
            )}

            {/* ── Başlık ── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-px" style={{ background: 'var(--color-brand-primary)' }} />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        Güncel Haberler
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-tx-primary
                               font-manrope tracking-tight leading-none">
                    Gündem<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
                </h1>
            </div>

            {/* ── Kategoriler + arama ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                        const isActive = category === c.value;
                        if (c.hot && !isActive) {
                            return (
                                <button
                                    key={c.label}
                                    onClick={() => handleCategory(c.value)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full
                                               text-xs font-bold tracking-wide cursor-pointer transition-all
                                               border border-red-500/40 text-red-500
                                               hover:bg-red-500/10 hover:border-red-500/60"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                                    {c.label}
                                </button>
                            );
                        }
                        return (
                            <button
                                key={c.label}
                                onClick={() => handleCategory(c.value)}
                                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide
                                            cursor-pointer transition-all ${
                                    isActive
                                        ? 'text-white shadow-md'
                                        : 'bg-surface border border-brutal-border text-tx-secondary hover:text-tx-primary hover:border-brand/40'
                                }`}
                                style={isActive ? { background: 'var(--color-brand-primary)' } : {}}
                            >
                                {c.label}
                            </button>
                        );
                    })}
                </div>

                <div className="sm:ml-auto relative self-start">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Haberlerde ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-2 rounded-full text-xs
                                   bg-surface border border-brutal-border text-tx-primary
                                   placeholder:text-muted focus:outline-none
                                   focus:border-brand/40 transition-colors w-48"
                    />
                </div>
            </div>

            {/* ── İçerik ── */}
            {loading && <Spinner />}
            {error && <p className="text-red-400/70 text-sm text-center py-20">{error}</p>}
            {!loading && !error && sorted.length === 0 && (
                <p className="text-muted text-sm text-center py-20">
                    {search ? 'Arama sonucu bulunamadı.' : 'Henüz haber yok.'}
                </p>
            )}

            {!loading && sorted.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sorted.map((a, i) => renderCard(a, i))}
                </div>
            )}

            {/* ── Sayfalama ── */}
            {totalPages > 1 && !search && (
                <div className="mt-12 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {/* İlk sayfa */}
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(1)}
                            title="İlk sayfa"
                            className="w-9 h-9 flex items-center justify-center rounded-lg
                                       bg-surface border border-brutal-border text-tx-secondary text-xs
                                       disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary
                                       transition-all cursor-pointer disabled:cursor-default"
                        >
                            «
                        </button>

                        {/* Önceki sayfa */}
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg
                                       bg-surface border border-brutal-border text-tx-secondary text-xs
                                       disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary
                                       transition-all cursor-pointer disabled:cursor-default"
                        >
                            ‹
                        </button>

                        {/* Numara butonları */}
                        {pageNumbers(page, totalPages).map((p, i) =>
                            p === '...' ? (
                                <span key={`dots-${i}`}
                                      className="w-9 h-9 flex items-center justify-center text-muted text-xs">
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-lg
                                                text-xs font-bold transition-all cursor-pointer ${
                                        page === p
                                            ? 'text-white shadow-sm'
                                            : 'bg-surface border border-brutal-border text-tx-secondary hover:border-brand/40 hover:text-tx-primary'
                                    }`}
                                    style={page === p ? { background: 'var(--color-brand-primary)' } : {}}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        {/* Sonraki sayfa */}
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg
                                       bg-surface border border-brutal-border text-tx-secondary text-xs
                                       disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary
                                       transition-all cursor-pointer disabled:cursor-default"
                        >
                            ›
                        </button>

                        {/* Son sayfa */}
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(totalPages)}
                            title="Son sayfa"
                            className="w-9 h-9 flex items-center justify-center rounded-lg
                                       bg-surface border border-brutal-border text-tx-secondary text-xs
                                       disabled:opacity-30 hover:border-brand/40 hover:text-tx-primary
                                       transition-all cursor-pointer disabled:cursor-default"
                        >
                            »
                        </button>
                    </div>

                    <p className="text-muted text-xs tabular-nums">
                        Sayfa {page} / {totalPages}
                    </p>
                </div>
            )}
        </div>
    );
}
