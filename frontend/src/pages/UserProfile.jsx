import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BadgeShowcase from '../features/profile/BadgeShowcase';
import PopularThreadsWidget from '../features/profile/PopularThreadsWidget';
import RecommendedUsersWidget from '../features/profile/RecommendedUsersWidget';
import {
    MessageSquare, Calendar, Users, UserCheck, UserPlus, UserMinus,
    Settings, Star, Shield, Search, Cpu, Zap, Award, Lock,
    ChevronLeft, ChevronRight, X, ExternalLink, TrendingUp,
    Loader2, BookmarkCheck, Twitter, Instagram, Github, Linkedin, Globe, Link2,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/auth.service';
import AnalysisService from '../services/analysis.service';
import HistoryModal from '../features/profile/HistoryModal';
import GamificationService from '../services/gamification.service';

/* ── Tasarım ───────────────────────────────────────────────── */
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

const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

function Avatar({ user, size = 80 }) {
    const COLORS = ['rgba(16,185,129,0.20)','rgba(59,130,246,0.20)','rgba(245,158,11,0.20)','rgba(239,68,68,0.20)','rgba(168,85,247,0.20)'];
    const TEXTS  = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];
    const idx    = (user?.username?.charCodeAt(0) ?? 0) % COLORS.length;
    const border = TIER_COLOR[user?.trust_tier ?? 'yeni_uye'];
    return (
        <div className="overflow-hidden flex items-center justify-center font-black shrink-0"
             style={{ width: size, height: size, borderRadius: '50%',
                      border: `3px solid ${border}`, background: COLORS[idx],
                      color: TEXTS[idx], fontSize: size * 0.35 }}>
            {user?.avatar_url
                ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover"
                       referrerPolicy="no-referrer"
                       onError={e => { e.currentTarget.style.display = 'none'; }} />
                : (user?.username?.[0] ?? 'U').toUpperCase()
            }
        </div>
    );
}

function StatPill({ label, value, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center px-5 py-3 transition-colors ${onClick ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
            style={{ borderRight: '1px solid var(--color-terminal-border-raw)' }}
        >
            <span className="font-mono text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                {value ?? 0}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {label}
            </span>
        </button>
    );
}

/* ── Takipçi/Takip modal ─────────────────────────────────── */
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.80)' }}
             onClick={onClose}>
            <div className="relative border w-80 max-h-[70vh] flex flex-col"
                 style={S} onClick={e => e.stopPropagation()}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-mono text-xs tracking-widest uppercase"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        // {mode === 'followers' ? 'TAKİPÇİLER' : 'TAKİP EDİLENLER'}
                    </span>
                    <button onClick={onClose} className="transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="p-6 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // yükleniyor...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // henüz yok
                        </div>
                    ) : items.map(u => (
                        <button key={u.id}
                                onClick={() => { navigate(`/users/${u.id}`); onClose(); }}
                                className="flex items-center gap-3 w-full px-4 py-3 border-b transition-colors hover:bg-white/5 text-left"
                                style={BD}>
                            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                                 style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid var(--color-brand-primary)',
                                          color: 'var(--color-brand-primary)', fontWeight: 900, fontSize: 14 }}>
                                {u.avatar_url
                                    ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover"
                                           referrerPolicy="no-referrer" />
                                    : u.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-mono text-sm font-bold truncate"
                                   style={{ color: 'var(--color-text-primary)' }}>{u.username}</p>
                                <p className="font-mono text-[10px]"
                                   style={{ color: TIER_COLOR[u.trust_tier] }}>
                                    {'★'.repeat(u.trust_stars)} {u.trust_label}
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

/* ── Thead özet kartı ────────────────────────────────────── */
function ThreadMini({ thread }) {
  function timeAgo(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 3600)  return `${Math.floor(s / 60)}dk`;
    if (s < 86400) return `${Math.floor(s / 3600)}sa`;
    return `${Math.floor(s / 86400)}g`;
  }
  const STATUS_C = {
    active:       'var(--color-brand-primary)',
    under_review: 'var(--color-accent-amber)',
    resolved:     'var(--color-accent-blue)',
  };
  const catColor = CAT_COLOR[thread.category] ?? 'var(--color-brand-primary)';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b transition-colors duration-150 hover:bg-white/10"
      style={BD}
    >
      <div className="w-1 h-8 shrink-0"
           style={{ background: STATUS_C[thread.status] ?? 'var(--color-brand-primary)' }} />

      <div className="flex-1 min-w-0">
        <Link
          to={`/forum/${thread.id}`}
          className="font-mono text-sm font-bold truncate block transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {thread.title}
        </Link>
        <div className="flex items-center gap-2 font-mono text-[11px] mt-0.5"
             style={{ color: 'var(--color-text-muted)' }}>
          {thread.category && (
            <span
              className="px-1.5 py-0.5 text-[9px] font-bold border"
              style={{ color: catColor, borderColor: catColor + '40' }}
            >
              {thread.category}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <MessageSquare className="w-2.5 h-2.5" />
            {thread.comment_count}
          </span>
          <span>{thread.created_at ? timeAgo(thread.created_at) : ''}</span>
        </div>
      </div>

      <ChevronRight className="w-3.5 h-3.5 shrink-0"
                    style={{ color: 'var(--color-text-muted)' }} />
    </div>
  );
}

/* ── Ana sayfa ───────────────────────────────────────────── */
export default function UserProfile() {
    const { userId }          = useParams();
    const { user: currentUser } = useAuth();

    const isOwnProfile = currentUser?.id === userId;

    const [profile,  setProfile]  = useState(null);
    const [threads,  setThreads]  = useState([]);
    const [thTotal,  setThTotal]  = useState(0);
    const [thPage,   setThPage]   = useState(1);
    const [thLoad,   setThLoad]   = useState(false);
    const [loading,  setLoading]  = useState(true);
    const [fLoading, setFLoading] = useState(false);
    const [following, setFollowing] = useState(false);

    const [stats,    setStats]    = useState(null);
    const [history,  setHistory]  = useState([]);
    const [hPage,    setHPage]    = useState(1);
    const [hTotal,   setHTotal]   = useState(0);
    const [hLoad,    setHLoad]    = useState(false);
    const [fullReports, setFullReports] = useState(new Set());
    const [selectedItem, setSelectedItem] = useState(null);

    const [showcase, setShowcase] = useState([]);
    const [xpStats,  setXpStats]  = useState(null);

    const [activeTab, setActiveTab] = useState('overview');
    const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
    const [lightbox, setLightbox] = useState(false);

    const TH_SIZE = 10, H_SIZE = 10;

    /* Profil yükle */
    useEffect(() => {
        setLoading(true);
        axiosInstance.get(`/users/${userId}/profile`)
            .then(({ data }) => { setProfile(data); setFollowing(data.is_following ?? false); })
            .catch(() => {})
            .finally(() => setLoading(false));
        GamificationService.getUserShowcase(userId)
            .then(setShowcase)
            .catch(() => {});
        GamificationService.getUserStats(userId)
            .then(setXpStats)
            .catch(() => {});
    }, [userId]);

    /* Kendi istatistikleri */
    useEffect(() => {
        if (!isOwnProfile) return;
        axiosInstance.get('/users/me/stats').then(r => setStats(r.data)).catch(() => {});
    }, [isOwnProfile]);

    /* Thread'ler */
    const loadThreads = useCallback((pg = 1) => {
        setThLoad(true);
        axiosInstance.get(`/users/${userId}/threads`, { params: { page: pg, size: TH_SIZE } })
            .then(({ data }) => { setThreads(data.items ?? []); setThTotal(data.total ?? 0); setThPage(pg); })
            .catch(() => {})
            .finally(() => setThLoad(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);

    /* Analiz geçmişi (sadece kendi) */
    const loadHistory = useCallback((pg = 1) => {
        if (!isOwnProfile) return;
        setHLoad(true);
        AuthService.getHistory(pg, H_SIZE)
            .then(async data => {
                setHistory(data.items ?? []);
                setHTotal(data.total ?? 0);
                setHPage(pg);
                const taskIds = (data.items ?? []).map(i => i.task_id).filter(Boolean);
                const found   = new Set();
                await Promise.all(taskIds.map(async tid => {
                    try { await AnalysisService.getFullReport(tid); found.add(tid); } catch {}
                }));
                setFullReports(found);
            })
            .catch(() => {})
            .finally(() => setHLoad(false));
    }, [isOwnProfile]);

    useEffect(() => { if (activeTab === 'analyses') loadHistory(1); }, [activeTab, loadHistory]);

    /* Follow toggle */
    const handleFollow = async () => {
        if (!currentUser || fLoading) return;
        setFLoading(true);
        try {
            await axiosInstance.post(`/users/${userId}/follow`);
            setFollowing(v => !v);
            setProfile(p => p ? {
                ...p,
                follower_count: p.follower_count + (following ? -1 : 1),
            } : p);
        } catch { /* sessiz */ }
        finally { setFLoading(false); }
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-16 flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
    );
    if (!profile) return (
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-16 text-center">
            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// kullanıcı bulunamadı</p>
        </div>
    );

    const tierColor  = TIER_COLOR[profile.trust_tier] ?? 'var(--color-text-muted)';
    const stars      = profile.trust_stars ?? 0;
    const joined     = new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    const thPages    = Math.ceil(thTotal / TH_SIZE);
    const hPages     = Math.ceil(hTotal  / H_SIZE);

    const TABS = [
        { id: 'overview',  label: 'Genel Bakış' },
        { id: 'threads',   label: `Tartışmalar (${profile.thread_count})` },
        ...(isOwnProfile ? [
            { id: 'analyses',  label: 'Analizlerim' },
            { id: 'bookmarks', label: 'Kaydedilenler' },
        ] : []),
    ];

    const PRED_C = { FAKE: '#ff7351', AUTHENTIC: '#3fff8b', UNCERTAIN: '#f59e0b' };
    const PRED_L = { FAKE: 'Yanıltıcı', AUTHENTIC: 'Güvenilir', UNCERTAIN: 'Belirsiz' };

    return (
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
            {/* ── Sol / Merkez ── */}
            <div className="space-y-5 min-w-0">

            {/* ── Profil başlığı ── */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <div className="relative border overflow-hidden" style={S}>
                <Corner />
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start">

                    <button onClick={() => setLightbox(true)} className="shrink-0 cursor-zoom-in group relative">
                        <Avatar user={profile} size={96} />
                        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                             style={{ background: 'rgba(0,0,0,0.40)' }}>
                            <Search className="w-5 h-5 text-white" />
                        </div>
                    </button>

                    <div className="flex-1 min-w-0">
                        {/* İsim + Trust */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h1 className="font-manrope font-black text-3xl leading-tight"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.username}
                                </h1>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="font-mono text-xs px-2.5 py-0.5 border font-bold"
                                          style={{ color: tierColor, borderColor: tierColor + '60' }}>
                                        {profile.trust_label}
                                    </span>
                                </div>
                            </div>

                            {/* Aksiyonlar */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isOwnProfile ? (
                                    <Link to="/profile/settings"
                                          className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold border transition-opacity hover:opacity-70"
                                          style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
                                        <Settings className="w-3.5 h-3.5" /> Ayarlar
                                    </Link>
                                ) : currentUser && (
                                    <div className="flex items-center gap-2">
                                        {/* Mesaj gönder */}
                                        <Link
                                            to={`/messages/${userId}`}
                                            className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold border transition-opacity hover:opacity-70"
                                            style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                                        </Link>

                                        {/* Takip */}
                                        <button
                                            onClick={handleFollow}
                                            disabled={fLoading}
                                            className="flex items-center gap-2 px-5 py-2 font-mono text-xs font-bold transition-all duration-200 disabled:opacity-50"
                                            style={following ? {
                                                border: '1px solid var(--color-terminal-border-raw)',
                                                color: 'var(--color-text-muted)',
                                                background: 'transparent',
                                            } : {
                                                background: 'var(--color-brand-primary)',
                                                color: '#070f12',
                                                border: '1px solid var(--color-brand-primary)',
                                            }}
                                        >
                                            {fLoading
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : following
                                                    ? <><UserMinus className="w-3.5 h-3.5" /> Takibi Bırak</>
                                                    : <><UserPlus className="w-3.5 h-3.5" /> Takip Et</>
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <div className="flex gap-2.5 mt-3">
                                <div className="w-0.5 shrink-0 mt-0.5 rounded-full"
                                     style={{ background: 'var(--color-brand-primary)', opacity: 0.45 }} />
                                <p className="font-mono text-sm leading-relaxed"
                                   style={{ color: 'var(--color-text-primary)', opacity: 0.82 }}>
                                    {profile.bio}
                                </p>
                            </div>
                        )}

                        {/* Sosyal bağlantılar */}
                        {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap mt-3">
                                {Object.entries(profile.social_links).map(([key, url]) => {
                                    if (!url) return null;
                                    const ICON_MAP = { twitter: Twitter, instagram: Instagram, github: Github, linkedin: Linkedin, website: Globe };
                                    const Icon = ICON_MAP[key] ?? Link2;
                                    const LABEL_MAP = { twitter: 'X', instagram: 'Instagram', github: 'GitHub', linkedin: 'LinkedIn', website: 'Website' };
                                    const label = LABEL_MAP[key] ?? key;
                                    return (
                                        <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                                           className="flex items-center gap-1.5 px-2.5 py-1 border font-mono text-xs font-bold transition-all hover:opacity-80"
                                           style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}>
                                            <Icon className="w-3 h-3 shrink-0" />
                                            {label}
                                        </a>
                                    );
                                })}
                            </div>
                        )}

                        {/* Meta */}
                        <p className="flex items-center gap-1.5 font-mono text-xs mt-3 leading-relaxed"
                           style={{ color: 'var(--color-text-muted)' }}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" /> {joined} tarihinden beri üye
                        </p>
                    </div>
                </div>

                {/* İstatistik çubuğu */}
                <div className="flex border-t" style={BD}>
                    <StatPill label="Tartışma" value={profile.thread_count} />
                    <StatPill label="Takipçi"  value={profile.follower_count}  onClick={() => setFollowModal('followers')} />
                    <StatPill label="Takip"    value={profile.following_count} onClick={() => setFollowModal('following')} />
                    {isOwnProfile && stats && (
                        <>
                            <StatPill label="Analiz"  value={stats.total_analyzed} />
                            <StatPill label="Sahte Tespit" value={stats.total_fake} />
                        </>
                    )}
                </div>

                {/* Seviye / XP / Hijyen stat grid */}
                {xpStats && (
                  <div className="grid border-t"
                       style={{
                         gridTemplateColumns: (isOwnProfile && stats?.hygiene_score != null) ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
                         borderColor: 'var(--color-terminal-border-raw)',
                       }}>
                    <div className="p-4 text-center">
                      <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5"
                         style={{ color: 'var(--color-text-muted)' }}>SEVİYE</p>
                      <p className="font-mono text-3xl font-black leading-none"
                         style={{ color: 'var(--color-brand-primary)' }}>
                        {xpStats.level}
                      </p>
                      {xpStats.xp_to_next_level > 0 && (
                        <p className="font-mono text-[9px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                          {xpStats.xp_to_next_level} XP kaldı
                        </p>
                      )}
                    </div>
                    <div className="p-4 text-center border-l" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                      <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5"
                         style={{ color: 'var(--color-text-muted)' }}>TOPLAM XP</p>
                      <p className="font-mono text-3xl font-black leading-none"
                         style={{ color: 'var(--color-text-primary)' }}>
                        {xpStats.total_xp.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    {isOwnProfile && stats?.hygiene_score != null && (
                      <div className="p-4 text-center border-l" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5"
                           style={{ color: 'var(--color-text-muted)' }}>HİJYEN</p>
                        <p className="font-mono text-3xl font-black leading-none"
                           style={{ color: stats.hygiene_score >= 70 ? 'var(--color-brand-primary)' : stats.hygiene_score >= 40 ? 'var(--color-accent-amber)' : '#ff7351' }}>
                          {Math.round(stats.hygiene_score)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rozet Vitrini */}
                <div className="px-5 pb-4">
                  <BadgeShowcase showcase={showcase} isOwnProfile={isOwnProfile} />
                </div>
              </div>
            </motion.div>

            {/* ── Sekmeler ── */}
            <div className="flex border-b" style={BD}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                  style={{
                    color: activeTab === tab.id
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'var(--color-brand-primary)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* ── Genel Bakış ── */}
            {activeTab === 'overview' && (
              <motion.div
                className="space-y-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.12 }}
              >

                    {/* Kendi: haftalık özet */}
                    {isOwnProfile && stats && (
                        <div className="relative border overflow-hidden" style={S}>
                            <Corner />
                            <div className="px-4 py-3 border-b" style={BD}>
                                <span className="font-mono text-xs tracking-widest uppercase"
                                      style={{ color: 'var(--color-brand-primary)' }}>// BU HAFTA</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x p-0" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                                {[
                                    { label: 'İncelendi', value: stats.week_analyzed, color: 'var(--color-brand-primary)' },
                                    { label: 'Sahte',     value: stats.week_fake,     color: '#ff7351' },
                                ].map(({ label, value, color, suffix }) => (
                                    <div key={label} className="p-4 text-center">
                                        <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                                           style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                                        <p className="font-mono text-2xl font-black" style={{ color }}>
                                            {value ?? 0}{suffix ?? ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* Son tartışmalar */}
                    {threads.length > 0 && (
                        <div className="relative border overflow-hidden" style={S}>
                            <Corner />
                            <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                                <span className="font-mono text-xs tracking-widest uppercase"
                                      style={{ color: 'var(--color-brand-primary)' }}>// SON TARTIŞMALAR</span>
                                <button onClick={() => setActiveTab('threads')}
                                        className="font-mono text-[10px] transition-opacity hover:opacity-70 flex items-center gap-1"
                                        style={{ color: 'var(--color-brand-primary)' }}>
                                    tümü <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                            {threads.slice(0, 5).map(t => <ThreadMini key={t.id} thread={t} />)}
                        </div>
                    )}
              </motion.div>
            )}

            {/* ── Tartışmalar ── */}
            {activeTab === 'threads' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.12 }}
              >
                <div className="relative border overflow-hidden" style={S}>
                    <Corner />
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                        <span className="font-mono text-xs tracking-widest uppercase"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            // TARTIŞMALAR
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {thTotal} kayıt
                        </span>
                    </div>
                    {thLoad ? (
                        <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // yükleniyor...
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // tartışma yok
                        </div>
                    ) : (
                        <>
                            {threads.map(t => <ThreadMini key={t.id} thread={t} />)}
                            {thPages > 1 && (
                                <div className="px-4 py-3 border-t flex items-center justify-between" style={BD}>
                                    <button onClick={() => loadThreads(thPage - 1)} disabled={thPage <= 1}
                                            className="p-1 transition-opacity disabled:opacity-20 hover:opacity-60">
                                        <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                    </button>
                                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                        {thPage} / {thPages}
                                    </span>
                                    <button onClick={() => loadThreads(thPage + 1)} disabled={thPage >= thPages}
                                            className="p-1 transition-opacity disabled:opacity-20 hover:opacity-60">
                                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
              </motion.div>
            )}

            {/* ── Analizlerim (sadece kendi) ── */}
            {activeTab === 'analyses' && isOwnProfile && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.12 }}
              >
                <div className="relative border overflow-hidden" style={S}>
                    <Corner />
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                        <span className="font-mono text-xs tracking-widest uppercase"
                              style={{ color: 'var(--color-brand-primary)' }}>// ANALİZ GEÇMİŞİ</span>
                        {hTotal > 0 && <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{hTotal} kayıt</span>}
                    </div>
                    {hLoad ? (
                        <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // yükleniyor...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // analiz yok
                        </div>
                    ) : (
                        <>
                            {history.map((item, idx) => {
                                const c = PRED_C[item.prediction] ?? 'transparent';
                                return (
                                    <div key={item.id}
                                         onClick={() => setSelectedItem(item)}
                                         className={`flex items-center gap-3 px-4 py-3 border-l-2 cursor-pointer transition-colors hover:bg-white/3 ${idx < history.length - 1 ? 'border-b' : ''}`}
                                         style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: c + '60' }}
                                         onMouseEnter={e => e.currentTarget.style.borderLeftColor = c}
                                         onMouseLeave={e => e.currentTarget.style.borderLeftColor = c + '60'}>
                                        <span className="inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 border shrink-0"
                                              style={{ color: item.analysis_type === 'url' ? '#60a5fa' : '#a78bfa',
                                                       borderColor: item.analysis_type === 'url' ? 'rgba(96,165,250,0.3)' : 'rgba(167,139,250,0.3)' }}>
                                            {item.analysis_type?.toUpperCase() ?? 'METİN'}
                                        </span>
                                        <p className="flex-1 font-mono text-sm truncate min-w-0"
                                           style={{ color: 'var(--color-text-primary)' }}>
                                            {item.title ?? item.task_id ?? '—'}
                                        </p>
                                        {item.prediction && (
                                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0"
                                                  style={{ color: c, borderColor: c + '40' }}>
                                                {PRED_L[item.prediction] ?? item.prediction}
                                            </span>
                                        )}
                                        <p className="font-mono text-[11px] shrink-0"
                                           style={{ color: 'var(--color-text-muted)' }}>
                                            {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                );
                            })}
                            {hPages > 1 && (
                                <div className="px-4 py-3 border-t flex items-center justify-between" style={BD}>
                                    <button onClick={() => loadHistory(hPage - 1)} disabled={hPage <= 1}
                                            className="p-1 transition-opacity disabled:opacity-20 hover:opacity-60">
                                        <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                    </button>
                                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                        {hPage} / {hPages}
                                    </span>
                                    <button onClick={() => loadHistory(hPage + 1)} disabled={hPage >= hPages}
                                            className="p-1 transition-opacity disabled:opacity-20 hover:opacity-60">
                                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
              </motion.div>
            )}

            {/* ── Kaydedilenler (sadece kendi) ── */}
            {activeTab === 'bookmarks' && isOwnProfile && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.12 }}
              >
                <BookmarksTab />
              </motion.div>
            )}

            </div>{/* /Sol-Merkez */}

            {/* ── Sağ Sidebar ── */}
            <div className="space-y-5 order-last lg:order-none lg:sticky lg:top-24">
              <PopularThreadsWidget />
              <RecommendedUsersWidget
                profileUserId={userId}
                currentUserId={currentUser?.id}
              />
            </div>

          </div>{/* /grid */}

          {/* Modals — createPortal ile body'e render edilir, navbar stacking context'inden kaçar */}
          {lightbox && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center"
                 style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                 onClick={() => setLightbox(false)}>
              <div className="relative" onClick={e => e.stopPropagation()}>
                <div className="overflow-hidden"
                     style={{ width: 260, height: 260, borderRadius: '50%',
                              border: `4px solid ${TIER_COLOR[profile.trust_tier] ?? 'var(--color-brand-primary)'}` }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.username}
                           className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center font-black"
                           style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-brand-primary)', fontSize: 90 }}>
                        {profile.username?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                  }
                </div>
                <button onClick={() => setLightbox(false)}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center border"
                        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-terminal-border-raw)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <p className="font-mono text-sm font-bold text-center mt-4"
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
              hasFullReport={fullReports.has(selectedItem.task_id)}
              onClose={() => setSelectedItem(null)}
            />,
            document.body
          )}
        </div>
    );
}

/* ── Kaydedilenler sekmesi ── */
function BookmarksTab() {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/forum/bookmarks/me', { params: { page: 1, size: 10 } })
            .then(({ data }) => setThreads(data.items ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const S2  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
    const BD2 = { borderColor: 'var(--color-terminal-border-raw)' };

    return (
        <div className="relative border overflow-hidden" style={S2}>
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
            <div className="px-4 py-3 border-b" style={BD2}>
                <span className="font-mono text-xs tracking-widest uppercase"
                      style={{ color: 'var(--color-brand-primary)' }}>// KAYDEDİLENLER</span>
            </div>
            {loading ? (
                <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</div>
            ) : threads.length === 0 ? (
                <div className="p-8 text-center">
                    <BookmarkCheck className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// henüz kayıt yok</p>
                </div>
            ) : threads.map(t => <ThreadMini key={t.id} thread={t} />)}
            {threads.length > 0 && (
                <div className="px-4 py-2 border-t" style={BD2}>
                    <Link to="/profile/bookmarks"
                          className="font-mono text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        Tümünü gör →
                    </Link>
                </div>
            )}
        </div>
    );
}
