import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, SlidersHorizontal, ShieldCheck,
    Bell, ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';

const NAV_ITEMS = [
    { to: '/profile/overview',       label: 'Genel Bakış',        icon: LayoutDashboard },
    { to: '/profile/ai-lab',         label: 'AI Lab',             icon: SlidersHorizontal },
    { to: '/profile/security',       label: 'Güvenlik',           icon: ShieldCheck },
    { to: '/profile/notifications',  label: 'Bildirimler',        icon: Bell },
    { to: '/profile/feedback',       label: 'Geri Bildirimlerim', icon: ThumbsUp },
];

const ProfileLayout = () => {
    const { user }          = useAuth();
    const [quota, setQuota] = React.useState(null);

    React.useEffect(() => {
        axiosInstance.get('/users/me/quota')
            .then(r => setQuota(r.data))
            .catch(() => {});
    }, []);

    const memberSince = user?.created_at
        ? Math.max(1, Math.floor(
              (Date.now() - new Date(user.created_at).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          ))
        : null;

    return (
        <div
            className="flex -mt-10 md:-mt-14"
            style={{ minHeight: 'calc(100vh - 5.5rem)' }}
        >
            {/* ── Sidebar ── */}
            <aside
                className="relative w-72 flex-shrink-0 flex flex-col border-r overflow-hidden"
                style={{
                    background: 'var(--color-terminal-surface)',
                    borderColor: 'var(--color-terminal-border-raw)',
                }}
            >
                {/* Köşe aksan — sol üst */}
                <div className="absolute top-0 left-0 w-5 h-[2px] bg-brand pointer-events-none z-10" />
                <div className="absolute top-0 left-0 h-5 w-[2px] bg-brand pointer-events-none z-10" />
                {/* Köşe aksan — sağ alt */}
                <div className="absolute bottom-0 right-0 w-5 h-[2px] bg-brand pointer-events-none z-10" />
                <div className="absolute bottom-0 right-0 h-5 w-[2px] bg-brand pointer-events-none z-10" />

                {/* ── Kullanıcı başlığı ── */}
                <div
                    className="px-5 py-5 border-b"
                    style={{ borderColor: 'var(--color-terminal-border-raw)' }}
                >
                    <p
                        className="font-mono text-xs tracking-widest uppercase mb-4"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        // USER_SESSION
                    </p>
                    <div className="flex items-center gap-3.5">
                        {/* Kare avatar */}
                        <div
                            className="w-12 h-12 flex items-center justify-center font-mono font-black text-xl shrink-0"
                            style={{
                                background: 'rgba(16,185,129,0.10)',
                                border: '2px solid var(--color-brand-primary)',
                                color: 'var(--color-brand-primary)',
                            }}
                        >
                            {user?.username?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="min-w-0">
                            <p
                                className="text-base font-bold leading-tight truncate font-mono"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                {user?.username}
                            </p>
                            <p
                                className="font-mono text-xs mt-1 tracking-widest uppercase"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {memberSince !== null ? `${memberSince} AY` : 'AKTİF'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Navigasyon ── */}
                <nav className="flex-1 py-3">
                    {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-5 py-3.5 text-sm font-mono font-semibold transition-colors border-l-2 ${
                                    isActive
                                        ? 'border-brand'
                                        : 'border-transparent hover:border-brand/40'
                                }`
                            }
                            style={({ isActive }) => ({
                                color: isActive
                                    ? 'var(--color-brand-primary)'
                                    : 'var(--color-text-primary)',
                            })}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* ── Günlük kota ── */}
                {quota && (
                    <div
                        className="mx-4 mb-4 p-4 border"
                        style={{
                            background: 'var(--color-bg-base)',
                            borderColor: 'var(--color-terminal-border-raw)',
                        }}
                    >
                        <p
                            className="font-mono text-xs tracking-widest uppercase mb-3"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            // GÜNLÜK KOTA
                        </p>
                        <div
                            className="h-[2px] mb-2"
                            style={{ background: 'var(--color-terminal-border-raw)' }}
                        >
                            <div
                                className="h-full transition-all duration-700"
                                style={{
                                    width: `${Math.min((quota.used / quota.limit) * 100, 100)}%`,
                                    background: 'var(--color-brand-primary)',
                                }}
                            />
                        </div>
                        <p
                            className="font-mono text-sm font-semibold"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            {quota.used} / {quota.limit} kullanıldı
                        </p>
                    </div>
                )}

                {/* ── Footer ── */}
                <div
                    className="px-5 py-3 border-t"
                    style={{ borderColor: 'var(--color-terminal-border-raw)' }}
                >
                    <span
                        className="font-mono text-xs tracking-widest"
                        style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
                    >
                        // PROFIL_MOD
                    </span>
                </div>
            </aside>

            {/* ── İçerik alanı ── */}
            <main className="flex-1 p-8 min-w-0">
                <Outlet />
            </main>
        </div>
    );
};

export default ProfileLayout;
