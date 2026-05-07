import React, { useRef, useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Github, Shield, Search, FileText, MessageSquare, X, Plus } from 'lucide-react';
import Navbar from './common/Navbar';
import MarketBand from './common/MarketBand';
import NewsTicker from './common/NewsTicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const AUTH_PATHS  = ['/login', '/register'];
const FORUM_PATHS = ['/forum'];

const FOOTER_LINKS = [
    { label: 'Hakkımızda',      to: '/hakkimizda' },
    { label: 'Gizlilik',        to: '#'           },
    { label: 'İletişim',        to: '/hakkimizda' },
    { label: 'Kullanım Koşulları', to: '#'        },
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
    { left: '-8%',  top: '8%',   size: 600, dur: '35s', delay: '0s',  color: 'rgba(26,158,79,0.12)' },
    { left: '65%',  top: '-8%',  size: 500, dur: '45s', delay: '10s', color: 'rgba(26,158,79,0.10)' },
    { left: '35%',  top: '55%',  size: 450, dur: '40s', delay: '5s',  color: 'rgba(26,158,79,0.09)' },
];

const Layout = () => {
    const { pathname }          = useLocation();
    const { isDarkMode }        = useTheme();
    const { isAuthenticated }   = useAuth();
    const isAuth                = AUTH_PATHS.includes(pathname);
    const isForum               = pathname.startsWith('/forum');
    const isMessages            = pathname.startsWith('/messages');
    const [fabOpen, setFabOpen] = useState(false);
    const prevPathRef    = useRef(null);

    /* Yön bilgisini render sırasında hesapla */
    /* eslint-disable react-hooks/refs */
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
    /* eslint-enable react-hooks/refs */

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

            {/* ── Global ızgara ── */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: -10,
                    backgroundImage: isDarkMode
                        ? 'linear-gradient(rgba(63,255,139,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(63,255,139,0.05) 1px,transparent 1px)'
                        : 'linear-gradient(var(--color-border) 1px,transparent 1px),linear-gradient(90deg,var(--color-border) 1px,transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: isDarkMode ? 1 : 0.18,
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
                             style={{ background: 'rgba(26,158,79,0.12)', filter: 'blur(120px)' }} />
                        <div className="absolute -bottom-32 right-1/4 w-100 h-100 rounded-full animate-blob-2"
                             style={{ background: 'rgba(26,158,79,0.12)', filter: 'blur(100px)' }} />
                    </>
                )}

                {/* Scan line — sadece dark modda, çok soluk */}
                {isDarkMode && (
                    <div className="absolute left-0 right-0 h-px animate-scan"
                         style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.25),transparent)' }} />
                )}
                {!isDarkMode && (
                    <div className="absolute left-0 right-0 h-px animate-scan"
                         style={{ background: 'linear-gradient(90deg,transparent,rgba(26,158,79,0.12),transparent)' }} />
                )}

                {/* Floating dots — dark modda çok subtle yeşil, light modda gri */}
                {PARTICLES.map((p, i) => (
                    <div key={i} className="absolute rounded-full"
                         style={{
                             left: p.left, top: p.top,
                             width: p.size, height: p.size,
                             background: isDarkMode ? 'rgba(16,185,129,0.50)' : 'rgba(26,158,79,0.12)',
                             animation: `particleRise ${p.dur} ${p.delay} ease-in-out infinite`,
                             boxShadow: isDarkMode ? '0 0 6px rgba(16,185,129,0.40)' : 'none',
                         }} />
                ))}
            </div>

            <MarketBand />
            <Navbar />

            <main className="grow pt-32 md:pt-36 pb-10 overflow-x-hidden">
                <div key={pathname} className={pageClass}>
                    <Outlet />
                </div>
            </main>

            {!isAuth && <NewsTicker />}

            {/* ── Hızlı erişim FAB (sağ alt) ── */}
            {isAuthenticated && !isAuth && !isMessages && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
                    {/* Menü seçenekleri */}
                    {fabOpen && (
                        <div className="flex flex-col items-end gap-2 mb-1 animate-fade-up">
                            <Link
                                to="/messages"
                                onClick={() => setFabOpen(false)}
                                className="flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-bold shadow-xl transition-opacity hover:opacity-80"
                                style={{
                                    background: 'var(--color-terminal-surface)',
                                    border: '1px solid var(--color-terminal-border-raw)',
                                    color: 'var(--color-text-primary)',
                                    borderLeft: '2px solid var(--color-brand-primary)',
                                }}
                            >
                                <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-primary)' }} />
                                Mesajlar
                            </Link>
                            <Link
                                to="/forum"
                                onClick={() => setFabOpen(false)}
                                className="flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-bold shadow-xl transition-opacity hover:opacity-80"
                                style={{
                                    background: 'var(--color-terminal-surface)',
                                    border: '1px solid var(--color-terminal-border-raw)',
                                    color: 'var(--color-text-primary)',
                                    borderLeft: '2px solid var(--color-brand-primary)',
                                }}
                            >
                                <Search className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-primary)' }} />
                                Forum
                            </Link>
                        </div>
                    )}

                    {/* Ana buton */}
                    <button
                        onClick={() => setFabOpen(v => !v)}
                        className="w-12 h-12 flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                            background: 'var(--color-brand-primary)',
                            color: '#070f12',
                            border: '2px solid var(--color-brand-primary)',
                            boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                        }}
                    >
                        {fabOpen
                            ? <X className="w-5 h-5" />
                            : <Plus className="w-5 h-5" />
                        }
                    </button>
                </div>
            )}

            {!isAuth && !isForum && (
                <footer style={{
                    background: 'var(--color-terminal-surface)',
                    borderTop: '1px solid var(--color-terminal-border-raw)',
                    marginTop: '6rem',
                }}>
                    <div className="max-w-7xl mx-auto px-6 py-10">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-8">

                            {/* Marka */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg font-black tracking-widest uppercase"
                                          style={{ color: 'var(--color-brand-primary)' }}>
                                        NE_HABER
                                    </span>
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 border"
                                          style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)' }}>
                                        v2.4
                                    </span>
                                </div>
                                <p className="font-mono text-xs leading-relaxed max-w-xs"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                    Türkçe haber doğrulama platformu.<br />
                                    BERT tabanlı yapay zeka ile sahte haber tespiti.
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                    <span className="font-mono text-[10px]"
                                          style={{ color: 'var(--color-brand-primary)' }}>
                                        SİSTEM AKTİF
                                    </span>
                                </div>
                            </div>

                            {/* Özellikler */}
                            <div className="flex flex-col gap-2">
                                <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                                   style={{ color: 'var(--color-text-muted)' }}>// ÖZELLIKLER</p>
                                {[
                                    { icon: Search,   label: 'Haber Analizi' },
                                    { icon: Shield,   label: 'Kaynak Doğrulama' },
                                    { icon: FileText, label: 'Derin Rapor' },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Linkler */}
                            <div className="flex flex-col gap-2">
                                <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                                   style={{ color: 'var(--color-text-muted)' }}>// BAĞLANTILAR</p>
                                {FOOTER_LINKS.map(({ label, to }) => (
                                    <Link key={label} to={to}
                                          className="font-mono text-xs transition-opacity hover:opacity-60"
                                          style={{ color: 'var(--color-text-muted)' }}>
                                        › {label}
                                    </Link>
                                ))}
                            </div>

                        </div>

                        {/* Alt çizgi */}
                        <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3"
                             style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }}>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                                © {new Date().getFullYear()} NE_HABER_SİSTEMİ · TÜM_HAKLAR_SAKLIDIR
                            </p>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1.5 font-mono text-[10px] transition-opacity hover:opacity-60"
                               style={{ color: 'var(--color-text-muted)' }}>
                                <Github size={12} /> GitHub
                            </a>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default Layout;
