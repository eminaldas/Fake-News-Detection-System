import React, { useCallback, useEffect, useState } from 'react';
import NewsService from '../services/news.service';

const CATEGORIES = [
    { label: 'Tümü',      value: null },
    { label: 'Gündem',    value: 'gündem' },
    { label: 'Ekonomi',   value: 'ekonomi' },
    { label: 'Spor',      value: 'spor' },
    { label: 'Sağlık',    value: 'sağlık' },
    { label: 'Teknoloji', value: 'teknoloji' },
    { label: 'Kültür',    value: 'kültür' },
    { label: 'Yaşam',     value: 'yaşam' },
];

function TrustBadge({ score }) {
    if (!score) return null;
    if (score >= 0.9) return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest uppercase border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Doğrulandı
        </span>
    );
    if (score >= 0.7) return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold tracking-widest uppercase border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
            Güvenilir
        </span>
    );
    return null;
}

function SourceCountPill({ count }) {
    if (!count || count <= 1) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-medium">
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

/* ── Büyük öne çıkan kart — görsel varsa arka plan, yoksa koyu gradient ─── */
function FeaturedCard({ article }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = article.image_url && !imgError;

    return (
        <article className="group relative flex flex-col justify-end min-h-[420px] p-6 rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            {/* Arka plan */}
            {hasImage ? (
                <img
                    src={article.image_url}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-800" />
            )}
            {/* Karartma gradyanı */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* İçerik */}
            <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrustBadge score={article.trust_score} />
                        <SourceCountPill count={article.source_count} />
                    </div>
                    {article.source_url && (
                        <a
                            href={`/?url=${encodeURIComponent(article.source_url)}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                            title="Analiz Et"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                        </a>
                    )}
                </div>
                <p className="text-white/50 text-xs italic">{article.source_name}</p>
                <h3 className="text-xl font-bold text-white leading-snug line-clamp-3">
                    {article.title}
                </h3>
                <p className="text-white/40 text-xs">{formatDate(article.pub_date)}</p>
            </div>
        </article>
    );
}

/* ── Metin kartı — görsel yok, koyu arka plan ─────────────────────────────── */
function TextCard({ article }) {
    return (
        <article className="group flex flex-col justify-between p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <TrustBadge score={article.trust_score} />
                    {article.source_url && (
                        <a
                            href={`/?url=${encodeURIComponent(article.source_url)}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 hover:text-emerald-300"
                            title="Analiz Et"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                        </a>
                    )}
                </div>
                <p className="text-white/40 italic text-xs">{article.source_name}</p>
                <h3 className="text-lg font-bold text-white leading-snug line-clamp-4">
                    {article.title}
                </h3>
            </div>
            <div className="pt-5 mt-5 border-t border-white/8 flex items-center justify-between">
                <span className="text-white/30 text-xs">{formatDate(article.pub_date)}</span>
                <SourceCountPill count={article.source_count} />
            </div>
        </article>
    );
}

/* ── Normal kart — görsel üstte, metin altta ──────────────────────────────── */
function NormalCard({ article }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = article.image_url && !imgError;

    return (
        <article className="group flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-200">
            {hasImage ? (
                <div className="relative h-44 overflow-hidden">
                    <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
            ) : (
                <div className="h-44 bg-gradient-to-br from-emerald-950/60 to-zinc-900/60 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                </div>
            )}

            <div className="p-4 flex flex-col flex-1 gap-2.5">
                <div className="flex items-center gap-2">
                    <TrustBadge score={article.trust_score} />
                    <SourceCountPill count={article.source_count} />
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-3">
                    {article.title}
                </h3>
                <div className="flex items-center justify-between mt-auto pt-2 text-xs text-white/30">
                    <span className="italic">{article.source_name}</span>
                    <span>{formatDate(article.pub_date)}</span>
                </div>
                {article.source_url && (
                    <a
                        href={`/?url=${encodeURIComponent(article.source_url)}`}
                        className="mt-1 text-xs text-center py-1.5 rounded-xl bg-emerald-500/8 text-emerald-500/70 hover:bg-emerald-500/15 hover:text-emerald-400 transition-colors border border-emerald-500/20"
                    >
                        Analiz Et →
                    </a>
                )}
            </div>
        </article>
    );
}

/* ── Geniş yatay kart (bento) ─────────────────────────────────────────────── */
function WideCard({ article }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = article.image_url && !imgError;

    return (
        <article className="group md:col-span-2 flex flex-col md:flex-row rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 hover:border-emerald-500/20 transition-all">
            <div className="md:w-2/5 relative h-56 md:h-auto overflow-hidden">
                {hasImage ? (
                    <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-950 to-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 md:block hidden" />
            </div>
            <div className="md:w-3/5 p-7 flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <TrustBadge score={article.trust_score} />
                        <SourceCountPill count={article.source_count} />
                    </div>
                    <p className="text-white/40 italic text-xs">{article.source_name}</p>
                    <h3 className="text-2xl font-bold text-white leading-tight line-clamp-3">
                        {article.title}
                    </h3>
                </div>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/8">
                    <span className="text-white/30 text-xs">{formatDate(article.pub_date)}</span>
                    {article.source_url && (
                        <a
                            href={`/?url=${encodeURIComponent(article.source_url)}`}
                            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors group"
                        >
                            Analiz Et
                            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </a>
                    )}
                </div>
            </div>
        </article>
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

    useEffect(() => {
        fetchNews(category, page);
    }, [category, page, fetchNews]);

    const handleCategory = (val) => {
        setCategory(val);
        setPage(1);
    };

    const totalPages = Math.ceil(total / SIZE);

    /* Kart tipini belirle: index sırasına göre layout atanır */
    function renderCard(article, index) {
        // İlk iki kart: büyük öne çıkan
        if (index === 0 || index === 1) return <FeaturedCard key={article.id} article={article} />;
        // 3. kart: geniş bento (2 sütun)
        if (index === 2) return <WideCard key={article.id} article={article} />;
        // 4. kart: metin
        if (index === 3) return <TextCard key={article.id} article={article} />;
        // Geri kalanlar: normal
        return <NormalCard key={article.id} article={article} />;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">

            {/* Editorial başlık */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-px bg-emerald-500" />
                    <span className="text-emerald-500 text-[10px] uppercase tracking-[0.25em] font-bold">
                        Güncel Haberler
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
                    Gündem<span className="text-emerald-400">.</span>
                </h1>
                <p className="text-white/30 text-sm mt-2">{total > 0 ? `${total} haber takip ediliyor` : ''}</p>
            </div>

            {/* Kategori filtresi */}
            <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.label}
                        onClick={() => handleCategory(c.value)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            category === c.value
                                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/10'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {/* İçerik */}
            {loading && (
                <div className="flex items-center justify-center py-20 gap-3 text-white/30">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="text-sm">Yükleniyor...</span>
                </div>
            )}
            {error && (
                <p className="text-red-400/70 text-sm text-center py-20">{error}</p>
            )}
            {!loading && !error && articles.length === 0 && (
                <p className="text-white/20 text-sm text-center py-20">
                    Henüz haber yok. RSS ingest tamamlandıktan sonra görünecek.
                </p>
            )}

            {!loading && articles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {articles.map((a, i) => renderCard(a, i))}
                </div>
            )}

            {/* Sayfalama */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white/[0.05] text-white/50 disabled:opacity-20 hover:bg-white/10 hover:text-white text-sm border border-white/8 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Önceki
                    </button>
                    <span className="text-white/20 text-xs tabular-nums">{page} / {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white/[0.05] text-white/50 disabled:opacity-20 hover:bg-white/10 hover:text-white text-sm border border-white/8 transition-all"
                    >
                        Sonraki
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
