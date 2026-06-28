import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Moon, Sun, Menu, X, ChevronDown, User, Settings, Shield, BarChart2, LogOut, Users, MessageSquare, Award } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import useCategories from '../../hooks/useCategories';
import CategoryCustomizeModal from './CategoryCustomizeModal';
import toast from '../../services/toast';
import { useWebSocket } from '../../contexts/WebSocketContext';
import NotificationBell from '../../features/notifications/NotificationBell';
import CornerBrackets from './CornerBrackets';
import Tooltip from '../ui/Tooltip';

// Okunmamış mesaj sayısı — profil menüsündeki "Mesajlar" satırı kullanır.
function useUnreadMessages() {
    const [count, setCount]   = React.useState(0);
    const { subscribe }       = useWebSocket();
    const { isAuthenticated } = useAuth();
    const location            = useLocation();

    React.useEffect(() => {
        if (!isAuthenticated) { setCount(0); return; }
        axiosInstance.get('/messages/unread-count').then(r => setCount(r.data.count ?? 0)).catch(() => {});
    }, [isAuthenticated]);

    React.useEffect(() => {
        const unsub = subscribe('dm.new_message', () => setCount(v => v + 1));
        return unsub;
    }, [subscribe]);

    React.useEffect(() => {
        if (location.pathname.startsWith('/messages')) setCount(0);
    }, [location.pathname]);

    return count;
}

const NAV_LINKS = [
    { name: 'Analiz',   path: '/'       },
    { name: 'Haberler', path: '/gundem' },
    { name: 'Forum',    path: '/forum'  },
    { name: 'Bildir',   path: '/report' },
];

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function CategoryBar({ activeCategory, onSelect, categories, hiddenCategories, onCustomize }) {
    const containerRef = useRef(null);
    const btnRefs      = useRef({});
    const [indicator,  setIndicator] = useState({ left: 0, width: 0, ready: false });

    const visibleMains = categories.filter(c => !hiddenCategories.includes(c.slug));
    const items = [
        { label: 'SİZİN İÇİN', value: null },
        ...visibleMains.map(c => ({ label: c.name.toLocaleUpperCase('tr-TR'), value: c.slug })),
    ];

    useLayoutEffect(() => {
        const key = activeCategory ?? '__foryou__';
        const btn = btnRefs.current[key];
        const container = containerRef.current;
        if (!btn || !container) return;
        const br = btn.getBoundingClientRect();
        const cr = container.getBoundingClientRect();
        setIndicator({ left: br.left - cr.left + container.scrollLeft, width: br.width, ready: true });
    }, [activeCategory]);

    return (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <div ref={containerRef}
                 className="max-w-7xl mx-auto px-2 flex items-center overflow-x-auto relative scrollbar-none"
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                            className="px-4 py-3 text-[11px] font-bold tracking-widest whitespace-nowrap transition-colors duration-200 shrink-0"
                            style={{
                                fontFamily: "'Elms Sans', sans-serif",
                                color:      isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                            }}
                        >
                            {item.label}
                        </button>
                    );
                })}
                <button
                    onClick={onCustomize}
                    className="px-4 py-3 text-[11px] font-bold tracking-widest whitespace-nowrap shrink-0 ml-auto"
                    style={{ fontFamily: "'Elms Sans', sans-serif", color: 'var(--color-text-secondary)' }}
                    title="Kategorileri özelleştir"
                >
                    ⚙ ÖZELLEŞTİR
                </button>
            </div>
        </div>
    );
}

function SubcategoryBar({ activeCategory, activeSub, categories, hiddenSubcategories, onSelect }) {
    const main = categories.find(c => c.slug === activeCategory);
    if (!main) return null;
    const subs = main.subcategories.filter(
        s => !hiddenSubcategories.includes(`${main.slug}/${s.slug}`)
    );
    if (subs.length === 0) return null;
    return (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="max-w-7xl mx-auto px-2 flex items-center gap-1 overflow-x-auto scrollbar-none"
                 style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => onSelect(null)}
                        className="px-3 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap shrink-0"
                        style={{ color: !activeSub ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                    TÜMÜ
                </button>
                {subs.map(s => (
                    <button key={s.slug} onClick={() => onSelect(s.slug)}
                        className="px-3 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap shrink-0"
                        style={{ color: activeSub === s.slug ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                        {s.name.toLocaleUpperCase('tr-TR')}
                    </button>
                ))}
            </div>
        </div>
    );
}

const Corners = () => (
    <>
        <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
        <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none z-10" />
    </>
);

// Profil menüsündeki tıklanabilir satır.
function MenuRow({ icon: Icon, label, onClick, to, iconColor, danger, onClose, children }) {
    const color = danger ? '#ff7351' : 'var(--color-text-primary)';
    const inner = (
        <>
            <Icon size={16} className="shrink-0" style={{ color: iconColor ?? color }} />
            <span className="flex-1 font-mono text-sm" style={{ color }}>{label}</span>
            {children}
        </>
    );
    const cls = 'flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors hover:bg-brand/5';
    if (to) {
        return (
            <Link to={to} onClick={onClose} className={cls}>{inner}</Link>
        );
    }
    return (
        <button onClick={onClick} className={cls}>{inner}</button>
    );
}

// Masaüstü menü — aktif sekmenin çentikli odak kutusu yumuşakça kayar.
function DesktopNav() {
    const location = useLocation();
    const linkRefs = useRef({});
    const [ind, setInd] = useState({ left: 0, width: 0, ready: false });

    useLayoutEffect(() => {
        const active = NAV_LINKS.find(l => l.path === location.pathname);
        const el     = active ? linkRefs.current[active.path] : null;
        if (!el) { setInd(i => ({ ...i, ready: false })); return; }
        setInd({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }, [location.pathname]);

    return (
        <nav className="hidden md:flex items-center gap-2 shrink-0 relative">
            {/* Kayan odak kutusu */}
            <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                    left:       ind.left,
                    width:      ind.width,
                    opacity:    ind.ready ? 1 : 0,
                    background: 'rgba(16,185,129,0.08)',
                    transition: 'left 0.38s cubic-bezier(0.22,1,0.36,1), width 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease',
                }}
            >
                <CornerBrackets color="#47b172" length={11} thickness={2} />
            </div>

            {NAV_LINKS.map((item) => {
                const active = location.pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        ref={el => { linkRefs.current[item.path] = el; }}
                        className="relative px-3.5 py-1.5 text-[16px] font-medium leading-none transition-colors"
                        style={{
                            color: active ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                        }}
                    >
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
}

const Navbar = () => {
    const location              = useLocation();
    const navigate              = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isAuthenticated, user, isAdmin, logout } = useAuth();
    const [menuOpen,    setMenuOpen]    = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef(null);
    const isActive   = (path) => location.pathname === path;
    const [gundemParams, setGundemParams] = useSearchParams();
    const isGundem       = location.pathname === '/gundem';
    const activeCategory = isGundem ? (gundemParams.get('category') ?? null) : null;
    const activeSub      = isGundem ? gundemParams.get('subcategory') : null;

    const { categories } = useCategories();
    const [hiddenCategories, setHiddenCategories] = useState([]);
    const [hiddenSubcategories, setHiddenSubcategories] = useState([]);
    const [customizeOpen, setCustomizeOpen] = useState(false);

    const loadHidden = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/users/me/feed-preferences');
            setHiddenCategories(data.hidden_categories || []);
            setHiddenSubcategories(data.hidden_subcategories || []);
        } catch { /* anonim ya da hata: gizli yok */ }
    }, []);
    useEffect(() => { if (user) loadHidden(); }, [user, loadHidden]);

    const handleCustomize = () => {
        if (user) { setCustomizeOpen(true); return; }
        toast.info('Kategorileri özelleştirmek için giriş yapmalısın.');
        navigate('/login');
    };

    const unreadMessages = useUnreadMessages();

    useEffect(() => { setMenuOpen(false); setShowProfile(false); }, [location.pathname]);

    const [userLevel, setUserLevel] = React.useState(null);
    const [xpStats,   setXpStats]   = React.useState(null);

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
            className="fixed top-8 left-0 right-0 z-50"
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

                {/* ── NAV — masaüstü, ortada, kayan odaklı ── */}
                <DesktopNav />

                {/* ── SAĞ — flex-1 + justify-end ── */}
                <div className="flex-1 flex items-center justify-end gap-1">

                    {/* Giriş yok */}
                    {!isAuthenticated && (
                        <div className="hidden md:flex items-center gap-3">
                            <Link
                                to="/login"
                                className="font-mono text-[13px] font-bold tracking-widest uppercase transition-colors"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                GİRİŞ
                            </Link>
                            <Link
                                to="/register"
                                className="font-mono text-[13px] font-bold tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80"
                                style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)' }}
                            >
                                KAYIT
                            </Link>
                        </div>
                    )}

                    {/* Bildirim + mesaj ikonları (eski yerleri) */}
                    {isAuthenticated && user && <NotificationBell />}
                    {isAuthenticated && user && (
                        <Link
                            to="/messages"
                            className="relative p-2 flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-text-primary)' }}
                            title="Mesajlar"
                        >
                            <MessageSquare size={18} />
                            {unreadMessages > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 text-white font-mono font-black w-4 h-4 flex items-center justify-center"
                                    style={{ background: '#ff7351', fontSize: '9px' }}
                                >
                                    {unreadMessages > 9 ? '9+' : unreadMessages}
                                </span>
                            )}
                        </Link>
                    )}

                    {/* Profil avatar + dropdown */}
                    {isAuthenticated && user && (
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfile(v => !v)}
                                className="flex items-center gap-1.5 pl-1 transition-opacity hover:opacity-80"
                            >
                                <div
                                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-xs shrink-0"
                                    style={{
                                        background: 'var(--color-brand-primary)',
                                        color:      'var(--color-bg-base)',
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
                                    size={13}
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
                                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden animate-fade-up"
                                    style={{ ...TS, zIndex: 100 }}
                                >
                                    <Corners />

                                    {/* Kullanıcı başlık */}
                                    <div className="px-3 py-3 border-b" style={BD}>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-sm shrink-0"
                                                style={{ background: 'var(--color-brand-primary)', color: 'var(--color-bg-base)' }}
                                            >
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.username}
                                                         className="w-full h-full object-cover" referrerPolicy="no-referrer"
                                                         onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                                                ) : null}
                                                <span style={{ display: user.avatar_url ? 'none' : 'flex' }}>
                                                    {user.username?.[0]?.toUpperCase() ?? 'U'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
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
                                                <p className="font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                                                    @{user.username ?? 'kullanici'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tema */}
                                    <div className="border-b" style={BD}>
                                        <MenuRow
                                            icon={isDarkMode ? Sun : Moon}
                                            label={isDarkMode ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
                                            onClick={toggleTheme}
                                        />
                                    </div>

                                    {/* Profil linkleri */}
                                    <div className="py-1">
                                        <MenuRow icon={User} label="Profilim" to={`/users/${user.id}`} onClose={() => setShowProfile(false)} />
                                        <MenuRow icon={Award} label="Rozetlerim" to="/badges" iconColor="var(--color-accent-amber)" onClose={() => setShowProfile(false)} />
                                        <MenuRow icon={Settings} label="Ayarlar" to="/profile/settings" onClose={() => setShowProfile(false)} />

                                        {isAdmin && (
                                            <>
                                                <MenuRow icon={Users} label="Kullanıcılar" to="/admin/users" onClose={() => setShowProfile(false)} />
                                                <MenuRow icon={Shield} label="Güvenlik" to="/admin/security" onClose={() => setShowProfile(false)} />
                                                <MenuRow icon={BarChart2} label="Analitik" to="/admin/analytics" onClose={() => setShowProfile(false)} />
                                            </>
                                        )}
                                    </div>

                                    <div className="border-t py-1" style={BD}>
                                        <MenuRow icon={LogOut} label="Çıkış Yap" danger
                                                 onClick={() => { navigate('/'); logout(); setShowProfile(false); }} />
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
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* ── Gündem Kategori Barı ── */}
            {isGundem && (
                <CategoryBar
                    activeCategory={activeCategory}
                    onSelect={(val) => val ? setGundemParams({ category: val }) : setGundemParams({})}
                    categories={categories}
                    hiddenCategories={hiddenCategories}
                    onCustomize={handleCustomize}
                />
            )}

            {isGundem && activeCategory && (
                <SubcategoryBar
                    activeCategory={activeCategory}
                    activeSub={activeSub}
                    categories={categories}
                    hiddenSubcategories={hiddenSubcategories}
                    onSelect={(sub) => setGundemParams(
                        sub ? { category: activeCategory, subcategory: sub } : { category: activeCategory }
                    )}
                />
            )}

            {customizeOpen && (
                <CategoryCustomizeModal
                    categories={categories}
                    hiddenCategories={hiddenCategories}
                    hiddenSubcategories={hiddenSubcategories}
                    onClose={() => { setCustomizeOpen(false); loadHidden(); }}
                    onChange={loadHidden}
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

                        {/* Mobilde tema değiştir */}
                        <button
                            onClick={toggleTheme}
                            className="mt-1 px-3 py-2.5 font-mono text-sm font-bold tracking-widest uppercase text-left border-l-2 border-transparent transition-colors flex items-center gap-2"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                            {isDarkMode ? 'AYDINLIK MOD' : 'KARANLIK MOD'}
                        </button>

                        {isAuthenticated ? (
                            <button
                                onClick={() => { navigate('/'); logout(); setMenuOpen(false); }}
                                className="mt-1 px-3 py-2.5 font-mono text-sm font-bold tracking-widest uppercase text-left border-l-2 border-transparent transition-colors"
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
