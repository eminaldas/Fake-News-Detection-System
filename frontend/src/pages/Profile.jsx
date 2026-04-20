import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare, Users, Calendar } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

/* ── Avatar — harf tabanlı, ForumFeed ile aynı palet ─────────── */
function UserAvatar({ username, size = 'lg' }) {
    const colors = [
        'rgba(16,185,129,0.20)', 'rgba(59,130,246,0.20)',
        'rgba(245,158,11,0.20)', 'rgba(239,68,68,0.20)',
        'rgba(168,85,247,0.20)',
    ];
    const textColors = [
        'var(--color-brand-primary)', 'var(--color-accent-blue)',
        'var(--color-accent-amber)', '#ef4444', '#a855f7',
    ];
    const idx = (username?.charCodeAt(0) ?? 0) % colors.length;
    const sizeClass = size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-10 h-10 text-base';
    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-black shrink-0`}
            style={{ background: colors[idx], color: textColors[idx] }}
        >
            {(username ?? '?')[0].toUpperCase()}
        </div>
    );
}

/* ── Küçük istatistik kutusu ─────────────────────────────────── */
function StatBox({ label, value }) {
    return (
        <div
            className="flex flex-col items-center px-6 py-4 rounded-xl"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
            <span className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                {value ?? 0}
            </span>
            <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {label}
            </span>
        </div>
    );
}

/* ── Basit thread kartı (profil için) ────────────────────────── */
function ProfileThreadCard({ thread }) {
    function timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60)     return `${Math.floor(diff)}s`;
        if (diff < 3600)   return `${Math.floor(diff / 60)}dk`;
        if (diff < 86400)  return `${Math.floor(diff / 3600)}sa`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }

    return (
        <article
            className="rounded-xl p-5 transition-all duration-200"
            style={{
                background: 'var(--color-bg-surface)',
                boxShadow: '0 2px 14px rgba(0,0,0,0.28)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.42)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.28)'; }}
        >
            <div className="flex flex-col gap-2">
                {thread.category && (
                    <span
                        className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                        style={{
                            background: 'rgba(59,130,246,0.10)',
                            color: 'var(--color-accent-blue)',
                            border: '1px solid rgba(59,130,246,0.20)',
                        }}
                    >
                        {thread.category}
                    </span>
                )}
                <Link to={`/forum/${thread.id}`}>
                    <h3
                        className="font-manrope font-black text-base leading-snug line-clamp-2 hover:text-brand transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {thread.title}
                    </h3>
                </Link>
                {thread.body && (
                    <p
                        className="text-sm leading-relaxed line-clamp-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {thread.body}
                    </p>
                )}
                <div
                    className="flex items-center gap-3 pt-2 text-xs"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
                >
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {thread.comment_count ?? 0} yorum
                    </span>
                    <span className="ml-auto">{timeAgo(thread.created_at)}</span>
                </div>
            </div>
        </article>
    );
}

/* ── Spinner ─────────────────────────────────────────────────── */
function Spinner() {
    return (
        <div className="flex items-center justify-center py-24 gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Yükleniyor...</span>
        </div>
    );
}

/* ── Ana sayfa ────────────────────────────────────────────────── */
export default function Profile() {
    const { userId }   = useParams();
    const { user }     = useAuth();

    const [profile,  setProfile]  = useState(null);
    const [threads,  setThreads]  = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [loading,  setLoading]  = useState(true);
    const [tLoading, setTLoading] = useState(false);
    const [error,    setError]    = useState(null);
    const [following, setFollowing] = useState(false);
    const [fLoading,  setFLoading]  = useState(false);

    const SIZE = 20;
    const isOwnProfile = user?.id === userId;

    /* Profil yükle */
    useEffect(() => {
        setLoading(true);
        setError(null);
        axiosInstance.get(`/users/${userId}/profile`)
            .then(({ data }) => {
                setProfile(data);
                setFollowing(data.is_following ?? false);
            })
            .catch(() => setError('Profil yüklenemedi.'))
            .finally(() => setLoading(false));
    }, [userId]);

    /* Thread listesi yükle */
    const loadThreads = useCallback((pg = 1) => {
        setTLoading(true);
        axiosInstance.get(`/users/${userId}/threads`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => {
                setThreads(data.items ?? []);
                setTotal(data.total ?? 0);
                setPage(pg);
            })
            .catch(() => {})
            .finally(() => setTLoading(false));
    }, [userId]);

    useEffect(() => { loadThreads(1); }, [loadThreads]);

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

    const totalPages = Math.ceil(total / SIZE);

    /* ── Render ─────────────────────────────────────────────── */
    if (loading) return (
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">
            <Spinner />
        </div>
    );

    if (error || !profile) return (
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-16 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {error ?? 'Profil bulunamadı.'}
            </p>
        </div>
    );

    const joinedDate = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
        : null;

    return (
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">

            {/* ── Profil başlığı ── */}
            <div
                className="rounded-2xl p-7 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
                style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.32)',
                }}
            >
                <UserAvatar username={profile.username} size="lg" />

                <div className="flex-1 min-w-0">
                    <h1
                        className="text-2xl font-manrope font-black tracking-tight leading-none mb-1"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {profile.username}
                    </h1>

                    {joinedDate && (
                        <p className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                            <Calendar className="w-3.5 h-3.5" />
                            {joinedDate} tarihinden beri üye
                        </p>
                    )}

                    {profile.bio && (
                        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            {profile.bio}
                        </p>
                    )}

                    {!isOwnProfile && user && (
                        <button
                            onClick={handleFollow}
                            disabled={fLoading}
                            className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50"
                            style={following ? {
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                            } : {
                                background: 'var(--color-brand-primary)',
                                border: '1px solid var(--color-brand-primary)',
                                color: '#070f12',
                            }}
                        >
                            {following ? 'Takibi Bırak' : 'Takip Et'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── İstatistikler ── */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <StatBox label="Tartışma" value={profile.thread_count} />
                <StatBox label="Takipçi"  value={profile.follower_count} />
                <StatBox label="Takip"    value={profile.following_count} />
            </div>

            {/* ── Thread listesi başlığı ── */}
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                <h2 className="text-base font-manrope font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Tartışmalar
                </h2>
                {total > 0 && (
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>({total})</span>
                )}
            </div>

            {/* ── Thread listesi ── */}
            {tLoading ? (
                <Spinner />
            ) : threads.length === 0 ? (
                <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Henüz tartışma yok.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map(t => (
                        <ProfileThreadCard key={t.id} thread={t} />
                    ))}
                </div>
            )}

            {/* ── Sayfalama ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                    <button
                        disabled={page <= 1}
                        onClick={() => loadThreads(page - 1)}
                        className="px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-white/5"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                        Önceki
                    </button>
                    <span className="text-xs px-3" style={{ color: 'var(--color-text-muted)' }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => loadThreads(page + 1)}
                        className="px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-white/5"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                        Sonraki
                    </button>
                </div>
            )}
        </div>
    );
}
