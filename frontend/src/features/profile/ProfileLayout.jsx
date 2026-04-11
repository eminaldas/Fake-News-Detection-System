import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, SlidersHorizontal, ShieldCheck,
    Bell, ThumbsUp, User,
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
    const { user }       = useAuth();
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
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside
                className="w-52 flex-shrink-0 flex flex-col border-r"
                style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                }}
            >
                {/* Kullanıcı bilgisi */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                        style={{
                            background: 'rgba(var(--color-brand-rgb, 63,255,139), 0.1)',
                            border: '1px solid rgba(var(--color-brand-rgb, 63,255,139), 0.2)',
                        }}
                    >
                        <User className="w-5 h-5 text-brand" />
                    </div>
                    <p className="text-sm font-bold text-tx-primary leading-tight">{user?.username}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                        {memberSince !== null ? `Üye · ${memberSince} ay` : 'Üye'}
                    </p>
                </div>

                {/* Navigasyon */}
                <nav className="flex-1 py-2">
                    {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors duration-150 ${
                                    isActive
                                        ? 'bg-brand/10 text-brand'
                                        : 'text-muted hover:text-tx-primary hover:bg-base'
                                }`
                            }
                        >
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Kota */}
                {quota && (
                    <div
                        className="m-2 p-3 rounded-lg border text-[10px]"
                        style={{ background: 'var(--color-base)', borderColor: 'var(--color-border)' }}
                    >
                        <p className="text-muted mb-1">Günlük Kota</p>
                        <div className="h-1 rounded-full mb-1" style={{ background: 'var(--color-border)' }}>
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.min((quota.used / quota.limit) * 100, 100)}%`,
                                    background: 'var(--color-brand-primary)',
                                }}
                            />
                        </div>
                        <p style={{ color: 'var(--color-brand-primary)' }}>
                            {quota.used} / {quota.limit} kullanıldı
                        </p>
                    </div>
                )}
            </aside>

            {/* İçerik alanı */}
            <main className="flex-1 p-6 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default ProfileLayout;
