import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, X, Search, Plus } from 'lucide-react';
import axiosInstance from '../../api/axios';

const CATEGORIES = ['gündem', 'ekonomi', 'spor', 'sağlık', 'teknoloji', 'kültür', 'yaşam'];

const ProfileAiLab = () => {
    const [profile, setProfile]             = useState(null);
    const [feedPrefs, setFeedPrefs]         = useState({ blocked_sources: [], hidden_categories: [] });
    const [sourceQuery, setSourceQuery]     = useState('');
    const [sourceResults, setSourceResults] = useState([]);
    const [searchOpen, setSearchOpen]       = useState(false);
    const searchRef                         = useRef(null);

    useEffect(() => {
        axiosInstance.get('/users/me/feed-preferences')
            .then(r => setFeedPrefs(r.data))
            .catch(() => {});
        axiosInstance.get('/users/me/preference-profile')
            .then(r => setProfile(r.data))
            .catch(() => {});
    }, []);

    // Source search with 300ms debounce
    useEffect(() => {
        if (sourceQuery.length < 1) { setSourceResults([]); return; }
        const t = setTimeout(() => {
            axiosInstance.get(`/sources/?search=${encodeURIComponent(sourceQuery)}&limit=5`)
                .then(r => setSourceResults(r.data))
                .catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [sourceQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = e => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const removeBlockedSource = async domain => {
        setFeedPrefs(prev => ({
            ...prev,
            blocked_sources: prev.blocked_sources.filter(s => s !== domain),
        }));
        await axiosInstance.patch('/users/me/feed-preferences', { remove_blocked_source: domain }).catch(() => {});
    };

    const addBlockedSource = async source => {
        if (feedPrefs.blocked_sources.includes(source.url)) return;
        setFeedPrefs(prev => ({
            ...prev,
            blocked_sources: [...prev.blocked_sources, source.url],
        }));
        setSourceQuery('');
        setSourceResults([]);
        setSearchOpen(false);
        await axiosInstance.patch('/users/me/feed-preferences', { add_blocked_source: source.url }).catch(() => {});
    };

    const removeHiddenCategory = async cat => {
        setFeedPrefs(prev => ({
            ...prev,
            hidden_categories: prev.hidden_categories.filter(c => c !== cat),
        }));
        await axiosInstance.patch('/users/me/feed-preferences', { remove_hidden_category: cat }).catch(() => {});
    };

    const addHiddenCategory = async cat => {
        if (feedPrefs.hidden_categories.includes(cat)) return;
        setFeedPrefs(prev => ({
            ...prev,
            hidden_categories: [...prev.hidden_categories, cat],
        }));
        await axiosInstance.patch('/users/me/feed-preferences', { add_hidden_category: cat }).catch(() => {});
    };

    const categoryWeights = profile?.category_weights ?? {};
    const hasWeights      = Object.keys(categoryWeights).length > 0;
    const maxWeight       = hasWeights ? Math.max(...Object.values(categoryWeights)) : 1;

    return (
        <div className="space-y-5 max-w-lg">
            {/* Kategori Ağırlıkları */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-1">
                    <SlidersHorizontal className="w-4 h-4 text-muted" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Kategori Ağırlıkları</p>
                </div>
                <p className="text-[11px] text-muted mb-4">Davranışına göre otomatik oluşur — değiştiremezsin</p>
                {!hasWeights ? (
                    <p className="text-sm text-muted">
                        Daha fazla haber inceledikçe bu grafik sana özel hale gelecek.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(categoryWeights)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, weight]) => (
                                <div key={cat}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-tx-secondary capitalize">{cat}</span>
                                        <span className="text-xs text-muted">{Math.round((weight / maxWeight) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${(weight / maxWeight) * 100}%`,
                                                background: 'var(--color-brand-primary)',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Engellenen Kaynaklar */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-1">Engellenen Kaynaklar</p>
                <p className="text-[11px] text-muted mb-4">Seçtiğin kaynakların haberleri feed'inde çıkmaz</p>

                {feedPrefs.blocked_sources.length > 0 && (
                    <div className="space-y-2 mb-3">
                        {feedPrefs.blocked_sources.map(domain => (
                            <div
                                key={domain}
                                className="flex items-center justify-between px-3 py-2 rounded-lg"
                                style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)' }}
                            >
                                <span className="text-xs text-tx-secondary">{domain}</span>
                                <button
                                    onClick={() => removeBlockedSource(domain)}
                                    className="text-muted hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative" ref={searchRef}>
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
                        style={{
                            borderColor: searchOpen ? 'var(--color-brand-primary)' : 'var(--color-border)',
                            background: 'var(--color-base)',
                        }}
                    >
                        <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Kaynak ara..."
                            value={sourceQuery}
                            onChange={e => { setSourceQuery(e.target.value); setSearchOpen(true); }}
                            onFocus={() => setSearchOpen(true)}
                            className="flex-1 bg-transparent text-xs text-tx-primary placeholder:text-muted outline-none"
                        />
                    </div>
                    {searchOpen && sourceResults.length > 0 && (
                        <div
                            className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-10 overflow-hidden"
                            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                        >
                            {sourceResults.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => addBlockedSource(s)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand/5 transition-colors border-b last:border-0 text-left"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    <div>
                                        <p className="text-xs text-tx-primary font-medium">{s.name}</p>
                                        <p className="text-[10px] text-muted">{s.url}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {s.credibility_score && (
                                            <span className="text-[10px] text-muted">{s.credibility_score}</span>
                                        )}
                                        <Plus className="w-3.5 h-3.5 text-muted" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Gizlenen Kategoriler */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-1">Gizlenen Kategoriler</p>
                <p className="text-[11px] text-muted mb-4">Seçtiğin kategorilerin haberleri feed'inde görünmez</p>
                <div className="flex flex-wrap gap-2">
                    {feedPrefs.hidden_categories.map(cat => (
                        <div
                            key={cat}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs text-tx-secondary"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-base)' }}
                        >
                            <span className="capitalize">{cat}</span>
                            <button
                                onClick={() => removeHiddenCategory(cat)}
                                className="text-muted hover:text-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {CATEGORIES.filter(c => !feedPrefs.hidden_categories.includes(c)).map(cat => (
                        <button
                            key={cat}
                            onClick={() => addHiddenCategory(cat)}
                            className="flex items-center gap-1 px-3 py-1 rounded-full border text-xs text-muted hover:border-brand transition-colors capitalize"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-base)' }}
                        >
                            <Plus className="w-3 h-3" />
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileAiLab;
