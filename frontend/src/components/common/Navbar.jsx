import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, X, ChevronDown, User, Settings, Shield, BarChart2, LogOut, Users, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import logo from '../../assets/images/emrald.png';
import logoDark from '../../assets/images/logoDark.png';
import NotificationBell from '../../features/notifications/NotificationBell';

const NAV_LINKS = [
    { name: 'Analiz',  path: '/'       },
    { name: 'Gündem',  path: '/gundem' },
    { name: 'Forum',   path: '/forum'  },
    { name: 'Bildir',  path: '/report' },
];

function TrustProgress({ trust }) {
    if (!trust) return null;
    return (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-brand-primary)' }}>
                    {'★'.repeat(Math.min(trust.stars, 5))} {trust.display_label}
                </span>
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {trust.score.toFixed(0)}/100
                </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div
                    className="h-full rounded-full transition-all"
                    style={{
                        width: `${Math.min(trust.score, 100)}%`,
                        background: 'var(--color-brand-primary)',
                    }}
                />
            </div>
        </div>
    );
}

const Navbar = () => {
    const location              = useLocation();
    const navigate              = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isAuthenticated, user, isAdmin, logout } = useAuth();
    const [menuOpen,    setMenuOpen]    = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [trust,       setTrust]       = useState(null);
    const [searchOpen,  setSearchOpen]  = useState(false);
    const [searchQ,     setSearchQ]     = useState('');
    const profileRef = useRef(null);
    const isActive = (path) => location.pathname === path;

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchQ.trim()) return;
        navigate(`/forum/search?q=${encodeURIComponent(searchQ)}`);
        setSearchOpen(false);
        setSearchQ('');
    };

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    useEffect(() => {
        if (!user) return;
        axiosInstance.get('/users/me/trust').then(r => setTrust(r.data)).catch(() => {});
    }, [user]);

    /* Dışarı tıklanınca kapat */
    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfile(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header className="fixed top-10 left-0 right-0 z-50"
                style={{ borderBottom: '1px solid var(--color-navbar-bg)' }}>

            {/* Nav arka planı */}
            <div
                className="absolute inset-0 pointer-events-none -z-10"
                style={{
                    background: 'var(--color-navbar-bg)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            />

            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-2.5">

                {/* ── LOGO ── */}
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
                    <div className="w-6 h-6 overflow-hidden shrink-0">
                        <img src={logo}     alt="Logo" className="w-full h-full object-contain block dark:hidden" />
                        <img src={logoDark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
                    </div>
                    <span className="text-base font-manrope font-extrabold tracking-tight text-brand">
                        Ne Haber
                    </span>
                </Link>

                {/* ── NAV — masaüstü ── */}
                <nav className="hidden md:flex items-center gap-1">
                    {NAV_LINKS.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="px-4 py-2 text-[11px] font-black tracking-widest uppercase transition-colors"
                            style={{
                                color: isActive(item.path)
                                    ? 'var(--color-brand-primary)'
                                    : 'var(--color-text-muted)',
                                borderBottom: isActive(item.path)
                                    ? '2px solid var(--color-brand-primary)'
                                    : '2px solid transparent',
                            }}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* ── SAĞ ARAÇLAR ── */}
                <div className="flex items-center gap-2">

                    {/* Arama */}
                    {searchOpen ? (
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                onBlur={() => { if (!searchQ) setSearchOpen(false); }}
                                placeholder="Ara..."
                                className="text-xs bg-transparent outline-none px-2 py-1 rounded-lg border w-32"
                                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            />
                        </form>
                    ) : (
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="p-2 rounded-full transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    )}

                    {/* Tema toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                    </button>

                    {/* Bildirimler */}
                    {isAuthenticated && user && <NotificationBell />}

                    {/* Giriş yok */}
                    {!isAuthenticated && (
                        <div className="hidden md:flex items-center gap-2 ml-1">
                            <Link to="/login" className="text-[11px] font-black tracking-widest transition-colors"
                                  style={{ color: 'var(--color-text-muted)' }}>
                                GİRİŞ
                            </Link>
                            <Link to="/register"
                                  className="text-[11px] font-black tracking-widest px-3 py-1.5 transition-opacity hover:opacity-80"
                                  style={{
                                      background: 'var(--color-brand-primary)',
                                      color: 'var(--color-bg-base)',
                                      borderRadius: '4px',
                                  }}>
                                KAYIT
                            </Link>
                        </div>
                    )}

                    {/* Profil avatar + dropdown */}
                    {isAuthenticated && user && (
                        <div className="relative ml-1" ref={profileRef}>
                            <button
                                onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
                                className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                            >
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-manrope font-black text-xs"
                                    style={{
                                        background: 'var(--color-brand-primary)',
                                        color: 'var(--color-bg-base)',
                                        border: '2px solid var(--color-brand-primary)',
                                        boxShadow: '0 0 0 1px var(--color-bg-base)',
                                    }}
                                >
                                    {user.username?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                                <ChevronDown
                                    size={11}
                                    className="hidden md:block transition-transform"
                                    style={{
                                        color: 'var(--color-text-muted)',
                                        transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                />
                            </button>

                            {/* Dropdown */}
                            {showProfile && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden animate-fade-up"
                                    style={{
                                        background: 'var(--color-navbar-bg)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                                        zIndex: 100,
                                    }}
                                >
                                    {/* Kullanıcı başlık */}
                                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                            {user.username}
                                        </p>
                                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                            {user.email ?? 'Kullanıcı'}
                                        </p>
                                    </div>

                                    {/* Trust progress */}
                                    <TrustProgress trust={trust} />

                                    {/* Linkler */}
                                    <div className="py-1">
                                        <Link
                                            to="/profile"
                                            onClick={() => setShowProfile(false)}
                                            className="flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium transition-colors hover:bg-white/5"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            <User size={13} /> Profilim
                                        </Link>

                                        {isAdmin && (
                                            <>
                                                <Link to="/admin/users" onClick={() => setShowProfile(false)}
                                                      className="flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium transition-colors hover:bg-white/5"
                                                      style={{ color: 'var(--color-text-secondary)' }}>
                                                    <Users size={13} /> Kullanıcılar
                                                </Link>
                                                <Link to="/admin/security" onClick={() => setShowProfile(false)}
                                                      className="flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium transition-colors hover:bg-white/5"
                                                      style={{ color: 'var(--color-text-secondary)' }}>
                                                    <Shield size={13} /> Güvenlik
                                                </Link>
                                                <Link to="/admin/analytics" onClick={() => setShowProfile(false)}
                                                      className="flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium transition-colors hover:bg-white/5"
                                                      style={{ color: 'var(--color-text-secondary)' }}>
                                                    <BarChart2 size={13} /> Analitik
                                                </Link>
                                            </>
                                        )}
                                    </div>

                                    <div className="border-t py-1" style={{ borderColor: 'var(--color-border)' }}>
                                        <button
                                            onClick={() => { logout(); setShowProfile(false); }}
                                            className="flex items-center gap-2.5 px-4 py-2 text-[11px] font-medium w-full text-left transition-colors hover:bg-white/5"
                                            style={{ color: 'var(--color-fake-text)' }}
                                        >
                                            <LogOut size={13} /> Çıkış Yap
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobil menü */}
                    <button
                        onClick={() => setMenuOpen(o => !o)}
                        className="md:hidden p-1.5 transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {menuOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>
            </div>

            {/* Mobil dropdown */}
            {menuOpen && (
                <div
                    className="md:hidden px-4 pb-3 animate-fade-up"
                    style={{ background: 'var(--color-navbar-bg)', borderTop: '1px solid var(--color-border)' }}
                >
                    <nav className="flex flex-col pt-2 gap-0.5">
                        {NAV_LINKS.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMenuOpen(false)}
                                className="px-3 py-2.5 text-xs font-black tracking-widest uppercase transition-colors"
                                style={{
                                    color: isActive(item.path)
                                        ? 'var(--color-brand-primary)'
                                        : 'var(--color-text-muted)',
                                    borderLeft: isActive(item.path)
                                        ? '2px solid var(--color-brand-primary)'
                                        : '2px solid transparent',
                                }}
                            >
                                {item.name}
                            </Link>
                        ))}
                        {isAuthenticated ? (
                            <button onClick={() => { logout(); setMenuOpen(false); }}
                                className="mt-2 px-3 py-2 text-xs font-black tracking-widest uppercase text-left transition-colors"
                                style={{ color: 'var(--color-fake-text)' }}>
                                ÇIKIŞ
                            </button>
                        ) : (
                            <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                                <Link to="/login" onClick={() => setMenuOpen(false)}
                                      className="text-xs font-black tracking-widest transition-colors"
                                      style={{ color: 'var(--color-text-muted)' }}>GİRİŞ</Link>
                                <Link to="/register" onClick={() => setMenuOpen(false)}
                                      className="text-xs font-black tracking-widest px-3 py-1"
                                      style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)', borderRadius: '4px' }}>KAYIT</Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;
