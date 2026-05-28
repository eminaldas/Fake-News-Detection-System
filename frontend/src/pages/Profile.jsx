import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, Link2, Settings } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import GamificationService from '../services/gamification.service';
import { TypeBadge, PredictionBadge } from '../components/common/AnalysisBadges';
import RecommendedUsersWidget from '../features/profile/RecommendedUsersWidget';
import PopularThreadsWidget from '../features/profile/PopularThreadsWidget';

/* ── Tasarım sabitleri ────────────────────────────────────────────── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const CAT_COLOR = {
    Siyaset:   'var(--color-accent-blue)',
    Ekonomi:   'var(--color-accent-amber)',
    Bilim:     '#a855f7',
    Spor:      '#ec4899',
    Teknoloji: '#06b6d4',
};

const PREDICTION_BORDER = {
    FAKE:      'var(--color-fake-fill)',
    AUTHENTIC: 'var(--color-brand-primary)',
    UNCERTAIN: 'var(--color-accent-amber)',
};

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

/* ── Avatar ─────────────────────────────────────────────────────── */
const PAL_BG   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

function UserAvatar({ username, avatarUrl }) {
    const idx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
    if (avatarUrl) {
        return (
            <div className="w-28 h-28 rounded-full overflow-hidden shrink-0"
                 style={{ border: `4px solid ${PAL_TEXT[idx]}`, background: PAL_BG[idx] }}>
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                     onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
        );
    }
    return (
        <div className="w-28 h-28 rounded-full flex items-center justify-center font-mono font-black text-4xl shrink-0"
             style={{ background: PAL_BG[idx], color: PAL_TEXT[idx], border: `4px solid ${PAL_TEXT[idx]}` }}>
            {(username ?? '?')[0].toUpperCase()}
        </div>
    );
}

/* ── Spinner ─────────────────────────────────────────────────────── */
function Spinner() {
    return (
        <div className="flex items-center justify-center py-24 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   ANA SAYFA
   ══════════════════════════════════════════════════════════════════ */
export default function Profile() {
    const { userId }   = useParams();
    const { user }     = useAuth();
    const navigate     = useNavigate();

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
    const [activeTab,   setActiveTab]   = useState('overview');
    const [error,       setError]       = useState(null);

    const SIZE = 10;
    const isOwnProfile = user?.id === userId;

    /* Profil + XP + Showcase yükle */
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

    /* Analiz listesi */
    const loadAnalyses = useCallback((pg = 1) => {
        setALoading(true);
        axiosInstance.get(`/users/${userId}/analyses`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => { setAnalyses(data.items ?? []); setAnalysisTotal(data.total ?? 0); setAnalysisPage(pg); })
            .catch(() => {})
            .finally(() => setALoading(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);
    useEffect(() => { loadAnalyses(1); }, [loadAnalyses]);

    /* Takip toggle */
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
        } catch { /* sessiz */ }
        finally { setFLoading(false); }
    };

    /* ── Yükleniyor ─────────────────────────────────────────────── */
    if (loading) return <div className="max-w-6xl mx-auto px-4 pt-10"><Spinner /></div>;
    if (error || !profile) return (
        <div className="max-w-6xl mx-auto px-4 pt-10 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{error ?? 'Profil bulunamadı.'}</p>
        </div>
    );

    const joinedDate = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
        : null;

    const socialLink = profile.social_links
        ? (profile.social_links.instagram || profile.social_links.twitter || profile.social_links.website || null)
        : null;

    const threadTotalPages   = Math.ceil(threadTotal / SIZE);
    const analysisTotalPages = Math.ceil(analysisTotal / SIZE);

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="max-w-6xl mx-auto px-4 pb-16">

            {/* ══ HERO SECTION ══════════════════════════════════════ */}
            <div className="relative border overflow-hidden mb-8" style={S}>
                <Corner />

                {/* Cover alanı */}
                <div className="h-48 w-full relative overflow-hidden"
                     style={{
                         backgroundColor: 'var(--color-bg-base)',
                         backgroundImage: 'linear-gradient(to right, var(--color-terminal-border-raw) 1px, transparent 1px), linear-gradient(to bottom, var(--color-terminal-border-raw) 1px, transparent 1px)',
                         backgroundSize: '40px 40px',
                     }}>
                    <div className="absolute inset-0"
                         style={{ background: 'linear-gradient(to top, var(--color-terminal-surface) 0%, transparent 60%)' }} />
                    {/* Köşe aksanları (cover içi) */}
                    <div className="absolute top-3 left-3 w-6 h-0.5 bg-brand opacity-60" />
                    <div className="absolute top-3 left-3 h-6 w-0.5 bg-brand opacity-60" />
                    <div className="absolute top-3 right-3 w-6 h-0.5 bg-brand opacity-60" />
                    <div className="absolute top-3 right-3 h-6 w-0.5 bg-brand opacity-60" />
                </div>

                {/* Avatar + bilgiler */}
                <div className="px-6 md:px-10 pb-6 -mt-14 flex flex-col md:flex-row gap-5 md:items-end justify-between">
                    <div className="flex flex-col md:flex-row gap-5 items-start md:items-end flex-1 min-w-0">
                        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} />

                        <div className="pb-1 flex-1 min-w-0">
                            {/* Username + trust badge */}
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h1 className="text-2xl font-manrope font-black tracking-tight"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.username}
                                </h1>
                                {profile.trust_tier && profile.trust_tier !== 'yeni_uye' && (
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider"
                                          style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)', background: 'rgba(16,185,129,0.08)' }}>
                                        {profile.trust_label}
                                    </span>
                                )}
                            </div>

                            {/* Handle */}
                            <p className="font-mono text-xs mb-2"
                               style={{ color: 'var(--color-brand-primary)' }}>
                                // @{profile.username}
                            </p>

                            {/* Bio */}
                            {profile.bio && (
                                <p className="text-sm leading-relaxed mb-3 max-w-2xl"
                                   style={{ color: 'var(--color-text-primary)' }}>
                                    {profile.bio}
                                </p>
                            )}

                            {/* Meta bilgiler */}
                            <div className="flex items-center gap-4 flex-wrap">
                                {joinedDate && (
                                    <span className="flex items-center gap-1 font-mono text-xs"
                                          style={{ color: 'var(--color-text-muted)' }}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        {joinedDate} tarihinden beri üye
                                    </span>
                                )}
                                {socialLink && (
                                    <a href={socialLink.startsWith('http') ? socialLink : `https://${socialLink}`}
                                       target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-1 font-mono text-xs transition-opacity hover:opacity-70"
                                       style={{ color: 'var(--color-brand-primary)' }}>
                                        <Link2 className="w-3.5 h-3.5" />
                                        {socialLink.replace(/^https?:\/\//, '').split('/')[0]}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Aksiyon butonları */}
                    <div className="flex gap-3 shrink-0 pb-1">
                        {isOwnProfile ? (
                            <button
                                onClick={() => navigate('/profile/overview')}
                                className="flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold border transition-colors"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                            >
                                <Settings className="w-4 h-4" /> Profili Düzenle
                            </button>
                        ) : user && (
                            <>
                                <button
                                    className="px-4 py-2 font-mono text-sm font-bold border transition-colors"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                                >
                                    Mesaj
                                </button>
                                <button
                                    onClick={handleFollow}
                                    disabled={fLoading}
                                    className="px-6 py-2 font-mono text-sm font-bold border transition-all disabled:opacity-50"
                                    style={following ? {
                                        background: 'transparent',
                                        borderColor: 'var(--color-terminal-border-raw)',
                                        color: 'var(--color-text-primary)',
                                    } : {
                                        background: 'var(--color-brand-primary)',
                                        borderColor: 'var(--color-brand-primary)',
                                        color: '#070f12',
                                        boxShadow: '0 0 15px rgba(16,185,129,0.25)',
                                    }}
                                    onMouseEnter={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 25px rgba(16,185,129,0.45)'; }}
                                    onMouseLeave={e => { if (!following) e.currentTarget.style.boxShadow = '0 0 15px rgba(16,185,129,0.25)'; }}
                                >
                                    {following ? 'Takipte' : 'Takip Et'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats strip */}
                <div className="border-t px-6 py-4 flex flex-wrap gap-8"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-bg-base)' }}>
                    {[
                        { label: 'Tartışma',     value: profile.thread_count,    color: 'var(--color-text-primary)' },
                        { label: 'Takipçi',      value: profile.follower_count,  color: 'var(--color-text-primary)' },
                        { label: 'Takip',        value: profile.following_count, color: 'var(--color-text-primary)' },
                        { label: 'Analiz',       value: profile.analysis_count,  color: 'var(--color-brand-primary)' },
                        { label: 'Sahte Tespit', value: profile.fake_count,      color: 'var(--color-fake-fill)' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                            <div className="text-xl font-manrope font-black" style={{ color }}>{value ?? 0}</div>
                            <div className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
                                 style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                        </div>
                    ))}

                    {xpStats && (
                        <div className="border-l pl-8 text-center" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                            <div className="text-xl font-manrope font-black"
                                 style={{ color: 'var(--color-text-primary)' }}>
                                Seviye <span style={{ color: 'var(--color-brand-primary)' }}>{xpStats.level}</span>
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-widest mt-0.5"
                                 style={{ color: 'var(--color-text-muted)' }}>
                                {xpStats.total_xp} XP
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ İKİ SÜTUN LAYOUT ══════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* ── Sol sütun ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-5">
                    {/* Tab çubuğu */}
                    <div className="flex gap-6 border-b overflow-x-auto" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        {[
                            { key: 'overview',  label: 'Genel Bakış' },
                            { key: 'threads',   label: `Tartışmalar (${threadTotal})` },
                            { key: 'analyses',  label: `Analizlerim (${analysisTotal})` },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className="pb-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap"
                                style={activeTab === tab.key ? {
                                    borderColor: 'var(--color-brand-primary)',
                                    color: 'var(--color-brand-primary)',
                                } : {
                                    borderColor: 'transparent',
                                    color: 'var(--color-text-muted)',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview'  && <OverviewTab  threads={threads} analyses={analyses} tLoading={tLoading} aLoading={aLoading} setActiveTab={setActiveTab} />}
                    {activeTab === 'threads'   && <ThreadsTab   threads={threads} loading={tLoading} page={threadPage}   totalPages={threadTotalPages}   load={loadThreads} />}
                    {activeTab === 'analyses'  && <AnalysesTab  analyses={analyses} loading={aLoading} page={analysisPage} totalPages={analysisTotalPages} load={loadAnalyses} />}
                </div>

                {/* ── Sağ sütun ── */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
                    <BadgeShowcase showcase={showcase} isOwn={isOwnProfile} />
                    <RecommendedUsersWidget profileUserId={userId} currentUserId={user?.id} />
                    <PopularThreadsWidget />
                </div>
            </div>
        </div>
    );
}

/* ── Zaman formatı ── */
function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return `${Math.floor(diff)}s`;
    if (diff < 3600)   return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}sa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/* ── Sayfalama ── */
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

/* ── Thread kartı ── */
function ThreadCard({ thread }) {
    const catColor = CAT_COLOR[thread.category] ?? 'var(--color-accent-blue)';
    return (
        <article className="relative border transition-colors cursor-pointer group"
                 style={S}
                 onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-terminal-surface)'; }}>
            <Corner />
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
                    <h3 className="font-manrope font-bold text-base leading-snug line-clamp-2 mb-2 transition-colors group-hover:text-brand"
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

                <div className="flex items-center gap-3 pt-3 border-t font-mono text-xs"
                     style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {thread.comment_count ?? 0} yorum
                    </span>
                </div>
            </div>
        </article>
    );
}

/* ── Analiz kartı ── */
function AnalysisCard({ item }) {
    const predBorderColor = PREDICTION_BORDER[item.prediction] ?? 'transparent';
    const verdictLabel = { FAKE: 'Sahte İçerik', AUTHENTIC: 'Doğrulandı', UNCERTAIN: 'Belirsiz' };
    const verdictStyle = {
        FAKE:      { color: 'var(--color-fake-text)',      borderColor: 'var(--color-fake-border)',      background: 'var(--color-fake-bg)' },
        AUTHENTIC: { color: 'var(--color-authentic-text)', borderColor: 'var(--color-authentic-border)', background: 'var(--color-authentic-bg)' },
        UNCERTAIN: { color: 'var(--color-iddia-text)',     borderColor: 'var(--color-iddia-border)',     background: 'var(--color-iddia-bg)' },
    };

    return (
        <article className="relative border overflow-hidden transition-colors group cursor-default"
                 style={S}
                 onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-terminal-surface)'; }}>
            <Corner />

            {item.prediction && (
                <div className="absolute right-0 top-0 bottom-0 w-0.75"
                     style={{ background: `linear-gradient(to bottom, ${predBorderColor}, transparent)` }} />
            )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={item.analysis_type} />
                        <span className="font-mono text-[10px] px-2 py-0.5 border"
                              style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.25)' }}>
                            Analiz Raporu
                        </span>
                    </div>
                    <span className="font-mono text-[11px] shrink-0"
                          style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </span>
                </div>

                <h3 className="font-manrope font-bold text-base leading-snug line-clamp-2 mb-4 transition-colors group-hover:text-brand"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {item.title ?? item.task_id ?? '—'}
                </h3>

                {item.prediction && (
                    <div className="flex items-center justify-between pt-3 border-t"
                         style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        <span className="font-mono text-[10px] font-bold px-2.5 py-1 border"
                              style={verdictStyle[item.prediction] ?? {}}>
                            {verdictLabel[item.prediction] ?? item.prediction}
                        </span>
                        {item.confidence != null && (
                            <span className="font-mono text-xs"
                                  style={{ color: 'var(--color-text-muted)' }}>
                                %{Math.round(item.confidence * 100)} Güven
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

/* ── Genel Bakış Tab ── */
function OverviewTab({ threads, analyses, tLoading, aLoading, setActiveTab }) {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs uppercase tracking-widest"
                          style={{ color: 'var(--color-brand-primary)' }}>// SON TARTIŞMALAR</span>
                    <button onClick={() => setActiveTab('threads')}
                            className="font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        tümünü gör →
                    </button>
                </div>
                {tLoading ? <Spinner /> : threads.slice(0, 3).map(t => <ThreadCard key={t.id} thread={t} />)}
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs uppercase tracking-widest"
                          style={{ color: 'var(--color-brand-primary)' }}>// SON ANALİZLER</span>
                    <button onClick={() => setActiveTab('analyses')}
                            className="font-mono text-[10px] transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        tümünü gör →
                    </button>
                </div>
                {aLoading ? <Spinner /> : analyses.slice(0, 3).map((a, i) => <AnalysisCard key={a.id ?? i} item={a} />)}
            </div>
        </div>
    );
}

/* ── Tartışmalar Tab ── */
function ThreadsTab({ threads, loading, page, totalPages, load }) {
    return (
        <div className="flex flex-col gap-3">
            {loading ? <Spinner /> : threads.length === 0 ? (
                <div className="text-center py-20">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20"
                                   style={{ color: 'var(--color-text-muted)' }} />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        // henüz tartışma yok
                    </p>
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

/* ── Analizlerim Tab ── */
function AnalysesTab({ analyses, loading, page, totalPages, load }) {
    return (
        <div className="flex flex-col gap-3">
            {loading ? <Spinner /> : analyses.length === 0 ? (
                <div className="text-center py-20">
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        // henüz analiz yok
                    </p>
                </div>
            ) : (
                <>
                    {analyses.map((a, i) => <AnalysisCard key={a.id ?? i} item={a} />)}
                    <Pagination page={page} totalPages={totalPages} load={load} />
                </>
            )}
        </div>
    );
}

/* ── Rozet Vitrini ── */
function BadgeShowcase({ showcase, isOwn }) {
    const navigate = useNavigate();
    return (
        <div className="relative border overflow-hidden" style={S}>
            <Corner />

            <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                <span className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: 'var(--color-brand-primary)' }}>// ROZET VİTRİNİ</span>
                {isOwn && (
                    <button
                        onClick={() => navigate('/profile/overview')}
                        className="font-mono text-[9px] px-2 py-0.5 border transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-accent-blue)', borderColor: 'var(--color-accent-blue)' }}>
                        Düzenle
                    </button>
                )}
            </div>

            <div className="flex gap-3 px-4 py-3">
                {[0, 1, 2].map(i => {
                    const badge = showcase[i];
                    if (!badge) {
                        return (
                            <div key={i} className="flex-1 h-16 border flex items-center justify-center"
                                 style={{ borderColor: 'var(--color-terminal-border-raw)', borderStyle: 'dashed' }}>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>boş</span>
                            </div>
                        );
                    }
                    return (
                        <div key={badge.key ?? i}
                             className="flex-1 h-16 border flex flex-col items-center justify-center gap-1"
                             style={{ borderColor: badge.color, background: `${badge.color}10` }}>
                            <span className="font-mono text-xs font-black" style={{ color: badge.color }}>
                                {badge.name?.[0] ?? '★'}
                            </span>
                            <span className="font-mono text-[9px] text-center px-1 leading-tight"
                                  style={{ color: badge.color }}>
                                {badge.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
