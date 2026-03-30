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

function NewsCard({ article }) {
    const pubDate = article.pub_date
        ? new Date(article.pub_date).toLocaleString('tr-TR', {
              day: '2-digit', month: '2-digit',
              hour: '2-digit', minute: '2-digit',
          })
        : '';

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-white/20 transition-colors">
            {article.image_url && (
                <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-40 object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            )}
            <div className="p-4 flex flex-col flex-1 gap-2">
                <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
                    {article.title}
                </p>
                <div className="flex items-center justify-between mt-auto pt-2 text-xs text-white/40">
                    <span>{article.source_name}</span>
                    <span>{pubDate}</span>
                </div>
                {article.source_count > 1 && (
                    <span className="text-xs text-emerald-400 font-medium">
                        {article.source_count} kaynak yazdı
                    </span>
                )}
                {article.source_url && (
                    <a
                        href={`/?url=${encodeURIComponent(article.source_url)}`}
                        className="mt-1 text-xs text-center py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                        Analiz Et
                    </a>
                )}
            </div>
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

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-6">Gündem</h1>

            <div className="flex flex-wrap gap-2 mb-6">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.label}
                        onClick={() => handleCategory(c.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            category === c.value
                                ? 'bg-emerald-500 text-black'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {loading && (
                <p className="text-white/40 text-sm text-center py-12">Yükleniyor...</p>
            )}
            {error && (
                <p className="text-red-400 text-sm text-center py-12">{error}</p>
            )}
            {!loading && !error && articles.length === 0 && (
                <p className="text-white/40 text-sm text-center py-12">
                    Henüz haber yok. RSS ingest tamamlandıktan sonra görünecek.
                </p>
            )}
            {!loading && articles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {articles.map((a) => (
                        <NewsCard key={a.id} article={a} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-8">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 disabled:opacity-30 hover:bg-white/20 text-sm"
                    >
                        Önceki
                    </button>
                    <span className="text-white/40 text-sm">{page} / {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 disabled:opacity-30 hover:bg-white/20 text-sm"
                    >
                        Sonraki
                    </button>
                </div>
            )}
        </div>
    );
}
