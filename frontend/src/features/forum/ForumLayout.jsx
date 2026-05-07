import React from 'react';
import { NavLink, Outlet, useSearchParams, useLocation } from 'react-router-dom';
import {
    TrendingUp, MessageSquare, Search,
    AlertTriangle, CheckCircle, Flame,
    Clock, Zap, Activity, BookOpen,
    Globe, Star, ChevronRight,
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

const DISCOVER_OPTIONS = [
    { key: 'featured', label: 'Öne Çıkanlar',    Icon: Star     },
    { key: 'global',   label: 'Size Özel',        Icon: Globe    },
    { key: 'followed', label: 'Takip Ettiklerim', Icon: BookOpen },
];

const SYSTEM_TAGS = [
    '#doğrulandı', '#kaynak-yok', '#çelişki',
    '#yanıltıcı-başlık', '#bağlam-eksik', '#eski-haber', '#sahte-alıntı',
];

/* Section card — köşe aksan + border-b başlık */
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

/* Aktif nav item stili */
const activeStyle  = { color: 'var(--color-brand-primary)', borderLeftColor: 'var(--color-brand-primary)' };
const idleStyle    = { color: 'var(--color-text-primary)',  borderLeftColor: 'transparent' };

const ForumLayout = () => {
    const location    = useLocation();
    const isSearchPage = location.pathname === '/forum/search';
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSort = searchParams.get('sort') ?? 'hot';

    const [trending,  setTrending]  = React.useState(null);
    const [tagSearch, setTagSearch] = React.useState(searchParams.get('tag') ?? '');

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

    return (
        <div className="w-full">
            <div
                className="max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6"
                style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: '20px' }}
            >

                {/* ══════ SOL SIDEBAR ══════ */}
                <aside className="flex flex-col gap-4" style={SIDEBAR_STYLE}>

                    {/* Keşfet */}
                    <Block title="// keşfet">
                        <nav className="flex flex-col">
                            <NavLink
                                to="/forum"
                                end
                                className="flex items-center gap-3 px-4 py-2.5 border-l-2 font-mono text-sm font-semibold transition-colors"
                                style={({ isActive }) => isActive ? activeStyle : idleStyle}
                            >
                                <Activity className="w-4 h-4 shrink-0" />
                                Tüm Tartışmalar
                            </NavLink>
                            {DISCOVER_OPTIONS.map(o => (
                                <button
                                    key={o.key}
                                    className="flex items-center gap-3 px-4 py-2.5 border-l-2 border-transparent font-mono text-sm w-full text-left transition-opacity"
                                    style={{ color: 'var(--color-text-muted)', opacity: 0.45 }}
                                    title="Yakında"
                                    disabled
                                >
                                    <o.Icon className="w-4 h-4 shrink-0" />
                                    {o.label}
                                    <span
                                        className="ml-auto font-mono text-[9px] px-1.5 py-0.5 font-bold"
                                        style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-accent-amber)' }}
                                    >
                                        YAKINDA
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </Block>

                    {/* Sırala */}
                    <Block title="// sırala">
                        <nav className="flex flex-col">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSort(opt.key)}
                                    className="flex items-center gap-3 px-4 py-2.5 border-l-2 font-mono text-sm font-semibold w-full text-left transition-colors"
                                    style={currentSort === opt.key ? activeStyle : idleStyle}
                                >
                                    <opt.Icon className="w-4 h-4 shrink-0" />
                                    {opt.label}
                                </button>
                            ))}
                        </nav>
                    </Block>

                    {/* Marka kartı */}
                    <div className="relative border overflow-hidden" style={TS}>
                        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />
                        <div className="px-4 py-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm font-black tracking-widest"
                                      style={{ color: 'var(--color-brand-primary)' }}>NE_HABER</span>
                                <span className="font-mono text-[9px] px-1 py-0.5 border"
                                      style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)' }}>v2.4</span>
                            </div>
                            <p className="font-mono text-[10px] leading-relaxed"
                               style={{ color: 'var(--color-text-muted)' }}>
                                BERT tabanlı Türkçe<br />haber doğrulama platformu.
                            </p>
                            <div className="flex items-center gap-1.5 mt-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                <span className="font-mono text-[9px]"
                                      style={{ color: 'var(--color-brand-primary)' }}>SİSTEM AKTİF</span>
                            </div>
                        </div>
                    </div>

                </aside>

                {/* ══════ ORTA İÇERİK ══════ */}
                <main className="min-w-0">
                    <Outlet />
                </main>

                {/* ══════ SAĞ SIDEBAR ══════ */}
                <aside
                    className="flex flex-col gap-4"
                    style={isSearchPage ? { visibility: 'hidden' } : SIDEBAR_STYLE}
                >

                    {/* Etiket Ara */}
                    <Block title="// etiket_ara">
                        <form onSubmit={applyTagSearch} className="px-4 pb-3">
                            <div
                                className="flex items-center gap-2 border px-3 py-2.5 mb-3 transition-colors"
                                style={BD}
                                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-primary)'}
                                onBlur={e  => e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'}
                            >
                                <span className="font-mono text-sm shrink-0" style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                                <input
                                    value={tagSearch}
                                    onChange={e => setTagSearch(e.target.value)}
                                    placeholder="ara..."
                                    className="bg-transparent outline-none flex-1 font-mono text-sm"
                                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                />
                                {tagSearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setTagSearch(''); const n = new URLSearchParams(searchParams); n.delete('tag'); setSearchParams(n); }}
                                        className="font-mono text-xs transition-opacity hover:opacity-60"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {SYSTEM_TAGS.map(t => {
                                    const isActive = searchParams.get('tag') === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => { setTagSearch(t); const n = new URLSearchParams(searchParams); n.set('tag', t); setSearchParams(n); }}
                                            className="font-mono text-[10px] font-semibold px-2 py-0.5 border transition-opacity hover:opacity-80"
                                            style={{
                                                color:       'var(--color-brand-primary)',
                                                borderColor: isActive ? 'var(--color-brand-primary)' : 'rgba(16,185,129,0.25)',
                                                background:  isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
                                            }}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </form>
                    </Block>

                    {/* Trend Etiketler */}
                    {trendingTags.length > 0 && (
                        <Block title="// trend_etiketler">
                            <div className="flex flex-col">
                                {trendingTags.slice(0, 8).map((t, idx) => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum?tag=${encodeURIComponent(t.name)}`}
                                        className="flex items-center justify-between px-4 py-2.5 border-l-2 border-transparent font-mono text-sm transition-colors group"
                                        style={{ color: 'var(--color-text-primary)' }}
                                        onMouseEnter={e => e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
                                    >
                                        <span className="truncate group-hover:text-brand transition-colors">
                                            #{t.name}
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
                                { label: 'AKTİF TARTIŞMA',  value: trendingStats?.active,      icon: MessageSquare,  color: 'var(--color-brand-primary)' },
                                { label: 'İNCELEME ALTINDA', value: trendingStats?.underReview, icon: AlertTriangle,  color: 'var(--color-accent-amber)'  },
                                { label: 'ÇÖZÜME ULAŞAN',    value: trendingStats?.resolved,    icon: CheckCircle,    color: 'var(--color-brand-primary)' },
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
