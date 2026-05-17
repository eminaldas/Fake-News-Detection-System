import React from 'react';
import { NavLink, Outlet, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
    MessageSquare, Search,
    AlertTriangle, CheckCircle, Flame,
    Clock, Zap,
    ChevronRight,
} from 'lucide-react';
import axiosInstance from '../../api/axios';

/* ── Tasarım sabitleri ── */
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const SORT_OPTIONS = [
    { key: 'hot',           label: 'Popüler',    Icon: Flame   },
    { key: 'new',           label: 'Yeni',       Icon: Clock   },
    { key: 'controversial', label: 'Tartışmalı', Icon: Zap     },
];


const Block = ({ title, children }) => (
    <div className="relative border overflow-hidden" style={TS}>
        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />
        <div className="px-4 py-3 border-b" style={BD}>
            <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                {title}
            </span>
        </div>
        <div>{children}</div>
    </div>
);

const SIDEBAR_STYLE = { position: 'sticky', top: '6rem', alignSelf: 'start' };

const ForumLayout = () => {
    const location     = useLocation();
    const navigate     = useNavigate();
    const isSearchPage = location.pathname === '/forum/search';
    const isThreadPage = /^\/forum\/[^/]+$/.test(location.pathname) && !isSearchPage;
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSort  = searchParams.get('sort') ?? 'hot';

    const [trending,      setTrending]     = React.useState(null);
    const [searchQuery,   setSearchQuery]  = React.useState('');
    const [searchFocused, setSearchFocused] = React.useState(false);

    React.useEffect(() => {
        axiosInstance.get('/forum/trending').then(r => setTrending(r.data)).catch(() => {});
    }, []);

    const trendingTags  = (trending?.trending_tags ?? []).filter(t => (t.usage_count ?? 0) > 0);
    const trendingStats = trending ? {
        active:      trending.trending_threads.length,
        underReview: trending.trending_threads.filter(t => t.status === 'under_review').length,
        resolved:    trending.trending_threads.filter(t => t.status === 'resolved').length,
    } : null;

    const setSort = (s) => {
        if (isThreadPage) { navigate(`/forum?sort=${s}`); return; }
        const next = new URLSearchParams(searchParams);
        next.set('sort', s);
        setSearchParams(next);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) { navigate('/forum/search'); return; }
        navigate(`/forum/search?q=${encodeURIComponent(q)}&tab=posts`);
        setSearchQuery('');
    };


    return (
        <div className="w-full">
            <div className="max-w-[1400px] mx-auto w-full px-4 md:px-6 py-6 flex flex-col lg:grid lg:gap-5"
                 style={{ gridTemplateColumns: '1fr 260px' }}>

                {/* ══════ ORTA İÇERİK ══════ */}
                <main className="min-w-0">
                    {!isSearchPage && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            {SORT_OPTIONS.map(opt => {
                                const active = currentSort === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        onClick={() => setSort(opt.key)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold border transition-all"
                                        style={{
                                            background:  active ? 'var(--color-brand-primary)' : 'var(--color-terminal-surface)',
                                            borderColor: active ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                            color:       active ? '#070f12' : 'var(--color-text-primary)',
                                        }}
                                    >
                                        <opt.Icon className="w-3.5 h-3.5" />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <Outlet />
                </main>

                {/* ══════ SAĞ SIDEBAR ══════ */}
                <aside
                    className="hidden lg:flex flex-col gap-4"
                    style={isSearchPage ? { visibility: 'hidden' } : SIDEBAR_STYLE}
                >

                    {/* Genel Arama */}
                    <Block title="// ara">
                        <form onSubmit={handleSearch} className="px-4 py-3">
                            <div
                                className="flex items-center gap-2 border px-3 py-2.5 transition-colors"
                                style={{ borderColor: searchFocused ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)' }}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            >
                                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="gönderi, kişi, etiket..."
                                    className="bg-transparent outline-none flex-1 font-mono text-sm"
                                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                />
                            </div>
                            <p className="font-mono text-[10px] mt-2 opacity-50" style={{ color: 'var(--color-text-muted)' }}>
                                Enter ile ara
                            </p>
                        </form>
                    </Block>

                    {/* Trend Etiketler */}
                    {trendingTags.length > 0 && (
                        <Block title="// trend_etiketler">
                            <div className="flex flex-col">
                                {trendingTags.slice(0, 8).map((t) => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum?tag=${encodeURIComponent(t.name.replace(/^#/, ''))}`}
                                        className="flex items-center justify-between px-4 py-2.5 border-l-2 border-transparent font-mono text-sm transition-colors group"
                                        style={{ color: 'var(--color-text-primary)' }}
                                        onMouseEnter={e => e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
                                    >
                                        <span className="truncate group-hover:text-brand transition-colors">
                                            #{t.name.replace(/^#/, '')}
                                        </span>
                                        <span
                                            className="font-mono text-xs font-bold shrink-0 ml-2 px-1.5 py-0.5 border"
                                            style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.25)' }}
                                        >
                                            {t.usage_count}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </Block>
                    )}

                    {/* Popüler Tartışmalar */}
                    {trending?.trending_threads?.length > 0 && (
                        <Block title="// popüler">
                            <div className="flex flex-col">
                                {trending.trending_threads.slice(0, 6).map((t, i) => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum/${t.id}`}
                                        className="flex gap-3 px-4 py-3 border-l-2 border-transparent transition-colors group"
                                        onMouseEnter={e => e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
                                    >
                                        <span
                                            className="font-mono text-xs font-black mt-0.5 shrink-0 w-5 text-right"
                                            style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }}
                                        >
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="font-mono text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors"
                                                style={{ color: 'var(--color-text-primary)' }}
                                            >
                                                {t.title}
                                            </p>
                                            <p className="font-mono text-[10px] mt-1 tracking-wide" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                                {t.comment_count ?? 0} yorum
                                            </p>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--color-brand-primary)' }} />
                                    </NavLink>
                                ))}
                            </div>
                        </Block>
                    )}

                    {/* Forum İstatistikleri */}
                    <Block title="// forum_stats">
                        <div className="px-4 pb-2 flex flex-col gap-0">
                            {[
                                { label: 'AKTİF TARTIŞMA',   value: trendingStats?.active,      icon: MessageSquare, color: 'var(--color-brand-primary)' },
                                { label: 'İNCELEME ALTINDA', value: trendingStats?.underReview, icon: AlertTriangle, color: 'var(--color-accent-amber)'  },
                                { label: 'ÇÖZÜME ULAŞAN',    value: trendingStats?.resolved,    icon: CheckCircle,   color: 'var(--color-brand-primary)' },
                            ].map(({ label, value, icon: Icon, color }, idx, arr) => (
                                <div key={label}>
                                    <div className="flex items-center justify-between py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                                            <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--color-text-primary)' }}>
                                                {label}
                                            </span>
                                        </div>
                                        <span className="font-mono text-sm font-black" style={{ color }}>
                                            {value ?? '—'}
                                        </span>
                                    </div>
                                    {idx < arr.length - 1 && <div className="h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />}
                                </div>
                            ))}
                        </div>
                    </Block>

                </aside>
            </div>
        </div>
    );
};

export default ForumLayout;
