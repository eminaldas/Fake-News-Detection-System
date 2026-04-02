import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/images/emrald.png';
import logoDark from '../../assets/images/logoDark.png';

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
    const [scrolled, setScrolled] = useState(false);
    const isActive = (path) => location.pathname === path;

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50">

            {/* Arka plan: her zaman mevcut, scroll'da opacity ile görünür */}
            <div className={`absolute inset-0 backdrop-blur-lg border-b border-brutal-border/30
                            pointer-events-none -z-10 transition-opacity duration-300 ${
                scrolled ? 'opacity-100' : 'opacity-0'
            }`} />

            <div className={`max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-[1fr_auto_1fr] items-center
                            transition-all duration-300 ${
                scrolled ? 'py-2 md:py-2.5' : 'pt-4 md:pt-5 pb-2'
            }`}>

                {/* ── LOGO ── */}
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200">
                    <div className="w-7 h-7 md:w-8 md:h-8 overflow-hidden shrink-0">
                        <img src={logo}     alt="Logo" className="w-full h-full object-contain block dark:hidden" />
                        <img src={logoDark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
                    </div>
                    <span className="text-lg md:text-xl font-manrope font-extrabold tracking-tight text-tx-primary">
                        Haber
                    </span>
                </Link>

                {/* ── NAV — masaüstü ── */}
                <nav className="hidden md:flex items-center gap-0.5 justify-self-center relative px-2 py-1.5">
                    <div className={`absolute inset-0 rounded-full glass-pill pointer-events-none -z-10
                                    transition-opacity duration-300 ${
                        scrolled ? 'opacity-100' : 'opacity-0'
                    }`} />
                    {NAV_LINKS.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                                px-5 py-1.5 rounded-full text-sm font-bold tracking-tight transition-all duration-200
                                ${isActive(item.path)
                                    ? 'bg-brand text-surface dark:bg-es-primary dark:text-es-bg shadow-sm'
                                    : 'text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent'
                                }
                            `}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* ── ACTIONS ── */}
                <div className="glass-pill flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-2.5 justify-self-end">
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
                                <Link
                                    to="/profile"
                                    className="text-tx-primary text-xs font-bold tracking-tight hover:text-brand dark:hover:text-es-primary transition-colors"
                                >
                                    {user?.username}
                                </Link>
                                {isAdmin && (
                                    <>
                                        <div className="w-px h-4 bg-brutal-border" />
                                        <Link
                                            to="/admin/users"
                                            className="text-[11px] font-black tracking-widest text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                                        >
                                            ADMİN
                                        </Link>
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
                                    <Link to="/admin/users" onClick={() => setMenuOpen(false)}
                                        className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-tx-primary hover:bg-brand-light dark:hover:bg-brand-accent transition-all">
                                        Kullanıcı Yönetimi
                                    </Link>
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
