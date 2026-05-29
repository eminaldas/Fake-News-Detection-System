import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Calendar, MessageSquare, Settings, UserPlus, UserMinus,
    X, ChevronLeft, ChevronRight, Loader2, Search,
    Twitter, Instagram, Github, Linkedin, Globe, Link2,
    BarChart2, MessagesSquare, ShieldAlert, ArrowRight,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import GamificationService from '../services/gamification.service';
import BadgeShowcase from '../features/profile/BadgeShowcase';
import HistoryModal from '../features/profile/HistoryModal';
import { TypeBadge } from '../components/common/AnalysisBadges';
import RecommendedUsersWidget from '../features/profile/RecommendedUsersWidget';
import PopularThreadsWidget from '../features/profile/PopularThreadsWidget';

/* ── Sabitler ──────────────────────────────────────────────────────── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};

const CAT_COLOR = {
    Siyaset:   'var(--color-accent-blue)',
    Ekonomi:   'var(--color-accent-amber)',
    Bilim:     '#a855f7',
    Spor:      '#ec4899',
    Teknoloji: '#06b6d4',
};

const PRED_ACCENT = {
    FAKE:      'var(--color-fake-fill)',
    AUTHENTIC: 'var(--color-brand-primary)',
    UNCERTAIN: 'var(--color-accent-amber)',
};
const PRED_L = { FAKE: 'Sahte İçerik', AUTHENTIC: 'Doğrulandı', UNCERTAIN: 'Belirsiz' };
const PRED_BADGE = {
    FAKE:      { background: 'rgba(255,115,81,0.15)', color: 'var(--color-fake-text)',      border: '1px solid rgba(255,115,81,0.3)' },
    AUTHENTIC: { background: 'rgba(16,185,129,0.15)', color: 'var(--color-authentic-text)', border: '1px solid rgba(16,185,129,0.3)' },
    UNCERTAIN: { background: 'rgba(245,158,11,0.15)', color: 'var(--color-iddia-text)',      border: '1px solid rgba(245,158,11,0.3)' },
};
const FILTER_COLOR = {
    FAKE:      'var(--color-fake-fill)',
    AUTHENTIC: 'var(--color-brand-primary)',
    UNCERTAIN: 'var(--color-accent-amber)',
};

/* ── Corner ────────────────────────────────────────────────────────── */
function Corner() {
    return (
        <>
            <div className="absolute top-0 left-0 w-4 h-0.5 bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-0.5 bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-0.5 bg-brand pointer-events-none" />
        </>
    );
}

/* ── Avatar ────────────────────────────────────────────────────────── */
const PAL_BG   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

function UserAvatar({ username, avatarUrl, trustTier, onClick }) {
    const idx    = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
    const border = TIER_COLOR[trustTier ?? 'yeni_uye'];
    return (
        <button onClick={onClick} className="shrink-0 cursor-zoom-in group relative rounded-full"
                style={{ width: 128, height: 128 }}>
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-5xl"
                 style={{ background: PAL_BG[idx], color: PAL_TEXT[idx], border: `4px solid ${border}` }}>
                {avatarUrl
                    ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
                           referrerPolicy="no-referrer"
                           onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : (username ?? '?')[0].toUpperCase()}
            </div>
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                 style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Search className="w-6 h-6 text-white" />
            </div>
        </button>
    );
}

/* ── FollowModal ────────────────────────────────────────────────────── */
function FollowModal({ userId, mode, onClose }) {
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axiosInstance.get(`/users/${userId}/${mode}`)
            .then(({ data }) => setItems(data.items ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId, mode]);

    return createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.80)' }} onClick={onClose}>
            <div className="relative border w-80 max-h-[70vh] flex flex-col"
                 style={S} onClick={e => e.stopPropagation()}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-manrope font-bold text-sm"
                          style={{ color: 'var(--color-text-primary)' }}>
                        {mode === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
                    </span>
                    <button onClick={onClose} className="transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="p-6 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            henüz yok
                        </div>
                    ) : items.map(u => (
                        <button key={u.id}
                                onClick={() => { navigate(`/users/${u.id}`); onClose(); }}
                                className="flex items-center gap-3 w-full px-4 py-3 border-b border-l-2 transition-all text-left"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}>
                            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 font-black text-sm"
                                 style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                                {u.avatar_url
                                    ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    : u.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-manrope font-bold text-sm truncate"
                                   style={{ color: 'var(--color-text-primary)' }}>{u.username}</p>
                                <p className="font-mono text-[10px]"
                                   style={{ color: TIER_COLOR[u.trust_tier] ?? 'var(--color-text-muted)' }}>
                                    {u.trust_label}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ── Yardımcılar ────────────────────────────────────────────────────── */
function timeAgo(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60)     return `${Math.floor(s)}s`;
    if (s < 3600)   return `${Math.floor(s / 60)}dk`;
    if (s < 86400)  return `${Math.floor(s / 3600)}sa`;
    if (s < 604800) return `${Math.floor(s / 86400)}g`;
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function Pagination({ page, totalPages, load }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-3 pt-4">
            <button disabled={page <= 1} onClick={() => load(page - 1)}
                    className="font-mono text-xs px-3 py-1.5 border transition-colors disabled:opacity-30"
                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                ← Önceki
            </button>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)}
                    className="font-mono text-xs px-3 py-1.5 border transition-colors disabled:opacity-30"
                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                Sonraki →
            </button>
        </div>
    );
}

/* ── Bölüm başlığı ─────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, label, onMore }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
            <span className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {label}
            </span>
            <div className="grow h-px mx-1" style={{ background: 'var(--color-terminal-border-raw)', opacity: 0.4 }} />
            {onMore && (
                <button onClick={onMore}
                        className="flex items-center gap-1 font-mono text-[10px] transition-opacity hover:opacity-70 shrink-0"
                        style={{ color: 'var(--color-brand-primary)' }}>
                    tümü <ArrowRight className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   ANA BİLEŞEN
   ══════════════════════════════════════════════════════════════════════ */
export default function Profile() {
    const { userId }  = useParams();
    const { user }    = useAuth();
    const navigate    = useNavigate();

    const [profile,   setProfile]   = useState(null);
    const [xpStats,   setXpStats]   = useState(null);
    const [showcase,  setShowcase]  = useState([]);
    const [threads,   setThreads]   = useState([]);
    const [analyses,  setAnalyses]  = useState([]);
    const [threadTotal,   setThreadTotal]   = useState(0);
    const [analysisTotal, setAnalysisTotal] = useState(0);
    const [threadPage,    setThreadPage]    = useState(1);
    const [analysisPage,  setAnalysisPage]  = useState(1);
    const [loading,     setLoading]     = useState(true);
    const [tLoading,    setTLoading]    = useState(false);
    const [aLoading,    setALoading]    = useState(false);
    const [following,   setFollowing]   = useState(false);
    const [fLoading,    setFLoading]    = useState(false);
    const [activeTab,      setActiveTab]      = useState('overview');
    const [analysisFilter, setAnalysisFilter] = useState(null);
    const [followModal,    setFollowModal]    = useState(null);
    const [lightbox,       setLightbox]       = useState(false);
    const [selectedItem,   setSelectedItem]   = useState(null);
    const [error,          setError]          = useState(null);

    const SIZE = 10;
    const isOwnProfile = user?.id === userId;

    useEffect(() => {
        setLoading(true);
        Promise.all([
            axiosInstance.get(`/users/${userId}/profile`),
            GamificationService.getUserStats(userId).catch(() => null),
            GamificationService.getUserShowcase(userId).catch(() => []),
        ]).then(([profileRes, xp, sc]) => {
            setProfile(profileRes.data);
            setFollowing(profileRes.data.is_following ?? false);
            setXpStats(xp);
            setShowcase(Array.isArray(sc) ? sc : []);
        }).catch(() => setError('Profil yüklenemedi.'))
          .finally(() => setLoading(false));
    }, [userId]);

    const loadThreads = useCallback((pg = 1) => {
        setTLoading(true);
        axiosInstance.get(`/users/${userId}/threads`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => { setThreads(data.items ?? []); setThreadTotal(data.total ?? 0); setThreadPage(pg); })
            .catch(() => {})
            .finally(() => setTLoading(false));
    }, [userId]);

    const loadAnalyses = useCallback((pg = 1, bigLoad = false) => {
        setALoading(true);
        const params = bigLoad ? { page: 1, size: 50 } : { page: pg, size: SIZE };
        axiosInstance.get(`/users/${userId}/analyses`, { params })
            .then(({ data }) => { setAnalyses(data.items ?? []); setAnalysisTotal(data.total ?? 0); setAnalysisPage(pg); })
            .catch(() => {})
            .finally(() => setALoading(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);
    useEffect(() => { loadAnalyses(1); }, [loadAnalyses]);

    useEffect(() => {
        if (analysisFilter) loadAnalyses(1, true);
        else loadAnalyses(1, false);
    }, [analysisFilter]);

    const handleFollow = async () => {
        if (!user || fLoading) return;
        setFLoading(true);
        try {
            await axiosInstance.post(`/users/${userId}/follow`);
            setFollowing(v => !v);
            setProfile(prev => prev ? {
                ...prev,
                follower_count: prev.follower_count + (following ? -1 : 1),
            } : prev);
        } catch { }
        finally { setFLoading(false); }
    };

    if (loading) return (
        <div className="max-w-6xl mx-auto px-4 pt-10 flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
    );
    if (error || !profile) return (
        <div className="max-w-6xl mx-auto px-4 pt-10 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{error ?? 'Profil bulunamadı.'}</p>
        </div>
    );

    const joinedDate = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
        : null;
    const tierColor = TIER_COLOR[profile.trust_tier ?? 'yeni_uye'];

    const threadTotalPages   = Math.ceil(threadTotal / SIZE);
    const analysisTotalPages = Math.ceil(analysisTotal / SIZE);

    const SOCIAL_ICONS  = { twitter: Twitter, instagram: Instagram, github: Github, linkedin: Linkedin, website: Globe };
    const SOCIAL_LABEL  = { twitter: 'X', instagram: 'Instagram', github: 'GitHub', linkedin: 'LinkedIn', website: 'Website' };
    const socialEntries = profile.social_links
        ? Object.entries(profile.social_links).filter(([, v]) => !!v)
        : [];

    const filteredAnalyses = analysisFilter
        ? analyses.filter(a => a.prediction === analysisFilter)
        : analyses;

    return (
        <div className="max-w-6xl mx-auto px-4 pb-16">

            {/* ══ HERO ════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 100 }}
            >
            <div className="relative border mb-8" style={S}>
                <Corner />

                {/* Cover: arka planın grid'i görünsün diye saydam → koyu gradyan */}
                <div className="h-48 w-full relative overflow-hidden"
                     style={{
                         backgroundImage: 'linear-gradient(to right, var(--color-terminal-border-raw) 1px, transparent 1px), linear-gradient(to bottom, var(--color-terminal-border-raw) 1px, transparent 1px)',
                         backgroundSize: '40px 40px',
                         backgroundColor: 'var(--color-bg-base)',
                     }}>
                    <div className="absolute inset-0"
                         style={{ background: 'linear-gradient(to top, var(--color-terminal-surface) 10%, rgba(7,15,18,0.5) 60%, transparent 100%)' }} />
                    <div className="absolute top-3 left-3 w-6 h-0.5 bg-brand opacity-60" />
                    <div className="absolute top-3 left-3 h-6 w-0.5 bg-brand opacity-60" />
                    <div className="absolute top-3 right-3 w-6 h-0.5 bg-brand opacity-60" />
                    <div className="absolute top-3 right-3 h-6 w-0.5 bg-brand opacity-60" />
                </div>

                {/* Avatar + bilgiler */}
                <div className="relative z-10 px-6 md:px-10 pb-8 -mt-16 flex flex-col md:flex-row gap-6 md:items-end justify-between">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-end w-full">
                        <UserAvatar
                            username={profile.username}
                            avatarUrl={profile.avatar_url}
                            trustTier={profile.trust_tier}
                            onClick={() => setLightbox(true)}
                        />

                        <div className="grow pb-2">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h1 className="text-3xl font-manrope font-black tracking-tight"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.username}
                                </h1>
                                {profile.trust_tier && profile.trust_tier !== 'yeni_uye' && (
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider"
                                          style={{ color: tierColor, borderColor: tierColor + '55', background: tierColor + '14' }}>
                                        {profile.trust_label}
                                    </span>
                                )}
                            </div>

                            <p className="font-mono text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                @{profile.username}
                            </p>

                            {profile.bio && (
                                <p className="text-sm leading-relaxed max-w-2xl mb-3"
                                   style={{ color: 'var(--color-text-primary)', opacity: 0.88 }}>
                                    {profile.bio}
                                </p>
                            )}

                            <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {joinedDate && (
                                    <span className="flex items-center gap-1 font-mono">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {joinedDate} tarihinden beri üye
                                    </span>
                                )}
                                {socialEntries.map(([key, url]) => {
                                    const Icon  = SOCIAL_ICONS[key] ?? Link2;
                                    const label = SOCIAL_LABEL[key] ?? key;
                                    return (
                                        <a key={key}
                                           href={url.startsWith('http') ? url : `https://${url}`}
                                           target="_blank" rel="noopener noreferrer"
                                           className="flex items-center gap-1 font-mono transition-opacity hover:opacity-70"
                                           style={{ color: 'var(--color-brand-primary)' }}>
                                            <Icon className="w-3.5 h-3.5" /> {label}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Aksiyon butonları */}
                    <div className="flex gap-3 shrink-0 pb-2">
                        {isOwnProfile ? (
                            <Link to="/profile/settings"
                                  className="flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold border transition-colors"
                                  style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}>
                                <Settings className="w-4 h-4" /> Ayarlar
                            </Link>
                        ) : user && (
                            <>
                                <Link to={`/messages/${userId}`}
                                      className="flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold border transition-colors"
                                      style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}>
                                    <MessageSquare className="w-4 h-4" /> Mesaj
                                </Link>
                                <button
                                    onClick={handleFollow}
                                    disabled={fLoading}
                                    className="flex items-center gap-2 px-6 py-2 font-mono text-sm font-bold transition-all disabled:opacity-50"
                                    style={following ? {
                                        background: 'transparent',
                                        border: '1px solid var(--color-terminal-border-raw)',
                                        color: 'var(--color-text-primary)',
                                    } : {
                                        background: 'linear-gradient(135deg, var(--color-brand-primary) 0%, rgba(16,185,129,0.80) 100%)',
                                        border: 'none',
                                        color: '#070f12',
                                        boxShadow: '0 0 15px rgba(16,185,129,0.30)',
                                    }}
                                    onMouseEnter={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 28px rgba(16,185,129,0.55)'; }}
                                    onMouseLeave={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 15px rgba(16,185,129,0.30)'; }}
                                >
                                    {fLoading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : following
                                            ? <><UserMinus className="w-4 h-4" /> Takipte</>
                                            : <><UserPlus className="w-4 h-4" /> Takip Et</>
                                    }
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats strip */}
                <div className="border-t px-6 py-4 flex flex-wrap gap-8 justify-start md:justify-around text-center"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                    {[
                        { label: 'Tartışma',     value: profile.thread_count,    color: 'var(--color-text-primary)',  onClick: null },
                        { label: 'Takipçi',      value: profile.follower_count,  color: 'var(--color-text-primary)',  onClick: () => setFollowModal('followers') },
                        { label: 'Takip',        value: profile.following_count, color: 'var(--color-text-primary)',  onClick: () => setFollowModal('following') },
                        { label: 'Analiz',       value: profile.analysis_count,  color: 'var(--color-brand-primary)', onClick: () => { setActiveTab('analyses'); setAnalysisFilter(null); } },
                        { label: 'Sahte Tespit', value: profile.fake_count,      color: 'var(--color-fake-fill)',     onClick: () => { setActiveTab('analyses'); setAnalysisFilter('FAKE'); } },
                    ].map(({ label, value, color, onClick }) => (
                        <div key={label} onClick={onClick ?? undefined}
                             className={`text-center${onClick ? ' cursor-pointer group' : ''}`}>
                            <div className="text-2xl font-manrope font-bold transition-opacity group-hover:opacity-75"
                                 style={{ color }}>{value ?? 0}</div>
                            <div className="font-mono text-[10px] uppercase tracking-widest mt-0.5 font-semibold"
                                 style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                        </div>
                    ))}

                    {xpStats && (
                        <div className="border-l pl-8 text-center" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                            <div className="text-2xl font-manrope font-bold"
                                 style={{ color: 'var(--color-text-primary)' }}>
                                Seviye <span style={{ color: 'var(--color-brand-primary)' }}>{xpStats.level}</span>
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-widest mt-0.5 font-semibold"
                                 style={{ color: 'var(--color-text-muted)' }}>
                                Toplam XP: {xpStats.total_xp}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </motion.div>

            {/* ══ İKİ SÜTUN ════════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Sol sütun — 2/3 */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    {/* Tab çubuğu */}
                    <div className="flex gap-6 border-b overflow-x-auto" style={BD}>
                        {[
                            { key: 'overview',  label: 'Genel Bakış' },
                            { key: 'threads',   label: `Tartışmalar (${threadTotal})` },
                            { key: 'analyses',  label: `Analizlerim (${analysisTotal})` },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className="pb-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap"
                                    style={activeTab === tab.key ? {
                                        borderColor: 'var(--color-brand-primary)',
                                        color: 'var(--color-brand-primary)',
                                    } : {
                                        borderColor: 'transparent',
                                        color: 'var(--color-text-muted)',
                                    }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <OverviewTab threads={threads} analyses={analyses} tLoading={tLoading} aLoading={aLoading}
                                     setActiveTab={setActiveTab} setSelectedItem={setSelectedItem} />
                    )}
                    {activeTab === 'threads' && (
                        <ThreadsTab threads={threads} loading={tLoading} page={threadPage}
                                    totalPages={threadTotalPages} load={loadThreads} />
                    )}
                    {activeTab === 'analyses' && (
                        <AnalysesTab analyses={filteredAnalyses} loading={aLoading} page={analysisPage}
                                     totalPages={analysisTotalPages} load={loadAnalyses}
                                     filter={analysisFilter} clearFilter={() => setAnalysisFilter(null)}
                                     setSelectedItem={setSelectedItem} />
                    )}
                </div>

                {/* Sağ sütun — 1/3 */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <BadgeShowcase showcase={showcase} isOwnProfile={isOwnProfile} />
                    <RecommendedUsersWidget profileUserId={userId} currentUserId={user?.id} />
                    <PopularThreadsWidget />
                </div>
            </div>

            {/* ══ MODALS ══════════════════════════════════════════════════ */}

            {lightbox && createPortal(
                <div className="fixed inset-0 z-9999 flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
                     onClick={() => setLightbox(false)}>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <div className="overflow-hidden"
                             style={{ width: 260, height: 260, borderRadius: '50%', border: `4px solid ${tierColor}` }}>
                            {profile.avatar_url
                                ? <img src={profile.avatar_url} alt={profile.username}
                                       className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-full h-full flex items-center justify-center font-black"
                                       style={{
                                           background: PAL_BG[(profile.username?.charCodeAt(0) ?? 0) % PAL_BG.length],
                                           color: PAL_TEXT[(profile.username?.charCodeAt(0) ?? 0) % PAL_TEXT.length],
                                           fontSize: 90
                                       }}>
                                    {profile.username?.[0]?.toUpperCase()}
                                  </div>}
                        </div>
                        <button onClick={() => setLightbox(false)}
                                className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center border"
                                style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-terminal-border-raw)' }}>
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                        <p className="font-manrope font-bold text-sm text-center mt-4"
                           style={{ color: 'var(--color-text-primary)' }}>{profile.username}</p>
                    </div>
                </div>,
                document.body
            )}

            {followModal && (
                <FollowModal userId={userId} mode={followModal} onClose={() => setFollowModal(null)} />
            )}

            {selectedItem && (
                <HistoryModal
                    item={selectedItem}
                    hasFullReport={!!selectedItem.task_id}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
}

/* ── Thread kartı ─────────────────────────────────────────────────── */
function ThreadCard({ thread }) {
    const catColor = CAT_COLOR[thread.category] ?? 'var(--color-accent-blue)';
    return (
        <article className="border transition-colors cursor-pointer group"
                 style={S}
                 onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-terminal-surface)'; }}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    {thread.category && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0"
                              style={{ color: catColor, borderColor: catColor + '40', background: catColor + '10' }}>
                            {thread.category}
                        </span>
                    )}
                    <span className="font-mono text-[11px] shrink-0 ml-auto"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {timeAgo(thread.created_at)}
                    </span>
                </div>

                <Link to={`/forum/${thread.id}`}>
                    <h3 className="font-manrope font-semibold text-base leading-snug line-clamp-2 mb-2 transition-colors group-hover:text-brand"
                        style={{ color: 'var(--color-text-primary)' }}>
                        {thread.title}
                    </h3>
                </Link>

                {thread.body && (
                    <p className="text-sm leading-relaxed line-clamp-2 mb-4"
                       style={{ color: 'var(--color-text-secondary)' }}>
                        {thread.body}
                    </p>
                )}

                <div className="flex items-center gap-4 pt-3 border-t font-mono text-xs"
                     style={{ borderColor: 'rgba(65,73,77,0.2)', color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {thread.comment_count ?? 0} Yorum
                    </span>
                </div>
            </div>
        </article>
    );
}

/* ── Analiz kartı — tıklanabilir ──────────────────────────────────── */
function AnalysisCard({ item, setSelectedItem }) {
    const accentColor = PRED_ACCENT[item.prediction] ?? 'transparent';
    return (
        <article className="border overflow-hidden transition-colors cursor-pointer group relative"
                 style={S}
                 onClick={() => setSelectedItem(item)}
                 onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-terminal-surface)'; }}>
            {item.prediction && (
                <div className="absolute right-0 top-0 bottom-0 w-1"
                     style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)`, opacity: 0.55 }} />
            )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={item.analysis_type} />
                        <span className="font-mono text-[10px] px-2 py-0.5 border"
                              style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.06)' }}>
                            Analiz Raporu
                        </span>
                    </div>
                    <span className="font-mono text-[11px] shrink-0"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </span>
                </div>

                <h3 className="font-manrope font-semibold text-base leading-snug line-clamp-2 mb-4 transition-colors group-hover:text-brand"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {item.title ?? item.task_id ?? '—'}
                </h3>

                {item.prediction && (
                    <div className="flex items-center justify-between pt-3 border-t"
                         style={{ borderColor: 'rgba(65,73,77,0.2)' }}>
                        <span className="font-mono text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider"
                              style={PRED_BADGE[item.prediction] ?? {}}>
                            {PRED_L[item.prediction] ?? item.prediction}
                        </span>
                        {item.confidence != null && (
                            <span className="font-mono text-xs"
                                  style={{ color: 'var(--color-text-muted)' }}>
                                %{Math.round(item.confidence * 100)} Güvenilirlik
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

/* ── Genel Bakış ──────────────────────────────────────────────────── */
function OverviewTab({ threads, analyses, tLoading, aLoading, setActiveTab, setSelectedItem }) {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <SectionHeader icon={MessagesSquare} label="Son Paylaşımlar"
                               onMore={() => setActiveTab('threads')} />
                {tLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                    </div>
                ) : threads.length === 0 ? (
                    <p className="font-mono text-xs py-6" style={{ color: 'var(--color-text-muted)' }}>henüz tartışma yok</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {threads.slice(0, 2).map(t => <ThreadCard key={t.id} thread={t} />)}
                    </div>
                )}
            </div>

            <div>
                <SectionHeader icon={BarChart2} label="Son Analizler"
                               onMore={() => setActiveTab('analyses')} />
                {aLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                    </div>
                ) : analyses.length === 0 ? (
                    <p className="font-mono text-xs py-6" style={{ color: 'var(--color-text-muted)' }}>henüz analiz yok</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {analyses.slice(0, 3).map((a, i) => (
                            <AnalysisCard key={a.id ?? i} item={a} setSelectedItem={setSelectedItem} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Tartışmalar Tab ──────────────────────────────────────────────── */
function ThreadsTab({ threads, loading, page, totalPages, load }) {
    return (
        <div className="flex flex-col gap-4">
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-20">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20"
                                   style={{ color: 'var(--color-text-muted)' }} />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>henüz tartışma yok</p>
                </div>
            ) : (
                <>
                    {threads.map(t => <ThreadCard key={t.id} thread={t} />)}
                    <Pagination page={page} totalPages={totalPages} load={load} />
                </>
            )}
        </div>
    );
}

/* ── Analizlerim Tab ──────────────────────────────────────────────── */
function AnalysesTab({ analyses, loading, page, totalPages, load, filter, clearFilter, setSelectedItem }) {
    return (
        <div className="flex flex-col gap-4">
            {filter && (
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] px-2 py-1 border"
                          style={{ color: FILTER_COLOR[filter], borderColor: FILTER_COLOR[filter] + '50' }}>
                        {PRED_L[filter]} filtresi aktif
                    </span>
                    <button onClick={clearFilter}
                            className="font-mono text-[10px] transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-primary)' }}>
                        × temizle
                    </button>
                </div>
            )}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                </div>
            ) : analyses.length === 0 ? (
                <div className="text-center py-20">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-20"
                                 style={{ color: 'var(--color-text-muted)' }} />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {filter ? `${PRED_L[filter]} sonucu bulunamadı` : 'henüz analiz yok'}
                    </p>
                </div>
            ) : (
                <>
                    {analyses.map((a, i) => (
                        <AnalysisCard key={a.id ?? i} item={a} setSelectedItem={setSelectedItem} />
                    ))}
                    {!filter && <Pagination page={page} totalPages={totalPages} load={load} />}
                </>
            )}
        </div>
    );
}
