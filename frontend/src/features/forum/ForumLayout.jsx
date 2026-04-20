import React from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import {
    TrendingUp, Tag, MessageSquare,
    AlertTriangle, CheckCircle, Flame, Hash,
    Clock, Zap, Newspaper, Activity, BookOpen,
    Globe, Heart, Cpu, Dumbbell, Music, Leaf, Star,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
    { key: 'gundem',    label: 'Gündem',    Icon: Newspaper  },
    { key: 'ekonomi',   label: 'Ekonomi',   Icon: TrendingUp },
    { key: 'saglik',    label: 'Sağlık',    Icon: Heart      },
    { key: 'teknoloji', label: 'Teknoloji', Icon: Cpu        },
    { key: 'spor',      label: 'Spor',      Icon: Dumbbell   },
    { key: 'kultur',    label: 'Kültür',    Icon: Music      },
    { key: 'yasam',     label: 'Yaşam',     Icon: Leaf       },
];

const SORT_OPTIONS = [
    { key: 'hot',           label: 'Popüler',    Icon: Flame   },
    { key: 'new',           label: 'Yeni',       Icon: Clock   },
    { key: 'controversial', label: 'Tartışmalı', Icon: Zap     },
];

const DISCOVER_OPTIONS = [
    { key: 'featured', label: 'Öne Çıkanlar', Icon: Star        },
    { key: 'global',   label: 'Size Özel',    Icon: Globe       },
    { key: 'followed', label: 'Takip Ettiklerim', Icon: BookOpen },
];

const SYSTEM_TAGS = [
    '#doğrulandı', '#kaynak-yok', '#çelişki',
    '#yanıltıcı-başlık', '#bağlam-eksik', '#eski-haber', '#sahte-alıntı',
];

const SideCard = ({ children, className = '' }) => (
    <div
        className={`rounded-xl border overflow-hidden ${className}`}
        style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
        }}
    >
        {children}
    </div>
);

const SideHeader = ({ label, accent }) => (
    <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'rgba(0,0,0,0.15)' }}
    >
        {accent && (
            <div className="w-1 h-4 rounded-full shrink-0" style={{ background: 'var(--color-brand-primary)' }} />
        )}
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
        </p>
    </div>
);

const ForumLayout = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentSort = searchParams.get('sort') ?? 'hot';

    const [trending, setTrending] = React.useState(null);
    const [trust,    setTrust]    = React.useState(null);

    React.useEffect(() => {
        axiosInstance.get('/forum/trending').then(r => setTrending(r.data)).catch(() => {});
    }, []);

    React.useEffect(() => {
        axiosInstance.get('/users/me/trust').then(r => setTrust(r.data)).catch(() => {});
    }, []);

    const trendingTags  = trending?.trending_tags ?? [];
    const trendingStats = trending
        ? {
            active:      trending.trending_threads.length,
            underReview: trending.trending_threads.filter(t => t.status === 'under_review').length,
        }
        : null;

    const setSort = (s) => {
        const next = new URLSearchParams(searchParams);
        next.set('sort', s);
        setSearchParams(next);
    };

    const navLinkStyle = (isActive) => isActive
        ? {
            background: 'rgba(16,185,129,0.09)',
            color: 'var(--color-brand-primary)',
            borderLeft: '2px solid var(--color-brand-primary)',
            paddingLeft: '10px',
        }
        : { color: 'var(--color-text-secondary)', paddingLeft: '12px' };

    return (
        <div className="w-full">
            <div
                className="max-w-[1400px] mx-auto w-full px-5 md:px-6 py-6 gap-5"
                style={{ display: 'grid', gridTemplateColumns: '216px 1fr 200px' }}
            >

                {/* ══════════════════ SOL SIDEBAR ══════════════════ */}
                <aside
                    className="flex flex-col gap-3"
                    style={{ position: 'sticky', top: '9rem', alignSelf: 'start' }}
                >
                        {/* Keşfet */}
                    <SideCard>
                        <SideHeader label="Keşfet" accent />
                        <nav className="flex flex-col p-2 gap-0.5">
                            <NavLink
                                to="/forum"
                                end
                                className="flex items-center gap-3 py-2.5 pr-3 rounded-md text-xs font-semibold transition-colors"
                                style={({ isActive }) => navLinkStyle(isActive)}
                            >
                                <Activity className="w-3.5 h-3.5 shrink-0" />
                                Tüm Tartışmalar
                            </NavLink>
                            {DISCOVER_OPTIONS.map(o => (
                                <button
                                    key={o.key}
                                    className="flex items-center gap-3 py-2.5 pl-3 pr-3 rounded-md text-xs font-semibold transition-colors text-left w-full hover:bg-white/5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    title="Yakında"
                                >
                                    <o.Icon className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                    <span className="opacity-50">{o.label}</span>
                                    <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold"
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
                                    className="flex items-center gap-3 py-2.5 pr-3 rounded-md text-xs font-semibold transition-colors w-full text-left"
                                    style={currentSort === opt.key ? {
                                        background: 'rgba(16,185,129,0.09)',
                                        color: 'var(--color-brand-primary)',
                                        borderLeft: '2px solid var(--color-brand-primary)',
                                        paddingLeft: '10px',
                                    } : {
                                        color: 'var(--color-text-secondary)',
                                        paddingLeft: '12px',
                                    }}
                                >
                                    <opt.Icon className="w-3.5 h-3.5 shrink-0" />
                                    {opt.label}
                                </button>
                            ))}
                        </nav>
                    </SideCard>

                    {/* Kullanıcı Trust Kartı */}
                    {user && (
                        <SideCard>
                            <div className="p-3">
                                <p className="text-xs font-bold truncate mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                                    {user.username}
                                </p>
                                {trust ? (
                                    <>
                                        <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--color-brand-primary)' }}>
                                            {'★'.repeat(Math.min(trust.stars, 5))} {trust.display_label}
                                        </p>
                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${Math.min(trust.score, 100)}%`, background: 'var(--color-brand-primary)' }}
                                            />
                                        </div>
                                        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                            Güven: {trust.score.toFixed(0)}/100
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Yeni Üye</p>
                                )}
                            </div>
                        </SideCard>
                    )}

                    {/* Kategoriler */}
                    <SideCard>
                        <SideHeader label="Kategoriler" />
                        <nav className="flex flex-col p-2 gap-0.5">
                            {CATEGORIES.map(c => (
                                <NavLink
                                    key={c.key}
                                    to={`/forum?category=${c.key}`}
                                    className="flex items-center gap-3 py-2.5 pr-3 rounded-md text-xs font-medium transition-colors hover:bg-white/5"
                                    style={({ isActive }) => isActive
                                        ? { color: 'var(--color-brand-primary)', paddingLeft: '10px', borderLeft: '2px solid var(--color-brand-primary)' }
                                        : { color: 'var(--color-text-secondary)', paddingLeft: '12px' }
                                    }
                                >
                                    <c.Icon className="w-3.5 h-3.5 shrink-0" />
                                    {c.label}
                                </NavLink>
                            ))}
                        </nav>
                    </SideCard>

                    {/* Etiketler */}
                    <SideCard>
                        <SideHeader label="Etiketler" />
                        <div className="p-3 flex flex-wrap gap-1.5">
                            {SYSTEM_TAGS.map(tag => (
                                <NavLink
                                    key={tag}
                                    to={`/forum?tag=${encodeURIComponent(tag)}`}
                                    className="px-2 py-0.5 rounded text-[9px] font-semibold transition-opacity hover:opacity-70"
                                    style={{
                                        background: 'rgba(16,185,129,0.07)',
                                        color: 'var(--color-brand-primary)',
                                        border: '1px solid rgba(16,185,129,0.14)',
                                    }}
                                >
                                    {tag}
                                </NavLink>
                            ))}
                        </div>
                    </SideCard>
                </aside>

                {/* ══════════════════ ORTA İÇERİK ══════════════════ */}
                <main className="min-w-0">
                    <Outlet />
                </main>

                {/* ══════════════════ SAĞ SIDEBAR ══════════════════ */}
                <aside
                    className="flex flex-col gap-3"
                    style={{ position: 'sticky', top: '9rem', alignSelf: 'start' }}
                >
                    {/* Forum İstatistikleri */}
                    <SideCard>
                        <SideHeader label="İstatistikler" />
                        <div className="flex flex-col gap-3 p-4 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                    <MessageSquare className="w-3 h-3" /> Aktif
                                </span>
                                <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {trendingStats?.active ?? '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                    <AlertTriangle className="w-3 h-3" /> İnceleme
                                </span>
                                <span className="font-bold" style={{ color: 'var(--color-accent-amber)' }}>
                                    {trendingStats?.underReview ?? '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                    <CheckCircle className="w-3 h-3" /> Çözüldü
                                </span>
                                <span className="font-bold" style={{ color: 'var(--color-brand-primary)' }}>—</span>
                            </div>
                        </div>
                    </SideCard>

                    {/* Trend Etiketler */}
                    {trendingTags.length > 0 && (
                        <SideCard>
                            <SideHeader label="Trend Etiketler" />
                            <div className="flex flex-col gap-2 p-4">
                                {trendingTags.slice(0, 7).map(t => (
                                    <NavLink
                                        key={t.id}
                                        to={`/forum?tag=${encodeURIComponent(t.name)}`}
                                        className="flex items-center justify-between group"
                                    >
                                        <span
                                            className="text-xs font-medium group-hover:text-brand transition-colors truncate"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            {t.name}
                                        </span>
                                        <span
                                            className="text-[9px] ml-2 shrink-0 px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(16,185,129,0.07)', color: 'var(--color-brand-primary)' }}
                                        >
                                            {t.usage_count}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </SideCard>
                    )}

                    {/* Trend Thread'ler */}
                    {trending?.trending_threads?.length > 0 && (
                        <SideCard>
                            <SideHeader label="Popüler" />
                            <div className="flex flex-col gap-3 p-4">
                                {trending.trending_threads.slice(0, 5).map((t, i) => (
                                    <NavLink key={t.id} to={`/forum/${t.id}`} className="flex gap-2.5 group">
                                        <span
                                            className="text-[10px] font-black mt-0.5 shrink-0 w-4"
                                            style={{ color: 'var(--color-brand-primary)' }}
                                        >
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span
                                            className="text-xs leading-snug line-clamp-2 group-hover:text-brand transition-colors"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            {t.title}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </SideCard>
                    )}
                </aside>

            </div>
        </div>
    );
};

export default ForumLayout;
