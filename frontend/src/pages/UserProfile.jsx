import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    MessageSquare, Calendar, Users, UserCheck, UserPlus, UserMinus,
    Settings, Star, Shield, Search, Cpu, Zap, Award, Lock,
    ChevronLeft, ChevronRight, X, ExternalLink, TrendingUp,
    Loader2, BookmarkCheck,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/auth.service';
import AnalysisService from '../services/analysis.service';
import HistoryModal from '../features/profile/HistoryModal';

/* ── Tasarım ───────────────────────────────────────────────── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
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
            <span className="font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
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

    return (
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
                                    ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
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
        </div>
    );
}

/* ── Rozet tanımları ─────────────────────────────────────── */
function getBadges(profile, stats, isOwn) {
    const badges = [];
    badges.push({ icon: UserCheck, label: 'Kayıtlı Üye', color: 'var(--color-brand-primary)', locked: false });
    if (profile.thread_count >= 1)
        badges.push({ icon: MessageSquare, label: 'Tartışmacı', color: 'var(--color-accent-blue)', locked: false });
    if (profile.thread_count >= 10)
        badges.push({ icon: Zap, label: 'Aktif Tartışmacı', color: 'var(--color-accent-amber)', locked: false });
    if (profile.follower_count >= 10)
        badges.push({ icon: Users, label: 'Takip Edilen', color: '#a855f7', locked: false });
    if (profile.trust_tier !== 'yeni_uye')
        badges.push({ icon: Shield, label: 'Doğrulayıcı', color: 'var(--color-accent-blue)', locked: false });
    if (['analist', 'dedektif'].includes(profile.trust_tier))
        badges.push({ icon: Search, label: 'Kaynak Analist', color: 'var(--color-accent-amber)', locked: false });
    if (profile.trust_tier === 'dedektif')
        badges.push({ icon: Award, label: 'Forum Dedektifi', color: 'var(--color-brand-primary)', locked: false });
    if (isOwn && stats && stats.total_analyzed >= 1)
        badges.push({ icon: Cpu, label: 'BERT Kullanıcısı', color: 'var(--color-brand-primary)', locked: false });
    if (isOwn && stats && stats.total_analyzed >= 50)
        badges.push({ icon: TrendingUp, label: 'Analiz Uzmanı', color: '#ef4444', locked: false });
    // Kilitli
    if (profile.trust_tier === 'yeni_uye')
        badges.push({ icon: Lock, label: 'Doğrulayıcı', color: 'var(--color-text-muted)', locked: true });
    if (!['analist', 'dedektif'].includes(profile.trust_tier))
        badges.push({ icon: Lock, label: 'Sinyal Uzmanı', color: 'var(--color-text-muted)', locked: true });
    return badges;
}

/* ── Thead özet kartı ────────────────────────────────────── */
function ThreadMini({ thread }) {
    function timeAgo(d) {
        const s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 3600)  return `${Math.floor(s/60)}dk`;
        if (s < 86400) return `${Math.floor(s/3600)}sa`;
        return `${Math.floor(s/86400)}g`;
    }
    const STATUS_C = { active:'var(--color-brand-primary)', under_review:'var(--color-accent-amber)', resolved:'var(--color-accent-blue)' };
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b transition-colors hover:bg-white/3"
             style={BD}>
            <div className="w-1 h-8 shrink-0"
                 style={{ background: STATUS_C[thread.status] ?? 'var(--color-brand-primary)' }} />
            <div className="flex-1 min-w-0">
                <Link to={`/forum/${thread.id}`}
                      className="font-mono text-sm font-bold truncate block transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-text-primary)' }}>
                    {thread.title}
                </Link>
                <div className="flex items-center gap-2 font-mono text-[10px]"
                     style={{ color: 'var(--color-text-muted)' }}>
                    {thread.category && <span style={{ color: 'var(--color-accent-blue)' }}>{thread.category}</span>}
                    <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{thread.comment_count}</span>
                    <span>{timeAgo(thread.created_at)}</span>
                </div>
            </div>
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

    const [activeTab, setActiveTab] = useState('overview');
    const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null

    const TH_SIZE = 10, H_SIZE = 10;

    /* Profil yükle */
    useEffect(() => {
        setLoading(true);
        axiosInstance.get(`/users/${userId}/profile`)
            .then(({ data }) => { setProfile(data); setFollowing(data.is_following ?? false); })
            .catch(() => {})
            .finally(() => setLoading(false));
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

    const badges     = getBadges(profile, stats, isOwnProfile);
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
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-16 space-y-5">

            {/* ── Profil başlığı ── */}
            <div className="relative border overflow-hidden" style={S}>
                <Corner />
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start">

                    <Avatar user={profile} size={88} />

                    <div className="flex-1 min-w-0">
                        {/* İsim + Trust */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h1 className="font-manrope font-black text-3xl leading-tight"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.username}
                                </h1>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="font-mono text-sm font-bold" style={{ color: tierColor }}>
                                        {'★'.repeat(stars)}{'☆'.repeat(Math.max(0, 5 - stars))}
                                    </span>
                                    <span className="font-mono text-xs px-2 py-0.5 border"
                                          style={{ color: tierColor, borderColor: tierColor + '50' }}>
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
                            <p className="font-mono text-sm mt-3 leading-relaxed"
                               style={{ color: 'var(--color-text-primary)', opacity: 0.75 }}>
                                {profile.bio}
                            </p>
                        )}

                        {/* Meta */}
                        <p className="flex items-center gap-1.5 font-mono text-xs mt-3"
                           style={{ color: 'var(--color-text-muted)' }}>
                            <Calendar className="w-3.5 h-3.5" /> {joined} tarihinden beri üye
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
            </div>

            {/* ── Sekmeler ── */}
            <div className="flex border-b" style={BD}>
                {TABS.map(tab => (
                    <button key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px"
                            style={{
                                borderColor: activeTab === tab.id ? 'var(--color-brand-primary)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                            }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Genel Bakış ── */}
            {activeTab === 'overview' && (
                <div className="space-y-5">

                    {/* Rozetler */}
                    <div className="relative border overflow-hidden" style={S}>
                        <Corner />
                        <div className="px-4 py-3 border-b" style={BD}>
                            <span className="font-mono text-xs tracking-widest uppercase"
                                  style={{ color: 'var(--color-brand-primary)' }}>// ROZETLER</span>
                        </div>
                        <div className="p-4 flex flex-wrap gap-2">
                            {badges.map(({ icon: Icon, label, color, locked }) => (
                                <div key={label}
                                     className="flex items-center gap-2 px-3 py-2 border font-mono text-xs"
                                     style={{
                                         borderColor: locked ? 'var(--color-terminal-border-raw)' : color,
                                         color: locked ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                         opacity: locked ? 0.35 : 1,
                                         background: locked ? 'transparent' : `${color}12`,
                                     }}>
                                    {locked
                                        ? <Lock className="w-3.5 h-3.5 shrink-0" />
                                        : <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                    }
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Kendi: haftalık özet */}
                    {isOwnProfile && stats && (
                        <div className="relative border overflow-hidden" style={S}>
                            <Corner />
                            <div className="px-4 py-3 border-b" style={BD}>
                                <span className="font-mono text-xs tracking-widest uppercase"
                                      style={{ color: 'var(--color-brand-primary)' }}>// BU HAFTA</span>
                            </div>
                            <div className="grid grid-cols-3 divide-x p-0" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                                {[
                                    { label: 'İncelendi', value: stats.week_analyzed, color: 'var(--color-brand-primary)' },
                                    { label: 'Sahte',     value: stats.week_fake,     color: '#ff7351' },
                                    { label: 'Hijyen',    value: stats.hygiene_score, color: '#f59e0b', suffix: '/100' },
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
                </div>
            )}

            {/* ── Tartışmalar ── */}
            {activeTab === 'threads' && (
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
            )}

            {/* ── Analizlerim (sadece kendi) ── */}
            {activeTab === 'analyses' && isOwnProfile && (
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
            )}

            {/* ── Kaydedilenler (sadece kendi) ── */}
            {activeTab === 'bookmarks' && isOwnProfile && (
                <BookmarksTab />
            )}

            {/* Modals */}
            {followModal && (
                <FollowModal userId={userId} mode={followModal} onClose={() => setFollowModal(null)} />
            )}
            {selectedItem && (
                <HistoryModal
                    item={selectedItem}
                    hasFullReport={fullReports.has(selectedItem.task_id)}
                    onClose={() => setSelectedItem(null)}
                />
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
