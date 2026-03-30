import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NewsService from '../services/news.service';

const CATEGORIES = [
    { label: 'Tümü',      value: null,        icon: '◈' },
    { label: 'Gündem',    value: 'gündem',     icon: '◉' },
    { label: 'Ekonomi',   value: 'ekonomi',    icon: '◈' },
    { label: 'Spor',      value: 'spor',       icon: '◎' },
    { label: 'Sağlık',    value: 'sağlık',     icon: '◇' },
    { label: 'Teknoloji', value: 'teknoloji',  icon: '◈' },
    { label: 'Kültür',    value: 'kültür',     icon: '◇' },
    { label: 'Yaşam',     value: 'yaşam',      icon: '◎' },
];

/* Güvenilir kaynak rozeti — sadece trust_score >= 0.9 */
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

/* Kart alt aksiyonları */
function CardActions({ article }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {article.source_url && (
                <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-[11px] text-center py-1.5 rounded-lg
                               border border-brutal-border text-tx-secondary
                               hover:bg-surface-solid hover:text-tx-primary transition-colors"
                >
                    Haberi Oku
                </a>
            )}
            {article.source_url && (
                <a
                    href={`/?url=${encodeURIComponent(article.source_url)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-[11px] text-center py-1.5 rounded-lg
                               bg-es-primary/10 border border-es-primary/25
                               text-es-primary hover:bg-es-primary/20 transition-colors dark:text-es-primary"
                    style={{ color: 'var(--color-brand-primary)' }}
                >
                    Analiz Et
                </a>
            )}
        </div>
    );
}

/* ── Büyük öne çıkan kart ─────────────────────────────────────────── */
function FeaturedCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    const inner = (
        <article className="group relative flex flex-col justify-end min-h-[400px] rounded-2xl
                            overflow-hidden cursor-pointer transition-transform duration-300
                            hover:-translate-y-1">
            {/* Arka plan */}
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
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {/* İçerik */}
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
                        Tıkla → Haberi Oku
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
                            hover:border-brand/30 transition-all min-h-[240px]">
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
                            hover:border-brand/30 cursor-pointer transition-all">
            {/* Sol: görsel veya metin arka planı */}
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

            {/* Sağ: metin */}
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
                        <span className="flex items-center gap-1.5 text-sm font-semibold
                                         transition-colors"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            Haberi Oku
                            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
                            hover:border-brand/30 hover:-translate-y-0.5
                            transition-all duration-200">
            {/* Görsel / placeholder */}
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

            {/* Metin */}
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

const SIZE = 20;

export default function Gundem() {
    const [articles, setArticles] = useState([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [category, setCategory] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);
    const [search, setSearch]     = useState('');

    const fetchNews = useCallback(async (cat, pg) => {
        setLoading(true);
        setError(null);
        try {
            const data = await NewsService.getNews({ category: cat, page: pg, size: SIZE });
            setArticles(data.items);
            setTotal(data.total);
        } catch {
            setError('Haberler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNews(category, page); }, [category, page, fetchNews]);

    const handleCategory = (val) => { setCategory(val); setPage(1); setSearch(''); };

    /* Sıralama: source_count en yüksek 2 tanesi öne, geri kalanlar pub_date'e göre */
    const sorted = useMemo(() => {
        let filtered = articles;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = articles.filter(a => a.title?.toLowerCase().includes(q));
        }
        const sorted = [...filtered].sort((a, b) => (b.source_count || 1) - (a.source_count || 1));
        const top2 = sorted.slice(0, 2);
        const rest = filtered.filter(a => !top2.includes(a));
        return [...top2, ...rest];
    }, [articles, search]);

    const totalPages = Math.ceil(total / SIZE);

    /* Kart tipini index'e göre ata */
    function renderCard(article, index) {
        if (index === 0 || index === 1) return <FeaturedCard key={article.id} article={article} />;
        if (index === 2)                return <WideCard     key={article.id} article={article} />;
        if (index === 3)                return <TextCard     key={article.id} article={article} />;
        return                                 <NormalCard   key={article.id} article={article} />;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">

            {/* Editorial başlık */}
            <div className="mb-10">
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
                {total > 0 && (
                    <p className="text-muted text-sm mt-2">{total} haber takip ediliyor</p>
                )}
            </div>

            {/* Kategori + arama */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                {/* Kategoriler */}
                <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                        <button key={c.label} onClick={() => handleCategory(c.value)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold
                                            transition-all cursor-pointer ${
                                    category === c.value
                                        ? 'text-black font-bold shadow-lg'
                                        : 'bg-surface border border-brutal-border text-tx-secondary hover:text-tx-primary hover:border-brand/30'
                                }`}
                                style={category === c.value ? {
                                    background: 'var(--color-brand-primary)',
                                    boxShadow: '0 0 14px color-mix(in srgb, var(--color-brand-primary) 35%, transparent)',
                                } : {}}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Arama */}
                <div className="sm:ml-auto relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Haberlerde ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-1.5 rounded-full text-xs
                                   bg-surface border border-brutal-border text-tx-primary
                                   placeholder:text-muted focus:outline-none
                                   focus:border-brand/40 transition-colors w-48"
                    />
                </div>
            </div>

            {/* İçerik */}
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

            {/* Sayfalama */}
            {totalPages > 1 && !search && (
                <div className="flex justify-center items-center gap-4 mt-12">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer
                                       bg-surface border border-brutal-border text-tx-secondary
                                       disabled:opacity-30 hover:text-tx-primary hover:border-brand/30
                                       text-sm transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Önceki
                    </button>
                    <span className="text-muted text-xs tabular-nums">{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer
                                       bg-surface border border-brutal-border text-tx-secondary
                                       disabled:opacity-30 hover:text-tx-primary hover:border-brand/30
                                       text-sm transition-all">
                        Sonraki
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
