import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Github } from 'lucide-react';
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
    const isActive = (path) => location.pathname === path;

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-6 pt-5 flex justify-between items-center gap-4">

                {/* ── LOGO PILL ── */}
                <Link
                    to="/"
                    className="glass-pill flex items-center gap-2.5 px-5 py-2.5 hover:scale-[1.03] transition-transform duration-300"
                >
                    <div className="w-8 h-8 overflow-hidden shrink-0">
                        <img src={logo}     alt="Logo" className="w-full h-full object-contain block dark:hidden" />
                        <img src={logoDark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
                    </div>
                    <span className="text-xl font-manrope font-extrabold tracking-tight text-tx-primary">
                        Haber
                    </span>
                </Link>

                {/* ── NAV PILL ── */}
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
                <div className="glass-pill flex items-center gap-3 px-5 py-2.5">
                    <button
                        onClick={toggleTheme}
                        className="text-tx-primary hover:text-brand dark:hover:text-es-primary transition-colors"
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

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

            </div>
        </header>
    );
};

export default Navbar;
