import React from 'react';
import { NavLink, Outlet, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
    MessageSquare, Search, Hash, Activity,
    AlertTriangle, CheckCircle, Flame,
    Clock, Zap,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import LoginNudgeModal from '../../components/ui/LoginNudgeModal';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

const SORT_OPTIONS = [
    { key: 'hot',           label: 'Popüler',    Icon: Flame },
    { key: 'new',           label: 'Yeni',       Icon: Clock },
    { key: 'controversial', label: 'Tartışmalı', Icon: Zap   },
];

const Block = ({ icon: Icon, label, children }) => (
    <div className="relative border overflow-hidden" style={TS}>
        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />
        <div className="px-4 py-3 flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5" style={{ color: 'var(--color-brand-primary)' }} />}
            {label && (
                <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
            )}
        </div>
        <div style={{ borderLeft: '3px solid var(--color-forum-left-border)' }}>
            {children}
        </div>
    </div>
);

const SIDEBAR_STYLE = { position: 'sticky', top: '6rem', alignSelf: 'start', paddingTop: '46px' };

const ForumLayout = () => {
    const { isAuthenticated } = useAuth();
    const location     = useLocation();
    const navigate     = useNavigate();
    const isSearchPage = location.pathname === '/forum/search';
    const isThreadPage = /^\/forum\/[^/]+$/.test(location.pathname) && !isSearchPage;
    const [searchParams, setSearchParams] = useSearchParams();

    // Paylaşılan thread: ilk ziyarette içeriği göster, yenileyince modal
    const [threadAllowed] = React.useState(() => {
        if (!isThreadPage || isAuthenticated) return true;
        const key = `forum_thread_seen_${location.pathname}`;
        const seen = sessionStorage.getItem(key);
        if (!seen) {
            sessionStorage.setItem(key, '1');
            return true;   // ilk ziyaret: izin ver
        }
        return false;      // daha önce görüldü: modal
    });

    const showLoginWall = !isAuthenticated && !threadAllowed;
    const showFeedWall  = !isAuthenticated && !isThreadPage;
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
            {(showLoginWall || showFeedWall) && <LoginNudgeModal />}
            <div
                className="max-w-[1400px] mx-auto w-full px-4 md:px-6 py-6 flex flex-col lg:grid lg:gap-5"
                style={{ gridTemplateColumns: '1fr 320px' }}
            >
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
                    {/* ── Arama ── */}
                    <Block icon={Search} label="Ara">
                        <form onSubmit={handleSearch} className="px-4 py-4 relative">
                            {/* Decorative dot grid */}
                            <div
                                className="absolute top-3 right-4 w-16 h-10 pointer-events-none"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, var(--color-brand-primary) 1px, transparent 1px)',
                                    backgroundSize:  '6px 6px',
                                    opacity: 0.08,
                                }}
                            />
                            <div
                                className="relative flex items-center gap-2 border px-3 py-2.5 transition-all duration-200"
                                style={{
                                    borderColor: searchFocused ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                    background:  searchFocused ? 'rgba(16,185,129,0.04)' : 'transparent',
                                    boxShadow:   searchFocused ? '0 0 0 3px rgba(16,185,129,0.08)' : 'none',
                                }}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            >
                                {/* İç köşe aksanları */}
                                <div className="absolute top-0 left-0 w-2 h-[2px] pointer-events-none transition-opacity duration-200"
                                     style={{ background: 'var(--color-brand-primary)', opacity: searchFocused ? 1 : 0.35 }} />
                                <div className="absolute top-0 left-0 h-2 w-[2px] pointer-events-none transition-opacity duration-200"
                                     style={{ background: 'var(--color-brand-primary)', opacity: searchFocused ? 1 : 0.35 }} />
                                <div className="absolute bottom-0 right-0 w-2 h-[2px] pointer-events-none transition-opacity duration-200"
                                     style={{ background: 'var(--color-brand-primary)', opacity: searchFocused ? 1 : 0.35 }} />
                                <div className="absolute bottom-0 right-0 h-2 w-[2px] pointer-events-none transition-opacity duration-200"
                                     style={{ background: 'var(--color-brand-primary)', opacity: searchFocused ? 1 : 0.35 }} />

                                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="gönderi, kişi, etiket..."
                                    className="bg-transparent outline-none flex-1 font-mono text-sm"
                                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                />
                                {searchQuery && (
                                    <kbd
                                        className="font-mono text-[9px] px-1.5 py-0.5 shrink-0"
                                        style={{
                                            background: 'rgba(16,185,129,0.15)',
                                            color:      'var(--color-brand-primary)',
                                            border:     '1px solid rgba(16,185,129,0.30)',
                                        }}
                                    >
                                        ↵
                                    </kbd>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                    Enter ile ara
                                </p>
                                <p className="font-mono text-[10px]" style={{ color: 'var(--color-brand-primary)', opacity: 0.50 }}>
                                    /search
                                </p>
                            </div>
                        </form>
                    </Block>

                    {/* ── Trend Etiketler ── */}
                    {trendingTags.length > 0 && (
                        <Block icon={Hash} label="Trend Etiketler">
                            <div className="flex flex-col">
                                {trendingTags.slice(0, 8).map((t, idx, arr) => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum?tag=${encodeURIComponent(t.name.replace(/^#/, ''))}`}
                                        className="flex items-center px-4 py-2.5 font-mono text-sm font-bold"
                                        style={{
                                            color:        'var(--color-text-primary)',
                                            borderBottom: idx < arr.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none',
                                            transition:   'background 0.18s ease, padding-left 0.18s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background  = 'rgba(16,185,129,0.08)';
                                            e.currentTarget.style.paddingLeft = '22px';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background  = 'transparent';
                                            e.currentTarget.style.paddingLeft = '16px';
                                        }}
                                    >
                                        <span className="truncate">
                                            <span style={{ color: 'var(--color-brand-primary)' }}>#</span>
                                            {t.name.replace(/^#/, '')}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </Block>
                    )}

                    {/* ── Popüler Tartışmalar ── */}
                    {trending?.trending_threads?.length > 0 && (
                        <Block icon={Flame} label="Popüler">
                            <div className="flex flex-col">
                                {trending.trending_threads.slice(0, 6).map((t, i, arr) => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum/${t.id}`}
                                        className="flex gap-3 px-4 py-3 group"
                                        style={{
                                            borderBottom: i < arr.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none',
                                            transition:   'background 0.18s ease, padding-left 0.18s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background  = 'rgba(16,185,129,0.08)';
                                            e.currentTarget.style.paddingLeft = '20px';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background  = 'transparent';
                                            e.currentTarget.style.paddingLeft = '16px';
                                        }}
                                    >
                                        <span
                                            className="font-mono text-xs font-black mt-0.5 shrink-0 w-5 text-right"
                                            style={{ color: 'var(--color-brand-primary)' }}
                                        >
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="font-mono text-sm font-bold leading-snug line-clamp-2"
                                                style={{ color: 'var(--color-text-primary)' }}
                                            >
                                                {t.title}
                                            </p>
                                            <p className="font-mono text-[10px] mt-1 tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                                                {t.comment_count ?? 0} yorum
                                            </p>
                                        </div>
                                    </NavLink>
                                ))}
                            </div>
                        </Block>
                    )}

                    {/* ── Forum İstatistikleri ── */}
                    <Block icon={Activity} label="Forum Stats">
                        <div className="flex flex-col">
                            {[
                                { label: 'Aktif Tartışma',   value: trendingStats?.active,      icon: MessageSquare, color: 'var(--color-brand-primary)' },
                                { label: 'İnceleme Altında', value: trendingStats?.underReview, icon: AlertTriangle, color: 'var(--color-accent-amber)'  },
                                { label: 'Çözüme Ulaşan',    value: trendingStats?.resolved,    icon: CheckCircle,   color: 'var(--color-brand-primary)' },
                            ].map(({ label, value, icon: StatIcon, color }, idx, arr) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between px-4 py-3 cursor-default group"
                                    style={{
                                        borderBottom: idx < arr.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none',
                                        transition:   'background 0.18s ease, padding-left 0.18s ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background  = 'rgba(16,185,129,0.05)';
                                        e.currentTarget.style.paddingLeft = '20px';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background  = 'transparent';
                                        e.currentTarget.style.paddingLeft = '16px';
                                    }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <StatIcon
                                            className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                                            style={{ color }}
                                        />
                                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                            {label}
                                        </span>
                                    </div>
                                    <span
                                        className="font-mono text-lg font-black transition-transform duration-200 group-hover:scale-110 origin-right"
                                        style={{ color }}
                                    >
                                        {value ?? '—'}
                                    </span>
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
