import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';
import logo from '../../assets/images/emrald.png';
import logoDark from '../../assets/images/logoDark.png';
import NotificationDropdown from '../../features/notifications/NotificationDropdown';

const NAV_LINKS = [
    { name: 'Analiz', path: '/' },
    { name: 'Gündem', path: '/gundem' },
    { name: 'Forum', path: '/forum' },
    { name: 'Bildir', path: '/report' },
];

const Navbar = () => {
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isAuthenticated, user, isAdmin, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifUnread, setNotifUnread] = useState(0);
    const isActive = (path) => location.pathname === path;
    const { subscribe } = useWebSocket();

    useEffect(() => {
        const unsub = subscribe('new_notification', (payload) => {
            if (payload?.unread_count !== undefined) {
                setNotifUnread(payload.unread_count);
            } else {
                setNotifUnread(prev => prev + 1);
            }
        });
        return unsub;
    }, [subscribe]);

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);


    useEffect(() => {
        if (!user) { setNotifUnread(0); return; }
        axiosInstance.get('/notifications')
            .then(r => setNotifUnread(r.data.unread_count))
            .catch(() => {});
    }, [user]);

    return (
        <header className="fixed top-8 left-0 right-0 z-50">

            {/* Solid navbar background */}
            <div
                className="absolute inset-0 backdrop-blur-md border-b pointer-events-none -z-10"
                style={{
                    background: 'var(--color-navbar-bg)',
                    borderColor: 'var(--color-border)',
                }}
            />

            <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-[1fr_auto_1fr] items-center py-2.5 md:py-3">

                {/* ── LOGO ── */}
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200">
                    <div className="w-7 h-7 md:w-8 md:h-8 overflow-hidden shrink-0">
                        <img src={logo}     alt="Logo" className="w-full h-full object-contain block dark:hidden" />
                        <img src={logoDark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
                    </div>
                    <span className="text-lg md:text-xl font-manrope font-extrabold tracking-tight text-brand">
                        Haber
                    </span>
                </Link>

                {/* ── NAV — masaüstü ── */}
                <nav className="hidden md:flex items-center gap-1 justify-self-center">
                    {NAV_LINKS.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                                px-4 py-1.5 text-sm font-bold tracking-tight transition-all duration-200
                                ${isActive(item.path)
                                    ? 'text-brand border-b-2 border-brand'
                                    : 'text-tx-primary hover:text-brand'
                                }
                            `}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* ── ACTIONS ── */}
                <div className="flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-2.5 justify-self-end">
                    <button
                        onClick={toggleTheme}
                        className="text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors p-1"
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    <div className="hidden md:flex items-center gap-3">
                        <div className="w-px h-4 bg-brutal-border" />
                        <button className="text-tx-primary text-[11px] font-black tracking-widest hover:text-brand dark:hover:text-es-primary transition-colors">
                            TR
                        </button>
                        <div className="w-px h-4 bg-brutal-border" />
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                {user && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowNotifs(v => !v)}
                                            className="relative p-2 rounded-lg hover:bg-brutal-border transition-colors"
                                            aria-label="Bildirimler"
                                        >
                                            <svg className="w-4 h-4 text-tx-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            {notifUnread > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-fake-text text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                                    {notifUnread > 9 ? '9+' : notifUnread}
                                                </span>
                                            )}
                                        </button>
                                        {showNotifs && <NotificationDropdown onClose={() => setShowNotifs(false)} />}
                                    </div>
                                )}
                                <Link
                                    to="/profile"
                                    className="text-tx-primary text-xs font-bold tracking-tight hover:text-brand dark:hover:text-es-primary transition-colors"
                                >
                                    {user?.username}
                                </Link>
                                {isAdmin && (
                                    <>
                                        <div className="w-px h-4 bg-brutal-border" />
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to="/admin/users"
                                                className="text-[11px] font-black tracking-widest text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                                            >
                                                KULLANICILAR
                                            </Link>
                                            <Link
                                                to="/admin/security"
                                                className="text-[11px] font-black tracking-widest text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                                            >
                                                GÜVENLİK
                                            </Link>
                                            <Link
                                                to="/admin/analytics"
                                                className="text-[11px] font-black tracking-widest text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                                            >
                                                ANALİTİK
                                            </Link>
                                        </div>
                                    </>
                                )}
                                <div className="w-px h-4 bg-brutal-border" />
                                <button
                                    onClick={logout}
                                    className="text-tx-primary text-[11px] font-black tracking-widest hover:text-brand dark:hover:text-es-primary transition-colors"
                                >
                                    ÇIKIŞ
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login"
                                    className="text-[11px] font-black tracking-widest text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                                >
                                    GİRİŞ
                                </Link>
                                <Link
                                    to="/register"
                                    className="text-[11px] font-black tracking-widest bg-brand text-surface dark:bg-es-primary dark:text-es-bg px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
                                >
                                    KAYIT
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-brutal-border md:hidden" />
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="md:hidden text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors p-1"
                        aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
                    >
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* ── MOBİL DROPDOWN ── */}
            {menuOpen && (
                <div className="md:hidden max-w-7xl mx-auto px-4 pt-2 animate-fade-up">
                    <nav className="glass-pill flex flex-col p-2 gap-0.5">
                        {NAV_LINKS.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMenuOpen(false)}
                                className={`
                                    flex items-center px-4 py-3 rounded-xl text-sm font-bold tracking-tight transition-all duration-200
                                    ${isActive(item.path)
                                        ? 'bg-brand text-surface dark:bg-es-primary dark:text-es-bg shadow-sm'
                                        : 'text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent'
                                    }
                                `}
                            >
                                {item.name}
                            </Link>
                        ))}
                        {isAuthenticated ? (
                            <>
                                <Link to="/profile" onClick={() => setMenuOpen(false)}
                                    className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all">
                                    Profilim ({user?.username})
                                </Link>
                                {isAdmin && (
                                    <>
                                        <Link to="/admin/users" onClick={() => setMenuOpen(false)}
                                            className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all">
                                            Kullanıcı Yönetimi
                                        </Link>
                                        <Link to="/admin/security" onClick={() => setMenuOpen(false)}
                                            className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all">
                                            Güvenlik Logları
                                        </Link>
                                        <Link to="/admin/analytics" onClick={() => setMenuOpen(false)}
                                            className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all">
                                            Analitik
                                        </Link>
                                    </>
                                )}
                                <button onClick={() => { logout(); setMenuOpen(false); }}
                                    className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all w-full text-left">
                                    Çıkış Yap
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setMenuOpen(false)}
                                    className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all">
                                    Giriş Yap
                                </Link>
                                <Link to="/register" onClick={() => setMenuOpen(false)}
                                    className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary bg-brand-light dark:bg-brand-accent transition-all">
                                    Kayıt Ol
                                </Link>
                            </>
                        )}
                        <div className="flex items-center px-4 py-3 mt-0.5 border-t border-brutal-border/40">
                            <button className="text-tx-primary text-[11px] font-black tracking-widest hover:text-brand dark:hover:text-es-primary transition-colors">
                                TR
                            </button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;
