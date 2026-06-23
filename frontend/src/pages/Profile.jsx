import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Calendar, MessageSquare, Settings, UserPlus, UserMinus,
    X, Loader2, Search, ChevronRight,
    Twitter, Instagram, Github, Linkedin, Globe, Link2,
    BarChart2, MessagesSquare, ShieldAlert, ArrowRight, TrendingUp,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import GamificationService from '../services/gamification.service';
import AnalysisService from '../services/analysis.service';
import BadgeShowcase from '../features/profile/BadgeShowcase';
import HistoryModal from '../features/profile/HistoryModal';
import { TypeBadge } from '../components/common/AnalysisBadges';
import RecommendedUsersWidget from '../features/profile/RecommendedUsersWidget';
import PopularThreadsWidget from '../features/profile/PopularThreadsWidget';

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
const FILTER_COLOR = {
    FAKE:      'var(--color-fake-fill)',
    AUTHENTIC: 'var(--color-brand-primary)',
    UNCERTAIN: 'var(--color-accent-amber)',
};

const PAL_BG   = ['rgba(16,185,129,0.18)','rgba(59,130,246,0.18)','rgba(245,158,11,0.18)','rgba(239,68,68,0.18)','rgba(168,85,247,0.18)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

/* ── Köşe çentikleri (keskin) ── */
function Corner() {
    return (
        <>
            <div className="absolute top-0 left-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
        </>
    );
}

/* ── Sade panel başlığı ── */
function Panel({ title, more, children }) {
    return (
        <div className="relative border" style={{ ...S, borderLeft: '3px solid rgba(63,255,139,0.55)' }}>
            <Corner />
            <div className="flex items-center px-4 py-3 border-b" style={BD}>
                <span className="font-mono text-[11px] font-bold tracking-widest uppercase"
                      style={{ color: 'var(--color-brand-primary)' }}>
                    {title}
                </span>
                {more && (
                    <button onClick={more.onClick}
                            className="ml-auto flex items-center gap-1 font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        {more.label} <ArrowRight className="w-3 h-3" />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

/* ── Keskin kare avatar ── */
function UserAvatar({ username, avatarUrl, tierColor, size = 96, onClick }) {
    const idx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
    return (
        <button onClick={onClick} className="shrink-0 cursor-zoom-in group relative"
                style={{ width: size, height: size }}>
            <div className="w-full h-full overflow-hidden flex items-center justify-center font-mono font-black"
                 style={{ background: PAL_BG[idx], color: PAL_TEXT[idx], border: `2px solid ${tierColor}`, fontSize: size * 0.36 }}>
                {avatarUrl
                    ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
                           referrerPolicy="no-referrer"
                           onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : (username ?? '?')[0].toUpperCase()}
            </div>
            <div className="absolute bottom-[-1px] right-[-1px] w-2.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-[-1px] right-[-1px] h-2.5 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                 style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Search className="w-5 h-5 text-white" />
            </div>
        </button>
    );
}

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.80)' }} onClick={onClose}>
            <div className="relative border w-80 max-h-[70vh] flex flex-col"
                 style={S} onClick={e => e.stopPropagation()}>
                <Corner />
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
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
                                className="flex items-center gap-3 w-full px-4 py-3 border-b transition-colors hover:bg-white/[0.04] text-left"
                                style={BD}>
                            <div className="w-9 h-9 overflow-hidden flex items-center justify-center shrink-0 font-black text-sm"
                                 style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                                {u.avatar_url
                                    ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    : u.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-manrope font-bold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{u.username}</p>
                                <p className="font-mono text-[10px]" style={{ color: TIER_COLOR[u.trust_tier] ?? 'var(--color-text-muted)' }}>
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
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t" style={BD}>
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

/* ── Kompakt tartışma satırı ── */
function ThreadRow({ thread }) {
    const catColor = CAT_COLOR[thread.category] ?? 'var(--color-accent-blue)';
    const STATUS_C = { active: 'var(--color-brand-primary)', under_review: 'var(--color-accent-amber)', resolved: 'var(--color-accent-blue)' };
    return (
        <Link to={`/forum/${thread.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b transition-colors hover:bg-white/[0.03]"
              style={{ ...BD, textDecoration: 'none' }}>
            <div className="w-[3px] h-9 shrink-0" style={{ background: STATUS_C[thread.status] ?? 'var(--color-brand-primary)' }} />
            <div className="flex-1 min-w-0">
                <p className="font-manrope font-semibold text-sm leading-snug line-clamp-1"
                   style={{ color: 'var(--color-text-primary)' }}>
                    {thread.title}
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {thread.category && (
                        <span className="px-1.5 py-0.5 font-bold border"
                              style={{ color: catColor, borderColor: catColor + '40' }}>
                            {thread.category}
                        </span>
                    )}
                    <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> {thread.comment_count ?? 0}</span>
                    <span>{thread.created_at ? timeAgo(thread.created_at) : ''}</span>
                </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        </Link>
    );
}

/* ── Kompakt analiz satırı ── */
function AnalysisRow({ item, setSelectedItem }) {
    const accent = PRED_ACCENT[item.prediction] ?? 'var(--color-terminal-border-raw)';
    return (
        <div onClick={() => setSelectedItem(item)}
             className="flex items-center gap-3 px-4 py-3 border-b border-l-2 cursor-pointer transition-colors hover:bg-white/[0.03]"
             style={{ ...BD, borderLeftColor: accent + '70' }}
             onMouseEnter={e => { e.currentTarget.style.borderLeftColor = accent; }}
             onMouseLeave={e => { e.currentTarget.style.borderLeftColor = accent + '70'; }}>
            <TypeBadge type={item.analysis_type} />
            <p className="flex-1 min-w-0 font-mono text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {item.title ?? item.task_id ?? '—'}
            </p>
            {item.prediction && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0"
                      style={{ color: accent, borderColor: accent + '40' }}>
                    {PRED_L[item.prediction] ?? item.prediction}
                </span>
            )}
            <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(item.created_at).toLocaleDateString('tr-TR')}
            </span>
        </div>
    );
}

function EmptyRow({ icon, label }) {
    const Icon = icon;
    return (
        <div className="px-4 py-10 text-center">
            <Icon className="w-7 h-7 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        </div>
    );
}

function OverviewTab({ meStats, threads, analyses, tLoading, aLoading, setActiveTab, setSelectedItem }) {
    return (
        <div className="flex flex-col gap-5">
            {meStats && (
                <Panel title="Bu Hafta">
                    <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        <div className="p-4 text-center">
                            <p className="font-mono text-2xl font-black" style={{ color: 'var(--color-brand-primary)' }}>{meStats.week_analyzed ?? 0}</p>
                            <p className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: 'var(--color-text-muted)' }}>İncelendi</p>
                        </div>
                        <div className="p-4 text-center" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                            <p className="font-mono text-2xl font-black" style={{ color: 'var(--color-fake-fill)' }}>{meStats.week_fake ?? 0}</p>
                            <p className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: 'var(--color-text-muted)' }}>Sahte</p>
                        </div>
                    </div>
                </Panel>
            )}

            <Panel title="Son Tartışmalar" more={{ label: 'tümü', onClick: () => setActiveTab('threads') }}>
                {tLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} /></div>
                ) : threads.length === 0 ? (
                    <EmptyRow icon={MessagesSquare} label="Henüz tartışma yok" />
                ) : threads.slice(0, 5).map(t => <ThreadRow key={t.id} thread={t} />)}
            </Panel>

            <Panel title="Son Analizler" more={{ label: 'tümü', onClick: () => setActiveTab('analyses') }}>
                {aLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} /></div>
                ) : analyses.length === 0 ? (
                    <EmptyRow icon={BarChart2} label="Henüz analiz yok" />
                ) : analyses.slice(0, 5).map((a, i) => <AnalysisRow key={a.id ?? i} item={a} setSelectedItem={setSelectedItem} />)}
            </Panel>
        </div>
    );
}

function ThreadsTab({ threads, loading, page, totalPages, load }) {
    return (
        <Panel title="Tüm Tartışmalar">
            {loading ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} /></div>
            ) : threads.length === 0 ? (
                <EmptyRow icon={MessageSquare} label="Henüz tartışma yok" />
            ) : (
                <>
                    {threads.map(t => <ThreadRow key={t.id} thread={t} />)}
                    <Pagination page={page} totalPages={totalPages} load={load} />
                </>
            )}
        </Panel>
    );
}

function AnalysesTab({ analyses, loading, page, totalPages, load, filter, clearFilter, setSelectedItem }) {
    return (
        <div className="flex flex-col gap-3">
            {filter && (
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] px-2 py-1 border"
                          style={{ color: FILTER_COLOR[filter], borderColor: FILTER_COLOR[filter] + '50' }}>
                        {PRED_L[filter]} filtresi aktif
                    </span>
                    <button onClick={clearFilter} className="font-mono text-[10px] transition-opacity hover:opacity-60"
                            style={{ color: 'var(--color-text-muted)' }}>
                        × temizle
                    </button>
                </div>
            )}
            <Panel title="Analiz Geçmişi">
                {loading ? (
                    <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand-primary)' }} /></div>
                ) : analyses.length === 0 ? (
                    <EmptyRow icon={ShieldAlert} label={filter ? `${PRED_L[filter]} sonucu bulunamadı` : 'Henüz analiz yok'} />
                ) : (
                    <>
                        {analyses.map((a, i) => <AnalysisRow key={a.id ?? i} item={a} setSelectedItem={setSelectedItem} />)}
                        {!filter && <Pagination page={page} totalPages={totalPages} load={load} />}
                    </>
                )}
            </Panel>
        </div>
    );
}

export default function Profile() {
    const { userId }  = useParams();
    const { user }    = useAuth();

    const [profile,   setProfile]   = useState(null);
    const [xpStats,   setXpStats]   = useState(null);
    const [meStats,   setMeStats]   = useState(null);
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
    const [fullReports,    setFullReports]    = useState(new Set());
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

    useEffect(() => {
        if (!isOwnProfile) { setMeStats(null); return; }
        axiosInstance.get('/users/me/stats').then(r => setMeStats(r.data)).catch(() => {});
    }, [isOwnProfile]);

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
            .then(async ({ data }) => {
                const items = data.items ?? [];
                setAnalyses(items);
                setAnalysisTotal(data.total ?? 0);
                setAnalysisPage(pg);
                const taskIds = items.map(i => i.task_id).filter(Boolean);
                const found = new Set();
                await Promise.all(taskIds.map(async tid => {
                    try { await AnalysisService.getFullReport(tid); found.add(tid); } catch { /* ignore */ }
                }));
                setFullReports(found);
            })
            .catch(() => {})
            .finally(() => setALoading(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);
    useEffect(() => { loadAnalyses(1); }, [loadAnalyses]);

    useEffect(() => {
        if (analysisFilter) loadAnalyses(1, true);
        else loadAnalyses(1, false);
    }, [analysisFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFollow = async () => {
        if (!user || fLoading) return;
        setFLoading(true);
        try {
            await axiosInstance.post(`/users/${userId}/follow`);
            setFollowing(v => !v);
            setProfile(prev => prev ? { ...prev, follower_count: prev.follower_count + (following ? -1 : 1) } : prev);
        } catch { /* ignore */ }
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
    const stars     = profile.trust_stars ?? 0;

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

    const xpPct = xpStats ? Math.max(0, Math.min(100, xpStats.xp_progress_pct ?? 0)) : 0;

    const STAT_ITEMS = [
        { label: 'Tartışma',     value: profile.thread_count,    color: 'var(--color-text-primary)' },
        { label: 'Takipçi',      value: profile.follower_count,  color: 'var(--color-text-primary)',  onClick: () => setFollowModal('followers') },
        { label: 'Takip',        value: profile.following_count, color: 'var(--color-text-primary)',  onClick: () => setFollowModal('following') },
        { label: 'Analiz',       value: profile.analysis_count,  color: 'var(--color-brand-primary)', onClick: () => { setActiveTab('analyses'); setAnalysisFilter(null); } },
        { label: 'Sahte Tespit', value: profile.fake_count,      color: 'var(--color-fake-fill)',     onClick: () => { setActiveTab('analyses'); setAnalysisFilter('FAKE'); } },
        ...(isOwnProfile && meStats?.hygiene_score != null
            ? [{ label: 'Hijyen', value: Math.round(meStats.hygiene_score),
                 color: meStats.hygiene_score >= 70 ? 'var(--color-brand-primary)' : meStats.hygiene_score >= 40 ? 'var(--color-accent-amber)' : 'var(--color-fake-fill)' }]
            : []),
    ];

    const TABS = [
        { key: 'overview',  label: 'Genel Bakış' },
        { key: 'threads',   label: `Tartışmalar (${threadTotal})` },
        { key: 'analyses',  label: `Analizlerim (${analysisTotal})` },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 pb-16">

            {/* ══ HEADER ══ */}
            <div className="animate-fade-up">
                <div className="relative border" style={S}>
                    <Corner />

                    {/* Üst: avatar + kimlik + aksiyon */}
                    <div className="flex flex-col sm:flex-row gap-5 p-6">
                        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url}
                                    tierColor={tierColor} size={96} onClick={() => setLightbox(true)} />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <h1 className="font-manrope font-black text-3xl leading-tight"
                                        style={{ color: 'var(--color-text-primary)' }}>
                                        {profile.username}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {profile.trust_label && (
                                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider"
                                                  style={{ color: tierColor, borderColor: tierColor + '55', background: tierColor + '14' }}>
                                                {profile.trust_label}
                                            </span>
                                        )}
                                        {stars > 0 && (
                                            <span className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--color-brand-primary)' }}>
                                                {'★'.repeat(Math.min(stars, 5))}{'☆'.repeat(Math.max(0, 5 - stars))}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Aksiyon butonları */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {isOwnProfile ? (
                                        <Link to="/profile/settings"
                                              className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold transition-opacity hover:opacity-90"
                                              style={{ background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)' }}>
                                            <Settings className="w-3.5 h-3.5" /> Ayarlar
                                        </Link>
                                    ) : user && (
                                        <>
                                            <Link to={`/messages/${userId}`}
                                                  className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold border transition-opacity hover:opacity-70"
                                                  style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
                                                <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                                            </Link>
                                            <button onClick={handleFollow} disabled={fLoading}
                                                    className="flex items-center gap-2 px-5 py-2 font-mono text-xs font-bold transition-all disabled:opacity-50"
                                                    style={following ? {
                                                        border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-text-muted)', background: 'transparent',
                                                    } : {
                                                        background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)', border: '1px solid var(--color-brand-primary)',
                                                    }}>
                                                {fLoading
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : following
                                                        ? <><UserMinus className="w-3.5 h-3.5" /> Takipte</>
                                                        : <><UserPlus className="w-3.5 h-3.5" /> Takip Et</>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {profile.bio && (
                                <p className="font-mono text-sm leading-relaxed mt-3 pl-3 border-l-2"
                                   style={{ color: 'var(--color-text-secondary)', borderColor: 'rgba(16,185,129,0.4)' }}>
                                    {profile.bio}
                                </p>
                            )}

                            <div className="flex items-center gap-3 flex-wrap mt-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {joinedDate && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> {joinedDate} tarihinden beri üye
                                    </span>
                                )}
                                {socialEntries.map(([key, url]) => {
                                    const Icon  = SOCIAL_ICONS[key] ?? Link2;
                                    const label = SOCIAL_LABEL[key] ?? key;
                                    return (
                                        <a key={key} href={url.startsWith('http') ? url : `https://${url}`}
                                           target="_blank" rel="noopener noreferrer"
                                           className="flex items-center gap-1.5 px-2 py-0.5 border transition-opacity hover:opacity-70"
                                           style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-brand-primary)' }}>
                                            <Icon className="w-3 h-3" /> {label}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Stat şeridi */}
                    <div className="flex border-t" style={BD}>
                        {STAT_ITEMS.map(({ label, value, color, onClick }) => (
                            <button key={label} onClick={onClick ?? undefined}
                                    className={`flex-1 flex flex-col items-center py-3.5 px-2 transition-colors ${onClick ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default'}`}
                                    style={{ borderRight: '1px solid var(--color-terminal-border-raw)' }}>
                                <span className="font-mono text-xl font-black" style={{ color }}>{value ?? 0}</span>
                                <span className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Seviye / XP barı */}
                    {xpStats && (
                        <div className="flex items-center gap-4 px-6 py-4 border-t" style={{ ...BD, background: 'rgba(16,185,129,0.03)' }}>
                            <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center"
                                 style={{ background: `conic-gradient(var(--color-brand-primary) ${xpPct * 3.6}deg, var(--color-skeleton) 0)` }}>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-sm"
                                     style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}>
                                    {xpStats.level}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between font-mono text-[10px] mb-1.5">
                                    <span className="font-bold" style={{ color: 'var(--color-brand-primary)' }}>SEVİYE {xpStats.level}</span>
                                    <span style={{ color: 'var(--color-text-muted)' }}>
                                        {xpStats.total_xp?.toLocaleString('tr-TR')} XP
                                        {xpStats.xp_to_next_level > 0 ? ` · ${xpStats.xp_to_next_level} XP kaldı` : ''}
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden" style={{ background: 'var(--color-skeleton)' }}>
                                    <div className="h-full" style={{ width: `${xpPct}%`, background: 'var(--color-brand-primary)' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ Sekmeler ══ */}
            <div className="flex border-b mt-5" style={BD}>
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className="px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap"
                            style={activeTab === tab.key
                                ? { borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)' }
                                : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ══ İki sütun ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start mt-5">
                <div className="min-w-0">
                    {activeTab === 'overview' && (
                        <OverviewTab meStats={meStats} threads={threads} analyses={analyses}
                                     tLoading={tLoading} aLoading={aLoading}
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

                <div className="flex flex-col gap-5 lg:sticky lg:top-36 self-start">
                    <BadgeShowcase showcase={showcase} isOwnProfile={isOwnProfile} />
                    <RecommendedUsersWidget profileUserId={userId} currentUserId={user?.id} />
                    <PopularThreadsWidget />
                </div>
            </div>

            {/* ══ Modallar ══ */}
            {lightbox && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
                     onClick={() => setLightbox(false)}>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <div className="overflow-hidden" style={{ width: 260, height: 260, border: `3px solid ${tierColor}` }}>
                            {profile.avatar_url
                                ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-full h-full flex items-center justify-center font-black"
                                       style={{ background: PAL_BG[(profile.username?.charCodeAt(0) ?? 0) % PAL_BG.length],
                                                color: PAL_TEXT[(profile.username?.charCodeAt(0) ?? 0) % PAL_TEXT.length], fontSize: 90 }}>
                                    {profile.username?.[0]?.toUpperCase()}
                                  </div>}
                        </div>
                        <button onClick={() => setLightbox(false)}
                                className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center border"
                                style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-terminal-border-raw)' }}>
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                        <p className="font-manrope font-bold text-sm text-center mt-4" style={{ color: 'var(--color-text-primary)' }}>{profile.username}</p>
                    </div>
                </div>,
                document.body
            )}

            {followModal && (
                <FollowModal userId={userId} mode={followModal} onClose={() => setFollowModal(null)} />
            )}

            {selectedItem && (
                <HistoryModal item={selectedItem} hasFullReport={fullReports.has(selectedItem.task_id)} onClose={() => setSelectedItem(null)} />
            )}
        </div>
    );
}
