import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MessageSquare } from 'lucide-react';
import axiosInstance from '../api/axios';

const CATEGORIES = [
    { value: '', label: 'Tümü' },
    { value: 'haberler',  label: 'Haberler' },
    { value: 'teknoloji', label: 'Teknoloji' },
    { value: 'kültür',    label: 'Kültür' },
    { value: 'spor',      label: 'Spor' },
    { value: 'eğlence',   label: 'Eğlence' },
    { value: 'bilim',     label: 'Bilim' },
    { value: 'ekonomi',   label: 'Ekonomi' },
    { value: 'genel',     label: 'Genel' },
];

export default function ForumSearch() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQ   = searchParams.get('q') ?? '';
    const initialCat = searchParams.get('category') ?? '';

    const [query,    setQuery]    = React.useState(initialQ);
    const [category, setCategory] = React.useState(initialCat);
    const [results,  setResults]  = React.useState([]);
    const [total,    setTotal]    = React.useState(0);
    const [loading,  setLoading]  = React.useState(false);
    const [searched, setSearched] = React.useState(false);

    const doSearch = React.useCallback(async (q, cat) => {
        if (!q.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const params = { q, page: 1, size: 20 };
            if (cat) params.category = cat;
            const { data } = await axiosInstance.get('/forum/search', { params });
            setResults(data.items);
            setTotal(data.total);
        } catch { /* sessiz */ }
        finally { setLoading(false); }
    }, []);

    React.useEffect(() => {
        const q   = searchParams.get('q') ?? '';
        const cat = searchParams.get('category') ?? '';
        if (q) {
            setQuery(q);
            setCategory(cat);
            doSearch(q, cat);
        }
    }, [searchParams]); // eslint-disable-line

    const handleSubmit = (e) => {
        e.preventDefault();
        setSearchParams({ q: query, ...(category ? { category } : {}) });
    };

    return (
        <div className="max-w-2xl mx-auto py-6 flex flex-col gap-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                >
                    <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Tartışmalarda ara..."
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                    <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        Ara
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setCategory(c.value)}
                            className="text-[10px] px-3 py-1 rounded-full font-semibold transition-colors"
                            style={category === c.value
                                ? { background: 'var(--color-brand-primary)', color: '#070f12' }
                                : { border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }
                            }
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </form>

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-bg-surface)' }} />
                    ))}
                </div>
            ) : searched && results.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">"{query}" için sonuç bulunamadı.</p>
                </div>
            ) : (
                <>
                    {searched && (
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {total} sonuç bulundu
                        </p>
                    )}
                    <div className="flex flex-col gap-3">
                        {results.map(t => (
                            <Link
                                key={t.id}
                                to={`/forum/${t.id}`}
                                className="block p-4 rounded-xl transition-all hover:opacity-90"
                                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                            >
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    {t.category && (
                                        <span
                                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(59,130,246,0.10)', color: 'var(--color-accent-blue)', border: '1px solid rgba(59,130,246,0.20)' }}
                                        >
                                            {t.category}
                                        </span>
                                    )}
                                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                        {t.author?.username}
                                    </span>
                                </div>
                                <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                    {t.title}
                                </p>
                                <div className="flex items-center gap-3 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                    <span><MessageSquare className="w-3 h-3 inline mr-0.5" />{t.comment_count}</span>
                                    <span>🚩{t.vote_suspicious} · ✅{t.vote_authentic}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
