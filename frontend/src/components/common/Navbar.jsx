import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Github } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import logo from '../../assets/images/logo.png';
import logoDark from '../../assets/images/logoDark.png';

const Navbar = () => {
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();

    const isActive = (path) => location.pathname === path;

    return (
        <header className="fixed top-0 w-full z-50  backdrop-blur-xl ">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center gap-4">

                    {/* ── SOL: LOGO (Arka plansız) ── */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-2 py-1 transition-opacity hover:opacity-75"
                    >
                        <div className="flex items-center justify-center w-10 h-10 overflow-hidden">
                            {/* Açık Tema (Light Mode) Logosu: Sadece light modda görünür, dark modda gizlenir */}
                            <img
                                src={logo}
                                alt="Ne Haber Logo"
                                className="w-full h-full object-contain block dark:hidden"
                            />

                            {/* Karanlık Tema (Dark Mode) Logosu: Sadece dark modda görünür, light modda gizlenir */}
                            <img
                                src={logoDark}
                                alt="Ne Haber Logo"
                                className="w-full h-full object-contain hidden dark:block"
                            />
                        </div>
                        <span className="text-2xl font-outfit font-black tracking-tight text-tx-primary dark:text-tx-primary">
                            Haber
                        </span>
                    </Link>

                    {/* ── ORTA: NAV PİLL ── */}
                    <nav
                        className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl
                                   bg-base dark:bg-surface
                                   border-2 border-brutal-border dark:border-brutal-border
                                   shadow-sm"
                    >
                        {[
                            { name: 'Analiz', path: '/' },
                            { name: 'Forum', path: '/forum' },
                            { name: 'Bildir', path: '/report' },
                        ].map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                                    px-6 py-1.5 rounded-lg text-sm font-bold transition-all duration-200
                                    ${isActive(item.path)
                                        ? 'bg-brand dark:bg-brand text-base dark:text-[#111113] shadow-inner'
                                        : 'text-tx-primary dark:text-tx-primary hover:bg-brand-light/40 dark:hover:bg-brand-light'
                                    }
                                `}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* ── SAĞ: ACTIONS PİLL ── */}
                    <div
                        className="flex items-center gap-3 px-5 py-2.5 rounded-xl
                                   bg-brand dark:bg-surface
                                   border-2 border-brutal-border dark:border-brutal-border
                                   shadow-sm"
                    >
                        {/* Tema */}
                        <button
                            onClick={toggleTheme}
                            className="text-base dark:text-tx-primary hover:opacity-70 transition-opacity"
                            aria-label="Toggle Theme"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div className="w-px h-4 bg-base/40 dark:bg-brutal-border" />

                        {/* Dil */}
                        <button className="text-base dark:text-tx-primary text-xs font-black tracking-widest hover:opacity-70 transition-opacity">
                            TR
                        </button>

                        <div className="w-px h-4 bg-base/40 dark:bg-brutal-border" />

                        {/* GitHub */}
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base dark:text-tx-primary hover:scale-110 transition-transform"
                        >
                            <Github size={18} />
                        </a>
                    </div>

                </div>
            </div>
        </header>
    );
};

export default Navbar;