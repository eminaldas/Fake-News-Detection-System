import React from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import {
    TrendingUp, MessageSquare, Search,
    AlertTriangle, CheckCircle, Flame,
    Clock, Zap, Newspaper, Activity, BookOpen,
    Globe, Heart, Cpu, Dumbbell, Music, Leaf, Star,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
    { key: 'gündem',    label: 'Gündem',    Icon: Newspaper  },
    { key: 'ekonomi',   label: 'Ekonomi',   Icon: TrendingUp },
    { key: 'sağlık',    label: 'Sağlık',    Icon: Heart      },
    { key: 'teknoloji', label: 'Teknoloji', Icon: Cpu        },
    { key: 'spor',      label: 'Spor',      Icon: Dumbbell   },
    { key: 'kültür',    label: 'Kültür',    Icon: Music      },
    { key: 'yaşam',     label: 'Yaşam',     Icon: Leaf       },
];

const SORT_OPTIONS = [
    { key: 'hot',           label: 'Popüler',    Icon: Flame   },
    { key: 'new',           label: 'Yeni',       Icon: Clock   },
    { key: 'controversial', label: 'Tartışmalı', Icon: Zap     },
];

const DISCOVER_OPTIONS = [
    { key: 'featured', label: 'Öne Çıkanlar',    Icon: Star     },
    { key: 'global',   label: 'Size Özel',        Icon: Globe    },
    { key: 'followed', label: 'Takip Ettiklerim', Icon: BookOpen },
];

const SYSTEM_TAGS = [
    '#doğrulandı', '#kaynak-yok', '#çelişki',
    '#yanıltıcı-başlık', '#bağlam-eksik', '#eski-haber', '#sahte-alıntı',
];

const SideCard = ({ children, className = '' }) => (
    <div
        className={`rounded-xl overflow-hidden ${className}`}
        style={{
            background: 'var(--color-bg-surface)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.32)',
        }}
    >
        {children}
    </div>
);

const SideHeader = ({ label, accent }) => (
    <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.18)' }}
    >
        {accent && (
            <div className="w-1 h-5 rounded-full shrink-0" style={{ background: 'var(--color-brand-primary)' }} />
        )}
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-text-primary)' }}>
            {label}
        </p>
    </div>
);

const SIDEBAR_STYLE = {
    position: 'sticky',
    top: '6rem',
    alignSelf: 'start',
};

const ForumLayout = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSort = searchParams.get('sort') ?? 'hot';

    const [trending,   setTrending]   = React.useState(null);
    const [tagSearch,  setTagSearch]  = React.useState(searchParams.get('tag') ?? '');

    React.useEffect(() => {
        axiosInstance.get('/forum/trending').then(r => setTrending(r.data)).catch(() => {});
    }, []);

const trendingTags  = trending?.trending_tags ?? [];
    const trendingStats = trending
        ? {
            active:      trending.trending_threads.length,
            underReview: trending.trending_threads.filter(t => t.status === 'under_review').length,
            resolved:    trending.trending_threads.filter(t => t.status === 'resolved').length,
        }
        : null;

    const setSort = (s) => {
        const next = new URLSearchParams(searchParams);
        next.set('sort', s);
        setSearchParams(next);
    };

    const applyTagSearch = (e) => {
        e.preventDefault();
        const next = new URLSearchParams(searchParams);
        if (tagSearch.trim()) next.set('tag', tagSearch.trim());
        else next.delete('tag');
        setSearchParams(next);
    };

    const navLinkActive = {
        background: 'rgba(16,185,129,0.10)',
        color: 'var(--color-brand-primary)',
        borderLeft: '2px solid var(--color-brand-primary)',
        paddingLeft: '10px',
    };
    const navLinkIdle = { color: 'var(--color-text-secondary)', paddingLeft: '12px' };

    return (
        <div className="w-full">
            <div
                className="max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6"
                style={{ display: 'grid', gridTemplateColumns: '300px 1fr 280px', gap: '20px' }}
            >

                {/* ══════════════════ SOL SIDEBAR ══════════════════ */}
                <aside className="flex flex-col gap-3" style={SIDEBAR_STYLE}>

                    {/* Keşfet */}
                    <SideCard>
                        <SideHeader label="Keşfet" accent />
                        <nav className="flex flex-col p-2 gap-0.5">
                            <NavLink
                                to="/forum"
                                end
                                className="flex items-center gap-3 py-3 pr-3 rounded-md text-sm font-semibold transition-colors"
                                style={({ isActive }) => isActive ? navLinkActive : navLinkIdle}
                            >
                                <Activity className="w-4 h-4 shrink-0" />
                                Tüm Tartışmalar
                            </NavLink>
                            {DISCOVER_OPTIONS.map(o => (
                                <button
                                    key={o.key}
                                    className="flex items-center gap-3 py-3 pl-3 pr-3 rounded-md text-sm font-semibold transition-colors text-left w-full hover:bg-white/5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    title="Yakında"
                                >
                                    <o.Icon className="w-4 h-4 shrink-0 opacity-40" />
                                    <span className="opacity-40">{o.label}</span>
                                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold"
                                          style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-accent-amber)' }}>
                                        YAKINDA
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </SideCard>

                    {/* Sırala */}
                    <SideCard>
                        <SideHeader label="Sırala" />
                        <nav className="flex flex-col p-2 gap-0.5">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSort(opt.key)}
                                    className="flex items-center gap-3 py-3 pr-3 rounded-md text-sm font-semibold transition-colors w-full text-left"
                                    style={currentSort === opt.key ? navLinkActive : navLinkIdle}
                                >
                                    <opt.Icon className="w-4 h-4 shrink-0" />
                                    {opt.label}
                                </button>
                            ))}
                        </nav>
                    </SideCard>


                    {/* Kategoriler */}
                    <SideCard>
                        <SideHeader label="Kategoriler" />
                        <nav className="flex flex-col p-2 gap-0.5">
                            {CATEGORIES.map(c => (
                                <NavLink
                                    key={c.key}
                                    to={`/forum?category=${c.key}`}
                                    className="flex items-center gap-3 py-3 pr-3 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
                                    style={({ isActive }) => isActive ? navLinkActive : navLinkIdle}
                                >
                                    <c.Icon className="w-4 h-4 shrink-0" />
                                    {c.label}
                                </NavLink>
                            ))}
                        </nav>
                    </SideCard>

                </aside>

                {/* ══════════════════ ORTA İÇERİK ══════════════════ */}
                <main className="min-w-0">
                    <Outlet />
                </main>

                {/* ══════════════════ SAĞ SIDEBAR ══════════════════ */}
                <aside className="flex flex-col gap-3" style={SIDEBAR_STYLE}>

                    {/* Arama */}
                    <SideCard>
                        <SideHeader label="Etiket Ara" accent />
                        <form onSubmit={applyTagSearch} className="p-3">
                            <div
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                                style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
                            >
                                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    value={tagSearch}
                                    onChange={e => setTagSearch(e.target.value)}
                                    placeholder="# ile ara..."
                                    className="bg-transparent outline-none flex-1 text-sm"
                                    style={{ color: 'var(--color-text-primary)' }}
                                />
                                {tagSearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setTagSearch(''); const n = new URLSearchParams(searchParams); n.delete('tag'); setSearchParams(n); }}
                                        className="text-xs transition-colors hover:text-brand"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {SYSTEM_TAGS.map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => { setTagSearch(tag); const n = new URLSearchParams(searchParams); n.set('tag', tag); setSearchParams(n); }}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold transition-opacity hover:opacity-70"
                                        style={{
                                            background: searchParams.get('tag') === tag ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.06)',
                                            color: 'var(--color-brand-primary)',
                                            border: `1px solid ${searchParams.get('tag') === tag ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.12)'}`,
                                        }}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </form>
                    </SideCard>

                    {/* Trend Etiketler */}
                    {trendingTags.length > 0 && (
                        <SideCard>
                            <SideHeader label="Trend Etiketler" />
                            <div className="flex flex-col p-3 gap-1">
                                {trendingTags.slice(0, 8).map(t => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum?tag=${encodeURIComponent(t.name)}`}
                                        className="flex items-center justify-between px-2 py-2 rounded-lg transition-colors hover:bg-white/5 group"
                                    >
                                        <span
                                            className="text-sm font-medium truncate group-hover:text-brand transition-colors"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            {t.name}
                                        </span>
                                        <span
                                            className="text-xs ml-2 shrink-0 px-2 py-0.5 rounded font-bold"
                                            style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--color-brand-primary)' }}
                                        >
                                            {t.usage_count}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </SideCard>
                    )}

                    {/* Popüler Tartışmalar */}
                    {trending?.trending_threads?.length > 0 && (
                        <SideCard>
                            <SideHeader label="Popüler Tartışmalar" />
                            <div className="flex flex-col p-3 gap-1">
                                {trending.trending_threads.slice(0, 6).map((t, i) => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum/${t.id}`}
                                        className="flex gap-3 px-2 py-2.5 rounded-lg transition-colors hover:bg-white/5 group"
                                    >
                                        <span
                                            className="text-xs font-black mt-0.5 shrink-0 w-5 text-right"
                                            style={{ color: 'var(--color-brand-primary)' }}
                                        >
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors"
                                                style={{ color: 'var(--color-text-secondary)' }}
                                            >
                                                {t.title}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                                {t.comment_count ?? 0} yorum
                                            </p>
                                        </div>
                                    </NavLink>
                                ))}
                            </div>
                        </SideCard>
                    )}

                    {/* Forum İstatistikleri */}
                    <SideCard>
                        <SideHeader label="Forum İstatistikleri" />
                        <div className="flex flex-col gap-0 p-1">
                            <div className="flex items-center justify-between px-3 py-3 rounded-lg"
                                 style={{ background: 'rgba(16,185,129,0.04)' }}>
                                <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <MessageSquare className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                                    Aktif Tartışma
                                </span>
                                <span className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                                    {trendingStats?.active ?? '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-3 rounded-lg">
                                <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--color-accent-amber)' }} />
                                    İnceleme Altında
                                </span>
                                <span className="text-sm font-black" style={{ color: 'var(--color-accent-amber)' }}>
                                    {trendingStats?.underReview ?? '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-3 rounded-lg">
                                <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                                    Çözüme Ulaşan
                                </span>
                                <span className="text-sm font-black" style={{ color: 'var(--color-brand-primary)' }}>
                                    {trendingStats?.resolved ?? '—'}
                                </span>
                            </div>
                        </div>
                    </SideCard>
                </aside>

            </div>
        </div>
    );
};

export default ForumLayout;
