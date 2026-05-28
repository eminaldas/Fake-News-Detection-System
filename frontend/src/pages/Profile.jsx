import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Calendar, MessageSquare, Settings, UserPlus, UserMinus,
    X, ChevronLeft, ChevronRight, Search, Loader2, ExternalLink,
    Twitter, Instagram, Github, Linkedin, Globe, Link2,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import GamificationService from '../services/gamification.service';
import BadgeShowcase from '../features/profile/BadgeShowcase';
import HistoryModal from '../features/profile/HistoryModal';
import RecommendedUsersWidget from '../features/profile/RecommendedUsersWidget';
import PopularThreadsWidget from '../features/profile/PopularThreadsWidget';
import { TypeBadge } from '../components/common/AnalysisBadges';

/* ── Sabitler ─────────────────────────────────────────────────────── */
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

const PRED_C = {
    FAKE:      'var(--color-fake-fill)',
    AUTHENTIC: 'var(--color-brand-primary)',
    UNCERTAIN: 'var(--color-accent-amber)',
};
const PRED_L = { FAKE: 'Sahte İçerik', AUTHENTIC: 'Doğrulandı', UNCERTAIN: 'Belirsiz' };
const PRED_STYLE = {
    FAKE:      { color: 'var(--color-fake-text)',      borderColor: 'var(--color-fake-border)',      background: 'var(--color-fake-bg)' },
    AUTHENTIC: { color: 'var(--color-authentic-text)', borderColor: 'var(--color-authentic-border)', background: 'var(--color-authentic-bg)' },
    UNCERTAIN: { color: 'var(--color-iddia-text)',     borderColor: 'var(--color-iddia-border)',     background: 'var(--color-iddia-bg)' },
};

/* ── Corner ───────────────────────────────────────────────────────── */
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

/* ── Avatar ───────────────────────────────────────────────────────── */
const AVATAR_BG  = ['rgba(16,185,129,0.18)','rgba(59,130,246,0.18)','rgba(245,158,11,0.18)','rgba(239,68,68,0.18)','rgba(168,85,247,0.18)'];
const AVATAR_CLR = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

function Avatar({ profile, size = 96, onClick }) {
    const idx    = (profile?.username?.charCodeAt(0) ?? 0) % AVATAR_BG.length;
    const border = TIER_COLOR[profile?.trust_tier ?? 'yeni_uye'];
    const letter = (profile?.username?.[0] ?? 'U').toUpperCase();
    return (
        <button onClick={onClick} className="shrink-0 cursor-zoom-in group relative rounded-full"
                style={{ width: size, height: size }}>
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-black"
                 style={{ border: `3px solid ${border}`, background: AVATAR_BG[idx],
                          color: AVATAR_CLR[idx], fontSize: Math.round(size * 0.38) }}>
                {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.username}
                           className="w-full h-full object-cover" referrerPolicy="no-referrer"
                           onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : letter}
            </div>
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                 style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Search className="w-5 h-5 text-white" />
            </div>
        </button>
    );
}

/* ── Takipçi/Takip Modal ──────────────────────────────────────────── */
function FollowModal({ userId, mode, onClose }) {
    const [items,   setItems]   = useState([]);
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
             style={{ background: 'rgba(0,0,0,0.80)' }}
             onClick={onClose}>
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
                        <div className="p-6 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--color-brand-primary)' }} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            henüz yok
                        </div>
                    ) : items.map(u => (
                        <button key={u.id}
                                onClick={() => { navigate(`/users/${u.id}`); onClose(); }}
                                className="flex items-center gap-3 w-full px-4 py-3 border-b transition-colors hover:bg-white/5 text-left"
                                style={BD}>
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

/* ── Zaman formatı ────────────────────────────────────────────────── */
function timeAgo(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60)     return `${Math.floor(s)}s`;
    if (s < 3600)   return `${Math.floor(s / 60)}dk`;
    if (s < 86400)  return `${Math.floor(s / 3600)}sa`;
    if (s < 604800) return `${Math.floor(s / 86400)}g`;
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/* ── Sayfalama ────────────────────────────────────────────────────── */
function Pagination({ page, totalPages, load }) {
    if (totalPages <= 1) return null;
    return (
        <div className="px-4 py-3 border-t flex items-center justify-between" style={BD}>
            <button onClick={() => load(page - 1)} disabled={page <= 1}
                    className="p-1 transition-opacity disabled:opacity-20 hover:opacity-60">
                <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {page} / {totalPages}
            </span>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages}
                    className="p-1 transition-opacity disabled:opacity-20 hover:opacity-60">
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function Profile() {
    const { userId }             = useParams();
    const { user: currentUser }  = useAuth();
    const navigate               = useNavigate();
    const isOwnProfile           = currentUser?.id === userId;

    const [profile,   setProfile]   = useState(null);
    const [xpStats,   setXpStats]   = useState(null);
    const [showcase,  setShowcase]  = useState([]);
    const [threads,   setThreads]   = useState([]);
    const [analyses,  setAnalyses]  = useState([]);
    const [threadTotal,   setThreadTotal]   = useState(0);
    const [analysisTotal, setAnalysisTotal] = useState(0);
    const [threadPage,    setThreadPage]    = useState(1);
    const [analysisPage,  setAnalysisPage]  = useState(1);
    const [loading,  setLoading]  = useState(true);
    const [tLoading, setTLoading] = useState(false);
    const [aLoading, setALoading] = useState(false);
    const [following,  setFollowing]  = useState(false);
    const [fLoading,   setFLoading]   = useState(false);
    const [activeTab,      setActiveTab]      = useState('overview');
    const [analysisFilter, setAnalysisFilter] = useState(null);
    const [followModal,    setFollowModal]    = useState(null);
    const [lightbox,       setLightbox]       = useState(false);
    const [selectedItem,   setSelectedItem]   = useState(null);
    const [error,          setError]          = useState(null);

    const SIZE = 10;

    /* Profil + XP + Showcase */
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

    /* Thread listesi */
    const loadThreads = useCallback((pg = 1) => {
        setTLoading(true);
        axiosInstance.get(`/users/${userId}/threads`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => { setThreads(data.items ?? []); setThreadTotal(data.total ?? 0); setThreadPage(pg); })
            .catch(() => {})
            .finally(() => setTLoading(false));
    }, [userId]);

    /* Analiz listesi — filter aktifken tüm sayfa yüklenir */
    const loadAnalyses = useCallback((pg = 1, bigLoad = false) => {
        setALoading(true);
        const size = bigLoad ? 50 : SIZE;
        axiosInstance.get(`/users/${userId}/analyses`, { params: { page: 1, size: bigLoad ? 50 : SIZE, ...(bigLoad ? {} : { page: pg }) } })
            .then(({ data }) => { setAnalyses(data.items ?? []); setAnalysisTotal(data.total ?? 0); setAnalysisPage(pg); })
            .catch(() => {})
            .finally(() => setALoading(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);
    useEffect(() => { loadAnalyses(1); }, [loadAnalyses]);

    /* Filter değişince tüm analizleri yükle */
    useEffect(() => {
        if (analysisFilter) loadAnalyses(1, true);
        else loadAnalyses(1, false);
    }, [analysisFilter]);

    /* Takip toggle */
    const handleFollow = async () => {
        if (!currentUser || fLoading) return;
        setFLoading(true);
        try {
            await axiosInstance.post(`/users/${userId}/follow`);
            setFollowing(v => !v);
            setProfile(prev => prev ? {
                ...prev,
                follower_count: prev.follower_count + (following ? -1 : 1),
            } : prev);
        } catch { /* sessiz */ }
        finally { setFLoading(false); }
    };

    /* Stat'a tıklayınca analizlere filtreli git */
    const goAnalyses = (filter = null) => {
        setActiveTab('analyses');
        setAnalysisFilter(filter);
    };

    if (loading) return (
        <div className="max-w-6xl mx-auto px-4 pt-10 flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
    );
    if (error || !profile) return (
        <div className="max-w-6xl mx-auto px-4 pt-10 text-center">
            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>{error ?? 'Kullanıcı bulunamadı.'}</p>
        </div>
    );

    const tierColor = TIER_COLOR[profile.trust_tier] ?? 'var(--color-text-muted)';
    const joined    = new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    const threadTotalPages   = Math.ceil(threadTotal / SIZE);
    const analysisTotalPages = Math.ceil(analysisTotal / SIZE);

    const filteredAnalyses = analysisFilter
        ? analyses.filter(a => a.prediction === analysisFilter)
        : analyses;

    const SOCIAL_ICONS = { twitter: Twitter, instagram: Instagram, github: Github, linkedin: Linkedin, website: Globe };
    const SOCIAL_LABEL = { twitter: 'X', instagram: 'Instagram', github: 'GitHub', linkedin: 'LinkedIn', website: 'Website' };

    return (
        <div className="max-w-6xl mx-auto px-4 pb-16">

            {/* ══ HERO ════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 100 }}
            >
            <div className="relative border mb-6" style={S}>
                <Corner />

                {/* Cover — gradient + köşe aksanları, grid yok */}
                <div className="h-40 w-full relative overflow-hidden"
                     style={{ backgroundColor: 'var(--color-bg-base)' }}>
                    <div className="absolute inset-0"
                         style={{ background: 'linear-gradient(to top, var(--color-terminal-surface) 0%, transparent 70%)' }} />
                    <div className="absolute top-3 left-3 w-6 h-0.5 bg-brand opacity-50" />
                    <div className="absolute top-3 left-3 h-6 w-0.5 bg-brand opacity-50" />
                    <div className="absolute top-3 right-3 w-6 h-0.5 bg-brand opacity-50" />
                    <div className="absolute top-3 right-3 h-6 w-0.5 bg-brand opacity-50" />
                </div>

                {/* Avatar + bilgiler */}
                <div className="relative z-10 px-6 md:px-10 pb-6 -mt-12 flex flex-col sm:flex-row gap-5 items-start">
                    <Avatar profile={profile} size={96} onClick={() => setLightbox(true)} />

                    <div className="flex-1 min-w-0 pt-1">
                        {/* İsim + trust + aksiyonlar */}
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                            <div>
                                <h1 className="font-manrope font-black text-3xl leading-tight"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.username}
                                </h1>
                                {profile.trust_tier && profile.trust_tier !== 'yeni_uye' && (
                                    <span className="inline-block font-mono text-xs px-2 py-0.5 border font-bold mt-1"
                                          style={{ color: tierColor, borderColor: tierColor + '55' }}>
                                        {profile.trust_label}
                                    </span>
                                )}
                            </div>

                            {/* Butonlar */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isOwnProfile ? (
                                    <Link to="/profile/settings"
                                          className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold border transition-all hover:border-brand hover:text-brand"
                                          style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
                                        <Settings className="w-3.5 h-3.5" /> Ayarlar
                                    </Link>
                                ) : currentUser && (
                                    <>
                                        <Link to={`/messages/${userId}`}
                                              className="flex items-center gap-1.5 px-4 py-2 font-mono text-xs font-bold border transition-all hover:border-brand hover:text-brand"
                                              style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
                                            <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                                        </Link>
                                        <button
                                            onClick={handleFollow}
                                            disabled={fLoading}
                                            className="flex items-center gap-1.5 px-5 py-2 font-mono text-xs font-bold transition-all disabled:opacity-50"
                                            style={following ? {
                                                border: '1px solid var(--color-terminal-border-raw)',
                                                color: 'var(--color-text-muted)',
                                                background: 'transparent',
                                            } : {
                                                background: 'var(--color-brand-primary)',
                                                border: '1px solid var(--color-brand-primary)',
                                                color: '#070f12',
                                                boxShadow: '0 0 14px rgba(16,185,129,0.30)',
                                            }}
                                            onMouseEnter={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 24px rgba(16,185,129,0.50)'; }}
                                            onMouseLeave={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 14px rgba(16,185,129,0.30)'; }}
                                        >
                                            {fLoading
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : following
                                                    ? <><UserMinus className="w-3.5 h-3.5" /> Takibi Bırak</>
                                                    : <><UserPlus className="w-3.5 h-3.5" /> Takip Et</>
                                            }
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <div className="flex gap-2.5 mb-2">
                                <div className="w-0.5 shrink-0 mt-0.5 rounded-full self-stretch"
                                     style={{ background: 'var(--color-brand-primary)', opacity: 0.4 }} />
                                <p className="text-sm leading-relaxed"
                                   style={{ color: 'var(--color-text-primary)', opacity: 0.88 }}>
                                    {profile.bio}
                                </p>
                            </div>
                        )}

                        {/* Sosyal linkler */}
                        {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                {Object.entries(profile.social_links).map(([key, url]) => {
                                    if (!url) return null;
                                    const Icon  = SOCIAL_ICONS[key] ?? Link2;
                                    const label = SOCIAL_LABEL[key] ?? key;
                                    return (
                                        <a key={key} href={url.startsWith('http') ? url : `https://${url}`}
                                           target="_blank" rel="noopener noreferrer"
                                           className="flex items-center gap-1.5 px-2.5 py-1 border font-mono text-xs font-bold transition-all hover:opacity-75"
                                           style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}>
                                            <Icon className="w-3 h-3 shrink-0" /> {label}
                                        </a>
                                    );
                                })}
                            </div>
                        )}

                        {/* Join date */}
                        <p className="flex items-center gap-1.5 font-mono text-xs"
                           style={{ color: 'var(--color-text-muted)' }}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" /> {joined} tarihinden beri üye
                        </p>
                    </div>
                </div>

                {/* Stats şeridi */}
                <div className="flex border-t flex-wrap" style={BD}>
                    {[
                        { label: 'Tartışma',     value: profile.thread_count,    color: 'var(--color-text-primary)',  onClick: null },
                        { label: 'Takipçi',      value: profile.follower_count,  color: 'var(--color-text-primary)',  onClick: () => setFollowModal('followers') },
                        { label: 'Takip',        value: profile.following_count, color: 'var(--color-text-primary)',  onClick: () => setFollowModal('following') },
                        { label: 'Analiz',       value: profile.analysis_count,  color: 'var(--color-brand-primary)', onClick: () => goAnalyses(null) },
                        { label: 'Sahte Tespit', value: profile.fake_count,      color: 'var(--color-fake-fill)',     onClick: () => goAnalyses('FAKE') },
                    ].map(({ label, value, color, onClick }) => (
                        <button key={label}
                                onClick={onClick ?? undefined}
                                disabled={!onClick}
                                className="flex flex-col items-center px-5 py-3 transition-colors disabled:cursor-default hover:enabled:bg-white/5"
                                style={{ borderRight: '1px solid var(--color-terminal-border-raw)' }}>
                            <span className="font-manrope font-black text-xl" style={{ color }}>{value ?? 0}</span>
                            <span className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
                                  style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                        </button>
                    ))}

                    {xpStats && (
                        <div className="flex flex-col items-center px-5 py-3">
                            <span className="font-manrope font-black text-xl" style={{ color: 'var(--color-text-primary)' }}>
                                Seviye <span style={{ color: 'var(--color-brand-primary)' }}>{xpStats.level}</span>
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
                                  style={{ color: 'var(--color-text-muted)' }}>{xpStats.total_xp} XP</span>
                        </div>
                    )}
                </div>

                {/* Rozet vitrini */}
                <div className="px-6 pb-5 pt-4 border-t" style={BD}>
                    <BadgeShowcase showcase={showcase} isOwnProfile={isOwnProfile} />
                </div>
            </div>
            </motion.div>

            {/* ══ İKİ SÜTUN ══════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Sol sütun */}
                <div className="flex-1 min-w-0">
                    {/* Tab çubuğu */}
                    <div className="flex border-b overflow-x-auto mb-5" style={BD}>
                        {[
                            { key: 'overview',  label: 'Genel Bakış' },
                            { key: 'threads',   label: `Tartışmalar (${threadTotal})` },
                            { key: 'analyses',  label: `Analizlerim (${analysisTotal})` },
                        ].map(tab => (
                            <button key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className="relative pb-3 px-1 mr-6 font-mono text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                                    style={{ color: activeTab === tab.key ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}>
                                {tab.label}
                                {activeTab === tab.key && (
                                    <motion.div layoutId="profile-tab-line"
                                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                                style={{ background: 'var(--color-brand-primary)' }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab içeriği */}
                    {activeTab === 'overview' && (
                        <motion.div className="flex flex-col gap-5"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22 }}>
                            <OverviewTab threads={threads} analyses={analyses} tLoading={tLoading} aLoading={aLoading}
                                         setActiveTab={setActiveTab} setSelectedItem={setSelectedItem} />
                        </motion.div>
                    )}
                    {activeTab === 'threads' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                            <ThreadsTab threads={threads} loading={tLoading} page={threadPage} totalPages={threadTotalPages} load={loadThreads} />
                        </motion.div>
                    )}
                    {activeTab === 'analyses' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                            <AnalysesTab analyses={filteredAnalyses} loading={aLoading} page={analysisPage}
                                         totalPages={analysisTotalPages} load={loadAnalyses}
                                         filter={analysisFilter} clearFilter={() => setAnalysisFilter(null)}
                                         setSelectedItem={setSelectedItem} />
                        </motion.div>
                    )}
                </div>

                {/* Sağ sütun */}
                <div className="w-full lg:w-72 shrink-0 flex flex-col gap-5">
                    <PopularThreadsWidget />
                    <RecommendedUsersWidget profileUserId={userId} currentUserId={currentUser?.id} />
                </div>
            </div>

            {/* ══ MODALS (createPortal → navbar stacking context'inin dışına çıkar) ══ */}
            {lightbox && createPortal(
                <div className="fixed inset-0 z-9999 flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
                     onClick={() => setLightbox(false)}>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <div className="overflow-hidden"
                             style={{ width: 260, height: 260, borderRadius: '50%',
                                      border: `4px solid ${tierColor}` }}>
                            {profile.avatar_url
                                ? <img src={profile.avatar_url} alt={profile.username}
                                       className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-full h-full flex items-center justify-center font-black"
                                       style={{ background: AVATAR_BG[(profile.username?.charCodeAt(0) ?? 0) % AVATAR_BG.length],
                                                color: 'var(--color-brand-primary)', fontSize: 90 }}>
                                    {profile.username?.[0]?.toUpperCase()}
                                  </div>
                            }
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

            {selectedItem && createPortal(
                <HistoryModal
                    item={selectedItem}
                    hasFullReport={!!selectedItem.task_id}
                    onClose={() => setSelectedItem(null)}
                />,
                document.body
            )}
        </div>
    );
}

/* ── Thread kartı ─────────────────────────────────────────────────── */
function ThreadCard({ thread }) {
    const catColor = CAT_COLOR[thread.category] ?? 'var(--color-accent-blue)';
    return (
        <article className="relative border transition-colors group cursor-pointer mb-3"
                 style={S}
                 onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-surface)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'var(--color-terminal-surface)'}>
            <Corner />
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={BD}>
                {thread.category && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0"
                          style={{ color: catColor, borderColor: catColor + '40', background: catColor + '0d' }}>
                        {thread.category}
                    </span>
                )}
                <span className="ml-auto font-mono text-[11px] shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}>{timeAgo(thread.created_at)}</span>
            </div>
            <div className="px-4 py-3">
                <Link to={`/forum/${thread.id}`}>
                    <h3 className="font-manrope font-bold text-base leading-snug line-clamp-2 mb-2 transition-colors group-hover:text-brand"
                        style={{ color: 'var(--color-text-primary)' }}>
                        {thread.title}
                    </h3>
                </Link>
                {thread.body && (
                    <p className="text-sm leading-relaxed line-clamp-2 mb-3"
                       style={{ color: 'var(--color-text-secondary)' }}>
                        {thread.body}
                    </p>
                )}
                <div className="flex items-center gap-1.5 font-mono text-xs"
                     style={{ color: 'var(--color-text-muted)' }}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    {thread.comment_count ?? 0} yorum
                </div>
            </div>
        </article>
    );
}

/* ── Analiz satır kartı ───────────────────────────────────────────── */
function AnalysisRow({ item, setSelectedItem, idx, total }) {
    const c = PRED_C[item.prediction] ?? 'transparent';
    return (
        <div onClick={() => setSelectedItem(item)}
             className={`flex items-center gap-3 px-4 py-3 border-l-2 cursor-pointer transition-all hover:bg-white/5 ${idx < total - 1 ? 'border-b' : ''}`}
             style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: c + '50' }}
             onMouseEnter={e => e.currentTarget.style.borderLeftColor = c}
             onMouseLeave={e => e.currentTarget.style.borderLeftColor = c + '50'}>
            <TypeBadge type={item.analysis_type} />
            <p className="flex-1 font-mono text-sm truncate min-w-0"
               style={{ color: 'var(--color-text-primary)' }}>
                {item.title ?? item.task_id ?? '—'}
            </p>
            {item.prediction && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0"
                      style={PRED_STYLE[item.prediction] ?? { color: c, borderColor: c + '40' }}>
                    {PRED_L[item.prediction] ?? item.prediction}
                </span>
            )}
            <span className="font-mono text-[11px] shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}>
                {new Date(item.created_at).toLocaleDateString('tr-TR')}
            </span>
        </div>
    );
}

/* ── Genel Bakış ──────────────────────────────────────────────────── */
function OverviewTab({ threads, analyses, tLoading, aLoading, setActiveTab, setSelectedItem }) {
    return (
        <div className="flex flex-col gap-5">
            {/* Son tartışmalar */}
            <div className="relative border overflow-hidden" style={S}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <h2 className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        Son Tartışmalar
                    </h2>
                    <button onClick={() => setActiveTab('threads')}
                            className="flex items-center gap-1 font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        tümü <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
                {tLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                    </div>
                ) : threads.length === 0 ? (
                    <p className="px-4 py-6 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>henüz tartışma yok</p>
                ) : threads.slice(0, 3).map(t => <ThreadCard key={t.id} thread={t} />)}
            </div>

            {/* Son analizler */}
            <div className="relative border overflow-hidden" style={S}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <h2 className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        Son Analizler
                    </h2>
                    <button onClick={() => setActiveTab('analyses')}
                            className="flex items-center gap-1 font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        tümü <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
                {aLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                    </div>
                ) : analyses.length === 0 ? (
                    <p className="px-4 py-6 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>henüz analiz yok</p>
                ) : analyses.slice(0, 5).map((a, i) => (
                    <AnalysisRow key={a.id ?? i} item={a} setSelectedItem={setSelectedItem} idx={i} total={Math.min(5, analyses.length)} />
                ))}
            </div>
        </div>
    );
}

/* ── Tartışmalar Tab ──────────────────────────────────────────────── */
function ThreadsTab({ threads, loading, page, totalPages, load }) {
    return (
        <div className="relative border overflow-hidden" style={S}>
            <Corner />
            <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                <h2 className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Tartışmalar</h2>
            </div>
            {loading ? (
                <div className="p-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                </div>
            ) : threads.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>henüz tartışma yok</p>
            ) : (
                <>
                    <div className="p-4 flex flex-col gap-0">
                        {threads.map(t => <ThreadCard key={t.id} thread={t} />)}
                    </div>
                    <Pagination page={page} totalPages={totalPages} load={load} />
                </>
            )}
        </div>
    );
}

/* ── Analizlerim Tab ──────────────────────────────────────────────── */
function AnalysesTab({ analyses, loading, page, totalPages, load, filter, clearFilter, setSelectedItem }) {
    return (
        <div className="relative border overflow-hidden" style={S}>
            <Corner />
            <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={BD}>
                <h2 className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Analizlerim</h2>
                {filter && (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-2 py-0.5 border"
                              style={{ color: PRED_C[filter], borderColor: PRED_C[filter] + '50' }}>
                            {PRED_L[filter]}
                        </span>
                        <button onClick={clearFilter}
                                className="font-mono text-[10px] transition-opacity hover:opacity-70"
                                style={{ color: 'var(--color-text-primary)' }}>
                            × temizle
                        </button>
                    </div>
                )}
            </div>
            {loading ? (
                <div className="p-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
                </div>
            ) : analyses.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {filter ? `${PRED_L[filter]} sonucu bulunamadı` : 'henüz analiz yok'}
                </p>
            ) : (
                <>
                    {analyses.map((a, i) => (
                        <AnalysisRow key={a.id ?? i} item={a} setSelectedItem={setSelectedItem} idx={i} total={analyses.length} />
                    ))}
                    {!filter && <Pagination page={page} totalPages={totalPages} load={load} />}
                </>
            )}
        </div>
    );
}
