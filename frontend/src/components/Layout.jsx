import React, { useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Github } from 'lucide-react';
import Navbar from './common/Navbar';
import MarketBand from './common/MarketBand';
import NewsTicker from './common/NewsTicker';
import { useTheme } from '../contexts/ThemeContext';

const AUTH_PATHS = ['/login', '/register'];

const FOOTER_LINKS = [
    { label: 'Hakkımızda', to: '/hakkimizda' },
    { label: 'Gizlilik',   to: '#'           },
    { label: 'İletişim',   to: '/hakkimizda' },
    { label: 'Kullanım Koşulları', to: '#'   },
];

const PARTICLES = [
    { left:'6%',  bottom:'12%', size:2, dur:'8s',  delay:'0s'   },
    { left:'16%', bottom:'35%', size:1, dur:'11s', delay:'2s'   },
    { left:'28%', bottom:'22%', size:2, dur:'9s',  delay:'1s'   },
    { left:'40%', bottom:'58%', size:1, dur:'13s', delay:'3.5s' },
    { left:'52%', bottom:'8%',  size:2, dur:'7s',  delay:'0.5s' },
    { left:'64%', bottom:'44%', size:1, dur:'10s', delay:'4s'   },
    { left:'74%', bottom:'26%', size:2, dur:'12s', delay:'1.5s' },
    { left:'84%', bottom:'54%', size:1, dur:'9s',  delay:'2.5s' },
    { left:'91%', bottom:'32%', size:2, dur:'14s', delay:'0.8s' },
    { left:'22%', bottom:'72%', size:1, dur:'10s', delay:'6s'   },
    { left:'48%', bottom:'78%', size:2, dur:'8s',  delay:'3s'   },
    { left:'70%', bottom:'68%', size:1, dur:'11s', delay:'5s'   },
];

const Layout = () => {
    const { pathname }   = useLocation();
    const { isDarkMode } = useTheme();
    const isAuth         = AUTH_PATHS.includes(pathname);
    const prevPathRef    = useRef(null);

    /* Yön bilgisini render sırasında hesapla */
    let pageClass;
    if (prevPathRef.current === null) {
        pageClass = 'animate-fade-up';
    } else if (prevPathRef.current === '/login' && pathname === '/register') {
        pageClass = 'animate-fade-right';
    } else if (prevPathRef.current === '/register' && pathname === '/login') {
        pageClass = 'animate-fade-left';
    } else if (isAuth) {
        pageClass = 'animate-fade-in';
    } else {
        pageClass = 'animate-fade-up';
    }

    /* Sayfa değişiminde en üste git */
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);

    /* Yön ref'ini animasyon sonrası güncelle */
    useEffect(() => {
        prevPathRef.current = pathname;
    }, [pathname]);

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-300">

            {/* ── Global ızgara ────────────────────────────────── */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: -10,
                    backgroundImage:
                        'linear-gradient(var(--color-border) 1px,transparent 1px),' +
                        'linear-gradient(90deg,var(--color-border) 1px,transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: isDarkMode ? 0.35 : 0.50,
                }}
            />

            {/* ── Animasyonlu arka plan (her iki mod) ──────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -9 }}>

                {/* Blob'lar — dark: renkli, light: gri/zinc */}
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full animate-blob-1"
                     style={{
                         background: isDarkMode ? 'rgba(46,204,113,0.06)' : 'rgba(26,158,79,0.05)',
                         filter: 'blur(120px)',
                     }} />
                <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full animate-blob-2"
                     style={{
                         background: isDarkMode ? 'rgba(16,185,129,0.04)' : 'rgba(26,158,79,0.035)',
                         filter: 'blur(110px)',
                     }} />
                <div className="absolute top-1/3 right-0 w-[360px] h-[360px] rounded-full animate-blob-3"
                     style={{
                         background: isDarkMode ? 'rgba(16,185,129,0.03)' : 'rgba(26,158,79,0.025)',
                         filter: 'blur(90px)',
                     }} />

                {/* Scan line — dark: yeşil, light: gri */}
                <div className="absolute left-0 right-0 h-px animate-scan"
                     style={{
                         background: isDarkMode
                             ? 'linear-gradient(90deg,transparent,rgba(46,204,113,0.12),transparent)'
                             : 'linear-gradient(90deg,transparent,rgba(26,158,79,0.08),transparent)',
                     }} />

                {/* Particles — dark: yeşil, light: gri */}
                {PARTICLES.map((p, i) => (
                    <div key={i} className="absolute rounded-full"
                         style={{
                             left: p.left, bottom: p.bottom,
                             width: p.size, height: p.size,
                             background: isDarkMode ? '#2ecc71' : 'rgba(26,158,79,0.25)',
                             animation: `particleRise ${p.dur} ${p.delay} ease-in-out infinite`,
                         }} />
                ))}
            </div>

            {!isAuth && <MarketBand />}
            <Navbar />

            <main className="flex-grow pt-32 md:pt-36 pb-10 overflow-x-hidden">
                <div key={pathname} className={pageClass}>
                    <Outlet />
                </div>
            </main>

            {!isAuth && <NewsTicker />}

            {!isAuth && (
                <footer className="mt-24 pb-10 border-t border-brutal-border dark:border-es-primary/10 bg-surface dark:bg-es-surface">
                    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">

                        <div className="flex flex-col items-center md:items-start gap-1">
                            <span className="text-base font-manrope font-extrabold tracking-tight text-tx-primary dark:text-es-primary">
                                Ne Haber
                            </span>
                            <p className="text-xs text-tx-secondary">
                                © {new Date().getFullYear()} Fake News Detection System
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-6">
                            {FOOTER_LINKS.map(({ label, to }) => (
                                <Link key={label} to={to}
                                      className="text-xs text-tx-secondary hover:text-tx-primary transition-colors">
                                    {label}
                                </Link>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                               className="w-8 h-8 rounded-full border border-brutal-border flex items-center justify-center text-tx-secondary hover:text-tx-primary hover:border-tx-primary transition-all">
                                <Github size={14} />
                            </a>
                        </div>

                    </div>
                </footer>
            )}
        </div>
    );
};

export default Layout;
