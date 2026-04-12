import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    TrendingUp, Tag, Plus, MessageSquare,
    AlertTriangle, CheckCircle,
} from 'lucide-react';
import axiosInstance from '../../api/axios';

const CATEGORIES = [
    { key: 'gundem',     label: 'Gündem' },
    { key: 'ekonomi',    label: 'Ekonomi' },
    { key: 'saglik',     label: 'Sağlık' },
    { key: 'teknoloji',  label: 'Teknoloji' },
    { key: 'spor',       label: 'Spor' },
    { key: 'kultur',     label: 'Kültür' },
    { key: 'yasam',      label: 'Yaşam' },
];

const SYSTEM_TAGS = [
    '#doğrulandı', '#kaynak-yok', '#çelişki',
    '#yanıltıcı-başlık', '#bağlam-eksik', '#eski-haber', '#sahte-alıntı',
];

const ForumLayout = () => {
    const navigate = useNavigate();
    const [trending, setTrending] = React.useState(null);
    const [trust, setTrust] = React.useState(null);

    React.useEffect(() => {
        axiosInstance.get('/forum/trending')
            .then(r => setTrending(r.data))
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        axiosInstance.get('/users/me/trust')
            .then(r => setTrust(r.data))
            .catch(() => {});
    }, []);

    const trendingTags   = trending?.trending_tags   ?? [];
    const trendingStats  = trending
        ? {
            active:      trending.trending_threads.length,
            underReview: trending.trending_threads.filter(t => t.status === 'under_review').length,
        }
        : null;

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>

            {/* ── Sol Sidebar (180px) ── */}
            <aside
                className="w-44 flex-shrink-0 flex flex-col border-r py-4 gap-6"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
                {/* Yeni Thread */}
                <div className="px-3">
                    <button
                        onClick={() => navigate('/forum/new')}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold"
                        style={{
                            background: 'var(--color-brand)',
                            color: '#070f12',
                        }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Tartışma Başlat
                    </button>
                </div>

                {/* Kullanıcı & Trust Rozeti */}
                {trust && (
                    <div className="px-3">
                        <div
                            className="rounded-lg p-2.5 border"
                            style={{ background: 'var(--color-base)', borderColor: 'var(--color-border)' }}
                        >
                            <p className="text-xs font-bold text-tx-primary truncate">{trust.display_label?.split(' ').slice(1).join(' ') || trust.tier_label}</p>
                            <p className="text-[10px] text-brand">
                                {'★'.repeat(trust.stars)} {trust.display_label}
                            </p>
                            <p className="text-[10px] text-tx-secondary">Skor: {trust.score.toFixed(0)}/100</p>
                        </div>
                    </div>
                )}

                {/* Tüm Tartışmalar */}
                <div className="px-3">
                    <NavLink
                        to="/forum"
                        end
                        className={({ isActive }) =>
                            `block px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                                isActive
                                    ? 'text-brand bg-brand/10'
                                    : 'text-muted hover:text-tx-primary'
                            }`
                        }
                    >
                        Tüm Tartışmalar
                    </NavLink>
                </div>

                {/* Kategoriler */}
                <div className="px-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-2 px-3">
                        Kategoriler
                    </p>
                    <nav className="flex flex-col gap-0.5">
                        {CATEGORIES.map(c => (
                            <NavLink
                                key={c.key}
                                to={`/forum?category=${c.key}`}
                                className="block px-3 py-1.5 rounded-md text-[11px] text-muted hover:text-tx-primary transition-colors"
                            >
                                {c.label}
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
                                className="block px-3 py-1 rounded-md text-[10px] text-muted hover:text-brand transition-colors truncate"
                            >
                                {tag}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ── Orta İçerik ── */}
            <main className="flex-1 min-w-0 py-6 px-4">
                <Outlet />
            </main>

            {/* ── Sağ Panel (200px) ── */}
            <aside
                className="w-48 flex-shrink-0 border-l py-4 px-3 flex flex-col gap-4"
                style={{ borderColor: 'var(--color-border)' }}
            >
                {/* Forum İstatistikleri */}
                <div
                    className="rounded-xl p-3 border"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3">
                        Forum İstatistikleri
                    </p>
                    <div className="flex flex-col gap-2 text-[10px]">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted">
                                <MessageSquare className="w-3 h-3" /> Aktif
                            </span>
                            <span className="text-tx-primary font-semibold">
                                {trendingStats?.active ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted">
                                <AlertTriangle className="w-3 h-3" /> İnceleme
                            </span>
                            <span className="font-semibold" style={{ color: '#ffd700' }}>
                                {trendingStats?.underReview ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted">
                                <CheckCircle className="w-3 h-3" /> Çözüldü
                            </span>
                            <span className="font-semibold" style={{ color: 'var(--color-brand)' }}>
                                —
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trend Etiketler */}
                {trendingTags.length > 0 && (
                    <div
                        className="rounded-xl p-3 border"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Trend Etiketler
                        </p>
                        <div className="flex flex-col gap-1.5">
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
                        className="rounded-xl p-3 border"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted mb-3 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Popüler
                        </p>
                        <div className="flex flex-col gap-2">
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
