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

/* Floating dot particles — dark modda hafif görünür */
const PARTICLES = [
    { left:'5%',  top:'18%',  size:1.5, dur:'22s', delay:'0s'    },
    { left:'15%', top:'65%',  size:1,   dur:'28s', delay:'4s'    },
    { left:'25%', top:'40%',  size:2,   dur:'19s', delay:'2s'    },
    { left:'38%', top:'75%',  size:1,   dur:'31s', delay:'7s'    },
    { left:'50%', top:'22%',  size:1.5, dur:'25s', delay:'1.5s'  },
    { left:'62%', top:'55%',  size:1,   dur:'20s', delay:'5s'    },
    { left:'72%', top:'30%',  size:2,   dur:'27s', delay:'3s'    },
    { left:'83%', top:'70%',  size:1,   dur:'23s', delay:'6s'    },
    { left:'92%', top:'45%',  size:1.5, dur:'18s', delay:'2.5s'  },
    { left:'44%', top:'88%',  size:1,   dur:'24s', delay:'9s'    },
    { left:'8%',  top:'82%',  size:2,   dur:'30s', delay:'1s'    },
    { left:'68%', top:'12%',  size:1,   dur:'26s', delay:'8s'    },
    { left:'30%', top:'92%',  size:1.5, dur:'21s', delay:'3.5s'  },
    { left:'88%', top:'25%',  size:1,   dur:'29s', delay:'6.5s'  },
];

const ORBS = [
    { left: '-8%',  top: '8%',   size: 600, dur: '35s', delay: '0s',  color: 'rgba(16,185,129,0.10)' },
    { left: '65%',  top: '-8%',  size: 500, dur: '45s', delay: '10s', color: 'rgba(16,185,129,0.07)' },
    { left: '35%',  top: '55%',  size: 450, dur: '40s', delay: '5s',  color: 'rgba(16,185,129,0.06)' },
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
                    opacity: isDarkMode ? 0.55 : 0.60,
                }}
            />

            {/* ── Animasyonlu arka plan (her iki mod) ──────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -9 }}>

                {/* Yavaş hareket eden orb'lar — dark modda çok subtle */}
                {isDarkMode && ORBS.map((o, i) => (
                    <div key={i}
                         className={`absolute rounded-full animate-blob-${(i % 3) + 1}`}
                         style={{
                             left: o.left, top: o.top,
                             width: o.size, height: o.size,
                             background: o.color,
                             filter: 'blur(100px)',
                             animationDuration: o.dur,
                             animationDelay: o.delay,
                         }} />
                ))}

                {/* Light mod blob'lar */}
                {!isDarkMode && (
                    <>
                        <div className="absolute -top-40 -left-40 w-150 h-150 rounded-full animate-blob-1"
                             style={{ background: 'rgba(100,116,139,0.04)', filter: 'blur(120px)' }} />
                        <div className="absolute -bottom-32 right-1/4 w-100 h-100 rounded-full animate-blob-2"
                             style={{ background: 'rgba(100,116,139,0.03)', filter: 'blur(100px)' }} />
                    </>
                )}

                {/* Scan line — sadece dark modda, çok soluk */}
                {isDarkMode && (
                    <div className="absolute left-0 right-0 h-px animate-scan"
                         style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.25),transparent)' }} />
                )}
                {!isDarkMode && (
                    <div className="absolute left-0 right-0 h-px animate-scan"
                         style={{ background: 'linear-gradient(90deg,transparent,rgba(100,116,139,0.07),transparent)' }} />
                )}

                {/* Floating dots — dark modda çok subtle yeşil, light modda gri */}
                {PARTICLES.map((p, i) => (
                    <div key={i} className="absolute rounded-full"
                         style={{
                             left: p.left, top: p.top,
                             width: p.size, height: p.size,
                             background: isDarkMode ? 'rgba(16,185,129,0.50)' : 'rgba(100,116,139,0.35)',
                             animation: `particleRise ${p.dur} ${p.delay} ease-in-out infinite`,
                             boxShadow: isDarkMode ? '0 0 6px rgba(16,185,129,0.40)' : 'none',
                         }} />
                ))}
            </div>

            {!isAuth && <MarketBand />}
            <Navbar />

            <main className={`grow ${isAuth ? 'pt-24 md:pt-28' : 'pt-32 md:pt-36'} pb-10 overflow-x-hidden`}>
                <div key={pathname} className={pageClass}>
                    <Outlet />
                </div>
            </main>

            {!isAuth && <NewsTicker />}

            {!isAuth && (
                <footer className="mt-24 pb-10 border-t border-brutal-border dark:border-es-primary/10 bg-surface dark:bg-es-surface">
                    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">

                        <div className="flex flex-col items-center md:items-start gap-1">
                            <span className="font-manrope font-extrabold tracking-tight text-tx-primary dark:text-es-primary">
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
