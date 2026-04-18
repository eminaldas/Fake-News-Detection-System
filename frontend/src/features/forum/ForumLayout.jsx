import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    TrendingUp, Tag, Plus, MessageSquare,
    AlertTriangle, CheckCircle, Globe, Zap,
    BookOpen, Heart, Activity, ShoppingBag, Home,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
    { key: 'gündem',    label: 'Gündem',    Icon: Globe },
    { key: 'ekonomi',   label: 'Ekonomi',   Icon: TrendingUp },
    { key: 'sağlık',    label: 'Sağlık',    Icon: Heart },
    { key: 'teknoloji', label: 'Teknoloji', Icon: Zap },
    { key: 'spor',      label: 'Spor',      Icon: Activity },
    { key: 'kültür',    label: 'Kültür',    Icon: BookOpen },
    { key: 'yaşam',     label: 'Yaşam',     Icon: Home },
];

const SYSTEM_TAGS = [
    '#doğrulandı', '#kaynak-yok', '#çelişki',
    '#yanıltıcı-başlık', '#bağlam-eksik', '#eski-haber', '#sahte-alıntı',
];

const ForumLayout = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--color-bg-base)' }}>

            {/* ── Sol Sidebar ── */}
            <aside
                className="w-44 flex-shrink-0 flex flex-col border-r py-5 gap-5"
                style={{ background: 'var(--color-navbar-bg)', borderColor: 'var(--color-border)' }}
            >
                {/* Yeni Thread butonu */}
                <div className="px-3">
                    <button
                        onClick={() => navigate('/forum/new')}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Tartışma Başlat
                    </button>
                </div>

                {/* Kullanıcı & Trust Rozeti */}
                <div className="px-3">
                    <div
                        className="rounded-xl p-3 border"
                        style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                                style={{ background: 'rgba(46,204,113,0.12)', color: 'var(--color-brand-primary)' }}
                            >
                                {(user?.username ?? '?')[0].toUpperCase()}
                            </div>
                            <p className="text-[11px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {user?.username}
                            </p>
                        </div>
                        {trust ? (
                            <>
                                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                                    {'★'.repeat(trust.stars)} {trust.display_label}
                                </p>
                                <p className="text-[9px] text-muted">Skor: {trust.score.toFixed(0)}/100</p>
                            </>
                        ) : (
                            <p className="text-[9px] text-muted">Yeni Üye</p>
                        )}
                    </div>
                </div>

                {/* Tüm Tartışmalar */}
                <div className="px-3">
                    <NavLink
                        to="/forum"
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                                isActive ? 'border-l-2 pl-2' : 'text-muted hover:text-tx-primary'
                            }`
                        }
                        style={({ isActive }) => isActive ? {
                            borderColor: 'var(--color-brand-primary)',
                            color:       'var(--color-brand-primary)',
                            background:  'rgba(46,204,113,0.06)',
                        } : {}}
                    >
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        Tüm Tartışmalar
                    </NavLink>
                </div>

                {/* Kategoriler */}
                <div className="px-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2 px-3">
                        Kategoriler
                    </p>
                    <nav className="flex flex-col gap-0.5">
                        {CATEGORIES.map(({ key, label, Icon }) => (
                            <NavLink
                                key={key}
                                to={`/forum?category=${key}`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-muted hover:text-tx-primary transition-colors"
                                style={({ isActive }) => isActive ? {
                                    color:      'var(--color-brand-primary)',
                                    background: 'rgba(46,204,113,0.06)',
                                } : {}}
                            >
                                <Icon className="w-3 h-3 flex-shrink-0" />
                                {label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* Sistem Etiketleri */}
                <div className="px-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2 px-3">
                        Etiketler
                    </p>
                    <div className="flex flex-col gap-0.5">
                        {SYSTEM_TAGS.map(tag => (
                            <NavLink
                                key={tag}
                                to={`/forum?tag=${encodeURIComponent(tag)}`}
                                className="block px-3 py-1 rounded-lg text-[10px] text-muted hover:text-brand transition-colors truncate"
                            >
                                {tag}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ── Orta İçerik ── */}
            <main className="flex-1 min-w-0 py-6 px-5">
                <Outlet />
            </main>

            {/* ── Sağ Panel ── */}
            <aside
                className="w-48 flex-shrink-0 border-l py-5 px-3 flex flex-col gap-4"
                style={{ borderColor: 'var(--color-border)' }}
            >
                {/* Forum İstatistikleri */}
                <div
                    className="rounded-2xl p-4 border"
                    style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3">
                        Forum İstatistikleri
                    </p>
                    <div className="flex flex-col gap-2.5 text-[10px]">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-muted">
                                <MessageSquare className="w-3 h-3" /> Aktif
                            </span>
                            <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {trendingStats?.active ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-muted">
                                <AlertTriangle className="w-3 h-3" /> İnceleme
                            </span>
                            <span className="font-bold" style={{ color: 'var(--color-accent-amber)' }}>
                                {trendingStats?.underReview ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-muted">
                                <CheckCircle className="w-3 h-3" /> Çözüldü
                            </span>
                            <span className="font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                                —
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trend Etiketler */}
                {trendingTags.length > 0 && (
                    <div
                        className="rounded-2xl p-4 border"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3 flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" /> Trend Etiketler
                        </p>
                        <div className="flex flex-col gap-2">
                            {trendingTags.slice(0, 8).map(t => (
                                <NavLink
                                    key={t.id}
                                    to={`/forum?tag=${encodeURIComponent(t.name)}`}
                                    className="flex items-center justify-between group"
                                >
                                    <span className="text-[10px] text-muted group-hover:text-brand transition-colors truncate">
                                        {t.name}
                                    </span>
                                    <span className="text-[9px] text-muted ml-1 flex-shrink-0">
                                        {t.usage_count}
                                    </span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trend Thread'ler */}
                {trending?.trending_threads?.length > 0 && (
                    <div
                        className="rounded-2xl p-4 border"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3 flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> Popüler
                        </p>
                        <div className="flex flex-col gap-2.5">
                            {trending.trending_threads.map(t => (
                                <NavLink
                                    key={t.id}
                                    to={`/forum/${t.id}`}
                                    className="text-[10px] text-muted hover:text-brand transition-colors line-clamp-2 leading-snug"
                                >
                                    {t.title}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

        </div>
    );
};

export default ForumLayout;
