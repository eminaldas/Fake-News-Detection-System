import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import axiosInstance from '../../api/axios';

const CATEGORIES = ['gündem', 'ekonomi', 'spor', 'sağlık', 'teknoloji', 'kültür', 'yaşam'];

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

/* Başlık border'ın üzerini keserek geçen section wrapper */
const Block = ({ title, sub, children, footer }) => (
    <div className="relative border" style={S}>
        <span
            className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
        >
            {title}
        </span>
        <div className="px-5 pt-6 pb-5">
            {sub && (
                <p className="font-mono text-xs mb-5 opacity-80 tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    {sub}
                </p>
            )}
            {children}
        </div>
        {footer && (
            <div className="border-t px-5 py-2 flex items-center justify-between" style={BD}>
                {footer}
            </div>
        )}
    </div>
);

const ProfileAiLab = () => {
    const [profile, setProfile]             = useState(null);
    const [feedPrefs, setFeedPrefs]         = useState({ blocked_sources: [], hidden_categories: [] });
    const [sourceQuery, setSourceQuery]     = useState('');
    const [sourceResults, setSourceResults] = useState([]);
    const [searchOpen, setSearchOpen]       = useState(false);
    const searchRef                         = useRef(null);

    useEffect(() => {
        axiosInstance.get('/users/me/feed-preferences').then(r => setFeedPrefs(r.data)).catch(() => {});
        axiosInstance.get('/users/me/preference-profile').then(r => setProfile(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (sourceQuery.length < 1) { setSourceResults([]); return; }
        const t = setTimeout(() => {
            axiosInstance.get(`/sources/?search=${encodeURIComponent(sourceQuery)}&limit=6`)
                .then(r => setSourceResults(r.data)).catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [sourceQuery]);

    useEffect(() => {
        const handler = e => {
            if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const removeBlockedSource = async domain => {
        setFeedPrefs(prev => ({ ...prev, blocked_sources: prev.blocked_sources.filter(s => s !== domain) }));
        await axiosInstance.patch('/users/me/feed-preferences', { remove_blocked_source: domain }).catch(() => {});
    };
    const addBlockedSource = async source => {
        if (feedPrefs.blocked_sources.includes(source.url)) return;
        setFeedPrefs(prev => ({ ...prev, blocked_sources: [...prev.blocked_sources, source.url] }));
        setSourceQuery(''); setSourceResults([]); setSearchOpen(false);
        await axiosInstance.patch('/users/me/feed-preferences', { add_blocked_source: source.url }).catch(() => {});
    };
    const removeHiddenCategory = async cat => {
        setFeedPrefs(prev => ({ ...prev, hidden_categories: prev.hidden_categories.filter(c => c !== cat) }));
        await axiosInstance.patch('/users/me/feed-preferences', { remove_hidden_category: cat }).catch(() => {});
    };
    const addHiddenCategory = async cat => {
        if (feedPrefs.hidden_categories.includes(cat)) return;
        setFeedPrefs(prev => ({ ...prev, hidden_categories: [...prev.hidden_categories, cat] }));
        await axiosInstance.patch('/users/me/feed-preferences', { add_hidden_category: cat }).catch(() => {});
    };

    const categoryWeights = profile?.category_weights ?? {};
    const hasWeights      = Object.keys(categoryWeights).length > 0;
    const maxWeight       = hasWeights ? Math.max(...Object.values(categoryWeights)) : 1;
    const SEGS            = 12;

    return (
        <div className="space-y-6">

            {/* ── Kategori Ağırlık Matrisi ── */}
            <Block
                title="// category_weight_matrix"
                sub="read_only · davranışına göre otomatik güncellenir"
                footer={
                    <>
                        <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                            // AUTO_CALIBRATE
                        </span>
                        <span className="font-mono text-[10px] tracking-widest opacity-50" style={{ color: 'var(--color-brand-primary)' }}>
                            v1.0
                        </span>
                    </>
                }
            >
                {!hasWeights ? (
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <span style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                        {' '}daha fazla haber incele — model kalibre olacak
                    </p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(categoryWeights)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, weight]) => {
                                const pct   = Math.round((weight / maxWeight) * 100);
                                const filled = Math.round((pct / 100) * SEGS);
                                return (
                                    <div key={cat} className="flex items-center gap-3">
                                        <span
                                            className="font-mono text-xs w-24 shrink-0 capitalize"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            {cat}
                                        </span>
                                        <div className="flex gap-[2px] flex-1">
                                            {Array.from({ length: SEGS }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="h-3 flex-1 transition-all duration-500"
                                                    style={{
                                                        background: i < filled
                                                            ? 'var(--color-brand-primary)'
                                                            : 'var(--color-terminal-border-raw)',
                                                        opacity: i < filled ? (0.4 + (i / SEGS) * 0.6) : 1,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span
                                            className="font-mono text-xs w-8 text-right shrink-0"
                                            style={{ color: 'var(--color-brand-primary)' }}
                                        >
                                            {pct}%
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </Block>

            {/* ── Engellenen Kaynaklar ── */}
            <Block
                title="// blocked_sources"
                sub="seçtiğin kaynakların içerikleri feed'ine düşmez"
                footer={
                    <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                        // FEED_FILTER_ACTIVE
                    </span>
                }
            >
                {/* Engelli kaynak listesi */}
                {feedPrefs.blocked_sources.length > 0 && (
                    <div className="mb-4 border" style={BD}>
                        {feedPrefs.blocked_sources.map((domain, idx) => (
                            <div
                                key={domain}
                                className={`flex items-center justify-between px-4 py-2.5 ${idx < feedPrefs.blocked_sources.length - 1 ? 'border-b' : ''}`}
                                style={BD}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-mono text-xs shrink-0" style={{ color: '#ff7351' }}>[ × ]</span>
                                    <span className="font-mono text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{domain}</span>
                                </div>
                                <button
                                    onClick={() => removeBlockedSource(domain)}
                                    className="shrink-0 ml-2 p-1 transition-colors hover:opacity-100 opacity-40"
                                    style={{ color: '#ff7351' }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Arama */}
                <div className="relative" ref={searchRef}>
                    <div
                        className="flex items-center gap-2.5 px-4 py-3 border transition-colors"
                        style={{
                            borderColor: searchOpen ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                            background: 'var(--color-bg-base)',
                        }}
                    >
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                        <input
                            type="text"
                            placeholder="kaynak ara..."
                            value={sourceQuery}
                            onChange={e => { setSourceQuery(e.target.value); setSearchOpen(true); }}
                            onFocus={() => setSearchOpen(true)}
                            className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:opacity-50"
                            style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                        />
                        {sourceQuery && (
                            <button onClick={() => { setSourceQuery(''); setSourceResults([]); }}>
                                <X className="w-3.5 h-3.5 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        )}
                    </div>

                    {searchOpen && sourceResults.length > 0 && (
                        <div
                            className="absolute top-full left-0 right-0 border border-t-0 z-10 overflow-hidden"
                            style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' }}
                        >
                            {sourceResults.map((s, idx) => (
                                <button
                                    key={s.id}
                                    onClick={() => addBlockedSource(s)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-brand/5 ${idx < sourceResults.length - 1 ? 'border-b' : ''}`}
                                    style={BD}
                                >
                                    <div className="min-w-0">
                                        <p className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</p>
                                        <p className="font-mono text-[10px] opacity-60 truncate" style={{ color: 'var(--color-text-muted)' }}>{s.url}</p>
                                    </div>
                                    <span className="font-mono text-xs ml-3 shrink-0 px-2 py-0.5 border" style={{ color: '#ff7351', borderColor: '#ff735140' }}>
                                        ENGELLE
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Block>

            {/* ── Kategori Maskesi ── */}
            <Block
                title="// category_mask"
                sub="kapalı kategorilerin haberleri feed'inde görünmez"
                footer={
                    <>
                        <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                            {feedPrefs.hidden_categories.length > 0
                                ? `${feedPrefs.hidden_categories.length} kategori gizlendi`
                                : '// tüm kategoriler aktif'}
                        </span>
                        <span className="font-mono text-[10px] tracking-widest opacity-50" style={{ color: 'var(--color-brand-primary)' }}>
                            {CATEGORIES.length - feedPrefs.hidden_categories.length}/{CATEGORIES.length}
                        </span>
                    </>
                }
            >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => {
                        const isHidden = feedPrefs.hidden_categories.includes(cat);
                        return (
                            <button
                                key={cat}
                                onClick={() => isHidden ? removeHiddenCategory(cat) : addHiddenCategory(cat)}
                                className="flex items-center gap-2 px-3 py-2.5 border text-left transition-all"
                                style={{
                                    borderColor: isHidden ? 'var(--color-terminal-border-raw)' : 'var(--color-brand-primary)',
                                    background: isHidden ? 'transparent' : 'rgba(16,185,129,0.06)',
                                }}
                            >
                                <span
                                    className="font-mono text-xs font-black tracking-wider shrink-0"
                                    style={{ color: isHidden ? '#ff735180' : 'var(--color-brand-primary)' }}
                                >
                                    {isHidden ? 'OFF' : ' ON'}
                                </span>
                                <span
                                    className="font-mono text-xs capitalize"
                                    style={{ color: isHidden ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
                                >
                                    {cat}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Block>

        </div>
    );
};

export default ProfileAiLab;
