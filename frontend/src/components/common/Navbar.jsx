import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Moon, Sun, Menu, X, ChevronDown, User, Settings, Shield, BarChart2, LogOut, Users, MessageSquare, Award } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import NotificationBell from '../../features/notifications/NotificationBell';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Tooltip from '../ui/Tooltip';

function UnreadBadge() {
    const [count, setCount] = React.useState(0);
    const { subscribe }       = useWebSocket();
    const { isAuthenticated } = useAuth();
    const location            = useLocation();

    React.useEffect(() => {
        if (!isAuthenticated) return;
        axiosInstance.get('/messages/unread-count').then(r => setCount(r.data.count ?? 0)).catch(() => {});
    }, [isAuthenticated]);

    React.useEffect(() => {
        const unsub = subscribe('dm.new_message', () => {
            setCount(v => v + 1);
        });
        return unsub;
    }, [subscribe]);

    /* Mesajlar sayfasındayken badge sıfırla */
    React.useEffect(() => {
        if (location.pathname.startsWith('/messages')) setCount(0);
    }, [location.pathname]);

    if (count === 0) return null;
    return (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-black"
              style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
            {count > 9 ? '9+' : count}
        </span>
    );
}

const GUNDEM_CATEGORIES = [
    { label: 'Gündem',    value: 'gündem'    },
    { label: 'Ekonomi',   value: 'ekonomi'   },
    { label: 'Spor',      value: 'spor'      },
    { label: 'Sağlık',    value: 'sağlık'    },
    { label: 'Teknoloji', value: 'teknoloji' },
    { label: 'Kültür',    value: 'kültür'    },
    { label: 'Yaşam',     value: 'yaşam'     },
];

const NAV_LINKS = [
    { name: 'ANALİZ',   path: '/'       },
    { name: 'HABERLER', path: '/gundem' },
    { name: 'FORUM',    path: '/forum'  },
    { name: 'BİLDİR',  path: '/report' },
];

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

/* ── Kayan Kategori Barı ── */
function CategoryBar({ activeCategory, onSelect }) {
    const containerRef = useRef(null);
    const btnRefs      = useRef({});
    const [indicator,  setIndicator] = useState({ left: 0, width: 0, ready: false });

    const items = [
        { label: 'SİZİN İÇİN', value: null },
        ...GUNDEM_CATEGORIES.map(c => ({ label: c.label.toLocaleUpperCase('tr-TR'), value: c.value })),
    ];

    useLayoutEffect(() => {
        const key = activeCategory ?? '__foryou__';
        const btn = btnRefs.current[key];
        const container = containerRef.current;
        if (!btn || !container) return;
        const br = btn.getBoundingClientRect();
        const cr = container.getBoundingClientRect();
        // scrollLeft ekle — sağdaki kategorilerde yanlış pozisyon hesabını düzeltir
        setIndicator({ left: br.left - cr.left + container.scrollLeft, width: br.width, ready: true });
    }, [activeCategory]);

    return (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <div ref={containerRef}
                 className="max-w-7xl mx-auto px-6 flex items-center justify-center overflow-x-auto relative">
                {/* Kayan indikatör çizgisi */}
                {indicator.ready && (
                    <div
                        className="absolute bottom-0 h-0.5 pointer-events-none"
                        style={{
                            left:       indicator.left,
                            width:      indicator.width,
                            background: 'var(--color-brand-primary)',
                            transition: 'left 0.3s cubic-bezier(0.22,1,0.36,1), width 0.3s cubic-bezier(0.22,1,0.36,1)',
                        }}
                    />
                )}
                {items.map(item => {
                    const isActive = activeCategory === item.value;
                    const refKey   = item.value ?? '__foryou__';
                    return (
                        <button
                            key={refKey}
                            ref={el => { btnRefs.current[refKey] = el; }}
                            onClick={() => onSelect(item.value)}
                            className="px-5 py-3 text-[11px] font-bold tracking-widest whitespace-nowrap transition-colors duration-200"
                            style={{
                                fontFamily: "'Open Sans', sans-serif",
                                color:      isActive ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                            }}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Glitch logo ── */
const GLITCH_CHARS = '!@#$%^&*<>{}|/\\~=+?01X#';

function scrambleStr(text, factor) {
    return text.split('').map(ch =>
        Math.random() < factor
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : ch
    ).join('');
}

function GlitchLogo() {
    const [text,      setText]      = React.useState('DOĞRU');
    const [isWrong,   setIsWrong]   = React.useState(false);
    const [glitching, setGlitching] = React.useState(false);
    const [tfm,       setTfm]       = React.useState('none');
    const [shadow,    setShadow]    = React.useState('none');
    const [alpha,     setAlpha]     = React.useState(1);

    React.useEffect(() => {
        let raf = null;
        const ts = [];

        const doGlitch = (from, to, cb) => {
            const t0  = performance.now();
            const DUR = 900;
            setGlitching(true);

            const tick = (now) => {
                const p  = Math.min((now - t0) / DUR, 1);
                const sc = p < 0.5 ? p * 2 : (1 - p) * 2;
                setText(scrambleStr(p < 0.5 ? from : to, sc * 0.85));

                const sx = (Math.random() - 0.5) * 12;
                const tx = (Math.random() - 0.5) * 7;
                setTfm(`skewX(${sx.toFixed(1)}deg) translateX(${tx.toFixed(1)}px)`);
                setAlpha(0.4 + Math.random() * 0.6);

                const rx = Math.round((Math.random() - 0.5) * 10);
                setShadow(`${rx}px 0 0 rgba(255,50,50,0.9), ${-rx}px 0 0 rgba(0,220,255,0.9)`);

                if (p >= 0.48 && p < 0.52) setIsWrong(to === 'YANLIŞ');

                if (p < 1) {
                    raf = requestAnimationFrame(tick);
                } else {
                    setText(to); setTfm('none'); setShadow('none'); setAlpha(1); setGlitching(false); cb();
                }
            };
            raf = requestAnimationFrame(tick);
        };

        const cycle = () => {
            setText('DOĞRU'); setIsWrong(false); setTfm('none');
            setShadow('none'); setAlpha(1); setGlitching(false);

            ts.push(setTimeout(() =>
                doGlitch('DOĞRU', 'YANLIŞ', () =>
                    ts.push(setTimeout(() =>
                        doGlitch('YANLIŞ', 'DOĞRU', () =>
                            ts.push(setTimeout(cycle, 200))
                        ), 3000)
                    )
                ), 5000)
            );
        };

        cycle();
        return () => { if (raf) cancelAnimationFrame(raf); ts.forEach(clearTimeout); };
    }, []);

    const bg   = isWrong ? '#ff7351' : 'var(--color-brand-primary)';
    const fg   = '#070f12';
    const deco = (!isWrong && !glitching) ? 'line-through' : 'none';

    return (
        <div
            className="self-stretch flex flex-col justify-center px-3 select-none relative overflow-hidden"
            style={{ background: bg, minWidth: 54, transition: glitching ? 'none' : 'background 0.15s' }}
        >
            {/* Scan lines during glitch */}
            {glitching && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 2,
                        background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.20) 2px,rgba(0,0,0,0.20) 4px)',
                    }}
                />
            )}
            {/* Inner glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    zIndex: 1,
                    boxShadow: isWrong
                        ? 'inset 0 0 18px rgba(255,0,0,0.40)'
                        : 'inset 0 0 10px rgba(16,185,129,0.25)',
                    transition: 'box-shadow 0.3s',
                }}
            />

            {/* NE */}
            <span
                className="font-mono font-black leading-none"
                style={{ fontSize: 17, color: fg, letterSpacing: '0.06em', position: 'relative', zIndex: 3 }}
            >
                NE
            </span>

            {/* DOĞRU / YANLIŞ */}
            <span
                className="font-mono font-bold block"
                style={{
                    fontSize: 8.5,
                    color: fg,
                    letterSpacing: '0.10em',
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                    textDecoration: deco,
                    textDecorationThickness: '1.5px',
                    textDecorationColor: fg,
                    transform: tfm,
                    opacity: alpha,
                    textShadow: shadow,
                    position: 'relative',
                    zIndex: 3,
                }}
            >
                {text}
            </span>
        </div>
    );
}

/* L-shaped köşe aksanları */
const Corners = () => (
    <>
        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />
    </>
);

function TrustProgress({ trust }) {
    if (!trust || trust.score <= 0) return null;
    return (
        <div className="px-4 py-3 border-b" style={BD}>
            <div className="flex items-center justify-between mb-2">
                <span
                    className="font-mono text-xs tracking-widest uppercase"
                    style={{ color: 'var(--color-brand-primary)' }}
                >
                    {'★'.repeat(Math.min(trust.stars, 5))} {trust.display_label}
                </span>
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                    {trust.score.toFixed(0)}/100
                </span>
            </div>
            <div className="h-[2px]" style={{ background: 'var(--color-terminal-border-raw)' }}>
                <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${Math.min(trust.score, 100)}%`, background: 'var(--color-brand-primary)' }}
                />
            </div>
        </div>
    );
}

const Navbar = () => {
    const location              = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isAuthenticated, user, isAdmin, logout } = useAuth();
    const [menuOpen,    setMenuOpen]    = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [trust,       setTrust]       = useState(null);
    const profileRef = useRef(null);
    const isActive   = (path) => location.pathname === path;
    const [gundemParams, setGundemParams] = useSearchParams();
    const isGundem       = location.pathname === '/gundem';
    const activeCategory = isGundem ? gundemParams.get('category') : null;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    useEffect(() => {
        if (!user) return;
        axiosInstance.get('/users/me/trust').then(r => setTrust(r.data)).catch(() => {});
    }, [user]);

    const [userLevel,     setUserLevel]     = React.useState(null);
    const [xpStats,       setXpStats]       = React.useState(null);

    React.useEffect(() => {
        if (!isAuthenticated) { setUserLevel(null); setXpStats(null); return; }
        axiosInstance.get('/gamification/me/stats')
            .then(r => {
                setUserLevel(r.data.level);
                setXpStats({ total_xp: r.data.total_xp, xp_to_next_level: r.data.xp_to_next_level });
            })
            .catch(() => {});
    }, [isAuthenticated]);

    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header
            className="fixed top-10 left-0 right-0 z-50"
            style={{ borderBottom: '1px solid var(--color-navbar-border)' }}
        >
            {/* Nav arka planı */}
            <div
                className="absolute inset-0 pointer-events-none -z-10"
                style={{
                    background:           'var(--color-navbar-bg)',
                    backdropFilter:       'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            />

            <div className="max-w-7xl mx-auto px-6 flex items-center py-2.5">

                {/* ── LOGO — sol, sabit genişlik ── */}
                <div className="flex-1 flex items-center">
                    <Link to="/" className="flex items-center hover:opacity-80 transition-opacity self-stretch -my-2.5">
                        <div className="self-stretch aspect-square flex items-center justify-center px-3"
                             style={{ background: 'var(--color-brand-primary)' }}>
                            <span className="font-pacifico text-2xl text-white leading-none select-none">Ne</span>
                        </div>
                    </Link>
                </div>

                {/* ── NAV — masaüstü, gerçekten ortada ── */}
                <nav className="hidden md:flex items-center gap-1 shrink-0">
                    {NAV_LINKS.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="px-4 py-2 text-xs font-bold tracking-widest transition-colors"
                            style={{
                                fontFamily:   "'Open Sans', sans-serif",
                                color: isActive(item.path)
                                    ? 'var(--color-brand-primary)'
                                    : 'var(--color-text-primary)',
                                borderBottom: isActive(item.path)
                                    ? '2px solid var(--color-brand-primary)'
                                    : '2px solid transparent',
                            }}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* ── SAĞ ARAÇLAR — flex-1 + justify-end ── */}
                <div className="flex-1 flex items-center justify-end gap-2">

                    {/* Tema toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    {/* Bildirimler */}
                    {isAuthenticated && user && <NotificationBell />}

                    {/* Mesajlar */}
                    {isAuthenticated && user && (
                        <Link
                            to="/messages"
                            className="relative p-1.5 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-text-primary)' }}
                            title="Mesajlar"
                        >
                            <MessageSquare size={17} />
                            <UnreadBadge />
                        </Link>
                    )}

                    {/* Giriş yok */}
                    {!isAuthenticated && (
                        <div className="hidden md:flex items-center gap-2 ml-1">
                            <Link
                                to="/login"
                                className="font-mono text-xs font-bold tracking-widest uppercase transition-colors"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                GİRİŞ
                            </Link>
                            <Link
                                to="/register"
                                className="font-mono text-xs font-bold tracking-widest uppercase px-3 py-1.5 transition-opacity hover:opacity-80"
                                style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)' }}
                            >
                                KAYIT
                            </Link>
                        </div>
                    )}

                    {/* Profil avatar + dropdown */}
                    {isAuthenticated && user && (
                        <div className="relative ml-1" ref={profileRef}>
                            <button
                                onClick={() => setShowProfile(v => !v)}
                                className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                            >
                                <div
                                    className="w-[26px] h-[26px] rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-xs shrink-0"
                                    style={{
                                        background: 'var(--color-brand-primary)',
                                        color:      'var(--color-bg-base)',
                                        border:     '1.5px solid var(--color-brand-primary)',
                                        boxShadow:  '0 0 0 1px var(--color-bg-base)',
                                    }}
                                >
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.username}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                        />
                                    ) : null}
                                    <span style={{ display: user.avatar_url ? 'none' : 'flex' }}>
                                        {user.username?.[0]?.toUpperCase() ?? 'U'}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={11}
                                    className="hidden md:block transition-transform"
                                    style={{
                                        color:     'var(--color-text-primary)',
                                        transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                />
                            </button>

                            {/* ── Dropdown ── */}
                            {showProfile && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-64 overflow-hidden animate-fade-up"
                                    style={{ ...TS, zIndex: 100 }}
                                >
                                    <Corners />

                                    {/* Kullanıcı başlık */}
                                    <div className="px-4 py-3 border-b" style={BD}>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-mono text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                                {user.username}
                                            </p>
                                            {userLevel && (
                                                <Tooltip
                                                    content={xpStats ? `${xpStats.total_xp} XP toplam · Sonraki seviye için ${xpStats.xp_to_next_level} XP gerekli` : `Seviye ${userLevel}`}
                                                    side="bottom"
                                                >
                                                    <span
                                                        className="font-mono text-[9px] px-2 py-0.5 border shrink-0"
                                                        style={{
                                                            borderColor: 'var(--color-brand-primary)',
                                                            color:       'var(--color-brand-primary)',
                                                            background:  'rgba(16,185,129,0.08)',
                                                        }}
                                                    >
                                                        SEVİYE {userLevel}
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </div>
                                        <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                            {user.email ?? 'Kullanıcı'}
                                        </p>
                                    </div>


                                    {/* Linkler */}
                                    <div className="py-1">
                                        <Link
                                            to={`/users/${user.id}`}
                                            onClick={() => setShowProfile(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors hover:bg-brand/5"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            <User size={14} className="shrink-0" /> Profilim
                                        </Link>
                                        <Link to="/badges"
                                              className="flex items-center gap-2 px-4 py-2.5 border-b transition-colors hover:bg-white/5"
                                              style={BD}
                                              onClick={() => setShowProfile(false)}>
                                            <Award className="w-4 h-4" style={{ color: 'var(--color-accent-amber)' }} />
                                            <span className="font-mono text-sm">Rozetlerim</span>
                                        </Link>
                                        <Link
                                            to="/profile/settings"
                                            onClick={() => setShowProfile(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors hover:bg-brand/5"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            <Settings size={14} className="shrink-0" /> Ayarlar
                                        </Link>

                                        {isAdmin && (
                                            <>
                                                <Link to="/admin/users" onClick={() => setShowProfile(false)}
                                                      className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors hover:bg-brand/5"
                                                      style={{ color: 'var(--color-text-primary)' }}>
                                                    <Users size={14} className="shrink-0" /> Kullanıcılar
                                                </Link>
                                                <Link to="/admin/security" onClick={() => setShowProfile(false)}
                                                      className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors hover:bg-brand/5"
                                                      style={{ color: 'var(--color-text-primary)' }}>
                                                    <Shield size={14} className="shrink-0" /> Güvenlik
                                                </Link>
                                                <Link to="/admin/analytics" onClick={() => setShowProfile(false)}
                                                      className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors hover:bg-brand/5"
                                                      style={{ color: 'var(--color-text-primary)' }}>
                                                    <BarChart2 size={14} className="shrink-0" /> Analitik
                                                </Link>
                                            </>
                                        )}
                                    </div>

                                    <div className="border-t py-1" style={BD}>
                                        <button
                                            onClick={() => { logout(); setShowProfile(false); }}
                                            className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm w-full text-left transition-colors hover:bg-brand/5"
                                            style={{ color: '#ff7351' }}
                                        >
                                            <LogOut size={14} className="shrink-0" /> Çıkış Yap
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobil menü butonu */}
                    <button
                        onClick={() => setMenuOpen(o => !o)}
                        className="md:hidden p-1.5 transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {menuOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>
            </div>

            {/* Boru animasyonu — overflow:hidden wrapper dropdown'ları kesmez */}
            <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 2, overflow: 'hidden', zIndex: 1 }}>
                <div className="navbar-pipe-bead" />
            </div>

            {/* ── Gündem Kategori Barı ── */}
            {isGundem && (
                <CategoryBar
                    activeCategory={activeCategory}
                    onSelect={(val) => val ? setGundemParams({ category: val }) : setGundemParams({ forYou: '1' })}
                />
            )}

            {/* ── Mobil dropdown ── */}
            {menuOpen && (
                <div
                    className="md:hidden relative overflow-hidden animate-fade-up"
                    style={{ ...TS, borderTop: '1px solid var(--color-terminal-border-raw)' }}
                >
                    <Corners />
                    <nav className="flex flex-col px-4 py-3 gap-0.5">
                        {NAV_LINKS.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMenuOpen(false)}
                                className="px-3 py-2.5 font-mono text-sm font-bold tracking-widest uppercase transition-colors border-l-2"
                                style={{
                                    color:       isActive(item.path) ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                                    borderColor: isActive(item.path) ? 'var(--color-brand-primary)' : 'transparent',
                                }}
                            >
                                {item.name}
                            </Link>
                        ))}

                        {isAuthenticated ? (
                            <button
                                onClick={() => { logout(); setMenuOpen(false); }}
                                className="mt-2 px-3 py-2.5 font-mono text-sm font-bold tracking-widest uppercase text-left border-l-2 border-transparent transition-colors"
                                style={{ color: '#ff7351' }}
                            >
                                ÇIKIŞ
                            </button>
                        ) : (
                            <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }}>
                                <Link
                                    to="/login"
                                    onClick={() => setMenuOpen(false)}
                                    className="font-mono text-sm font-bold tracking-widest uppercase transition-colors"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    GİRİŞ
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setMenuOpen(false)}
                                    className="font-mono text-sm font-bold tracking-widest uppercase px-3 py-1 transition-opacity hover:opacity-80"
                                    style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)' }}
                                >
                                    KAYIT
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;
