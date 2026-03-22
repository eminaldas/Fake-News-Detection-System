import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Github, Menu, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import logo from '../../assets/images/emrald.png';
import logoDark from '../../assets/images/logoDark.png';

const NAV_LINKS = [
    { name: 'Analiz', path: '/' },
    { name: 'Forum', path: '/forum' },
    { name: 'Bildir', path: '/report' },
];

const Navbar = () => {
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const isActive = (path) => location.pathname === path;

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50">

            {/* ── Blur strip — navbar arkasını örtüyor ── */}
            <div className="navbar-blur absolute inset-x-0 top-0 h-28 pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-5 flex justify-between items-center gap-3">

                {/* ── LOGO PILL ── */}
                <Link
                    to="/"
                    className="glass-pill flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 hover:scale-[1.03] transition-transform duration-300"
                >
                    <div className="w-7 h-7 md:w-8 md:h-8 overflow-hidden shrink-0">
                        <img src={logo}     alt="Logo" className="w-full h-full object-contain block dark:hidden" />
                        <img src={logoDark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
                    </div>
                    <span className="text-lg md:text-xl font-manrope font-extrabold tracking-tight text-tx-primary">
                        Haber
                    </span>
                </Link>

                {/* ── NAV PILL — yalnızca masaüstü ── */}
                <nav className="glass-pill hidden md:flex items-center gap-0.5 px-2 py-1.5">
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

                {/* ── ACTIONS PILL ── */}
                <div className="glass-pill flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-2.5">
                    <button
                        onClick={toggleTheme}
                        className="text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors p-1"
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    {/* Masaüstü: TR + GitHub */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="w-px h-4 bg-brutal-border" />
                        <button className="text-tx-primary text-[11px] font-black tracking-widest hover:text-brand dark:hover:text-es-primary transition-colors">
                            TR
                        </button>
                        <div className="w-px h-4 bg-brutal-border" />
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                        >
                            <Github size={17} />
                        </a>
                    </div>

                    {/* Mobil: hamburger */}
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

            {/* ── MOBİL DROPDOWN MENÜ ── */}
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
                        <div className="flex items-center gap-5 px-4 py-3 mt-0.5 border-t border-brutal-border/40 dark:border-surface-solid/60">
                            <button className="text-tx-primary text-[11px] font-black tracking-widest hover:text-brand dark:hover:text-es-primary transition-colors">
                                TR
                            </button>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                            >
                                <Github size={16} />
                            </a>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;
