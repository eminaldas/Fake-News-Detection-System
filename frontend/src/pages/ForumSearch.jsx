import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    Search, MessageSquare, Users, UserPlus, UserMinus,
    Loader2, AlertCircle,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

/* ── Tasarım ────────────────────────────────────────────── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function Corner() {
    return (
        <>
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
        </>
    );
}

const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
};

const STATUS_C = {
    active:       'var(--color-brand-primary)',
    under_review: 'var(--color-accent-amber)',
    resolved:     'var(--color-accent-blue)',
};

function timeAgo(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60)    return `${Math.floor(s)}s`;
    if (s < 3600)  return `${Math.floor(s/60)}dk`;
    if (s < 86400) return `${Math.floor(s/3600)}sa`;
    return `${Math.floor(s/86400)}g`;
}

/* ── Kullanıcı kartı ──────────────────────────────────── */
function UserCard({ user: u, onFollowToggle }) {
    const { user: me }  = useAuth();
    const navigate      = useNavigate();
    const [following,  setFollowing]  = useState(u.is_following ?? false);
    const [loading,    setLoading]    = useState(false);
    const isMe = me?.id === u.id;
    const tierColor = TIER_COLOR[u.trust_tier] ?? 'var(--color-text-muted)';

    const handleFollow = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!me || loading) return;
        setLoading(true);
        try {
            await axiosInstance.post(`/users/${u.id}/follow`);
            const newState = !following;
            setFollowing(newState);
            onFollowToggle?.(u.id, newState);
        } catch { /* sessiz */ }
        finally { setLoading(false); }
    };

    return (
        <div
            className="flex items-center gap-4 px-5 py-4 border-b cursor-pointer transition-colors hover:bg-white/3"
            style={BD}
            onClick={() => navigate(`/users/${u.id}`)}
        >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-lg shrink-0"
                 style={{
                     background: 'rgba(16,185,129,0.10)',
                     border: `2px solid ${tierColor}`,
                     color: tierColor,
                     minWidth: 48,
                 }}>
                {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover"
                           onError={e => { e.currentTarget.style.display='none'; }} />
                    : u.username[0].toUpperCase()
                }
            </div>

            {/* Bilgi */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                        {u.username}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 border shrink-0"
                          style={{ color: tierColor, borderColor: tierColor + '40' }}>
                        {'★'.repeat(u.trust_stars)} {u.trust_label}
                    </span>
                </div>
                {u.bio && (
                    <p className="font-mono text-xs mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {u.bio}
                    </p>
                )}
                <div className="flex items-center gap-3 mt-1 font-mono text-[10px]"
                     style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {u.follower_count} takipçi
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {u.thread_count} tartışma
                    </span>
                </div>
            </div>

            {/* Takip butonu */}
            {!isMe && me && (
                <button
                    onClick={handleFollow}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 font-mono text-xs font-bold shrink-0 transition-all duration-200 disabled:opacity-40"
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
                    {loading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : following
                            ? <><UserMinus className="w-3.5 h-3.5" /> Takipte</>
                            : <><UserPlus className="w-3.5 h-3.5" /> Takip</>
                    }
                </button>
            )}
        </div>
    );
}

/* ── Thread kartı ─────────────────────────────────────── */
function ThreadCard({ t }) {
    const sc = STATUS_C[t.status] ?? STATUS_C.active;
    return (
        <Link
            to={`/forum/${t.id}`}
            className="flex items-start gap-3 px-4 py-3.5 border-b transition-colors hover:bg-white/3"
            style={BD}
        >
            <div className="w-1 h-full min-h-[36px] shrink-0 mt-1" style={{ background: sc }} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    {t.category && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border"
                              style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}>
                            {t.category}
                        </span>
                    )}
                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {t.author?.username}
                    </span>
                    <span className="font-mono text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                        {timeAgo(t.created_at)}
                    </span>
                </div>
                <p className="font-mono text-sm font-bold leading-snug"
                   style={{ color: 'var(--color-text-primary)' }}>
                    {t.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px]"
                     style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {t.comment_count}
                    </span>
                    <span style={{ color: 'var(--color-brand-primary)' }}>✓ {t.vote_authentic}</span>
                    <span style={{ color: '#ef4444' }}>! {t.vote_suspicious}</span>
                </div>
            </div>
        </Link>
    );
}

/* ── Ana sayfa ─────────────────────────────────────────── */
export default function ForumSearch() {
    const { user: me }       = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQ   = searchParams.get('q') ?? '';
    const initialTab = searchParams.get('tab') ?? 'posts';

    const [query,    setQuery]    = useState(initialQ);
    const [tab,      setTab]      = useState(initialTab);

    const [posts,     setPosts]     = useState([]);
    const [postTotal, setPostTotal] = useState(0);
    const [postLoad,  setPostLoad]  = useState(false);

    const [users,     setUsers]     = useState([]);
    const [userTotal, setUserTotal] = useState(0);
    const [userLoad,  setUserLoad]  = useState(false);

    const [searched, setSearched] = useState(false);
    const inputRef   = useRef(null);

    const searchPosts = useCallback(async (q) => {
        if (!q.trim()) return;
        setPostLoad(true);
        try {
            const { data } = await axiosInstance.get('/forum/search', { params: { q, page: 1, size: 20 } });
            setPosts(data.items ?? []);
            setPostTotal(data.total ?? 0);
        } catch { /* sessiz */ }
        finally { setPostLoad(false); }
    }, []);

    const searchUsers = useCallback(async (q) => {
        if (!q.trim()) return;
        setUserLoad(true);
        try {
            const { data } = await axiosInstance.get('/users/search', { params: { q, page: 1, size: 20 } });
            setUsers(data.items ?? []);
            setUserTotal(data.total ?? 0);
        } catch { /* sessiz */ }
        finally { setUserLoad(false); }
    }, []);

    const doSearch = useCallback((q) => {
        if (!q.trim()) return;
        setSearched(true);
        searchPosts(q);
        searchUsers(q);
    }, [searchPosts, searchUsers]);

    /* URL'den ilk yükleme */
    useEffect(() => {
        if (initialQ) doSearch(initialQ);
    }, []); // eslint-disable-line

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setSearchParams({ q: query, tab });
        doSearch(query);
    };

    const handleTabChange = (t) => {
        setTab(t);
        if (query.trim()) setSearchParams({ q: query, tab: t });
    };

    const handleFollowToggle = (userId, isNowFollowing) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: isNowFollowing } : u));
    };

    return (
        <div className="max-w-2xl mx-auto py-6 flex flex-col gap-5">

            {/* Arama kutusu */}
            <div className="relative border overflow-hidden" style={S}>
                <Corner />
                <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3">
                    <span className="font-mono text-base font-bold shrink-0"
                          style={{ color: 'var(--color-brand-primary)' }}>›</span>
                    <input
                        ref={inputRef}
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Tartışma veya kullanıcı ara..."
                        className="flex-1 bg-transparent font-mono text-sm outline-none"
                        style={{ color: 'var(--color-text-primary)' }}
                    />
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold transition-opacity hover:opacity-80"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        <Search className="w-3.5 h-3.5" /> ARA
                    </button>
                </form>
            </div>

            {/* Sekme bar */}
            <div className="flex border" style={BD}>
                {[
                    { id: 'posts', label: 'Gönderiler', icon: MessageSquare, count: postTotal },
                    { id: 'users', label: 'Kişiler',    icon: Users,         count: userTotal },
                ].map(({ id, label, icon: Icon, count }) => (
                    <button
                        key={id}
                        onClick={() => handleTabChange(id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors border-l-2"
                        style={{
                            background:  tab === id ? 'rgba(16,185,129,0.08)' : 'transparent',
                            color:       tab === id ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                            borderColor: tab === id ? 'var(--color-brand-primary)' : 'transparent',
                        }}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                        {searched && count > 0 && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 ml-1"
                                  style={{
                                      background: tab === id ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                      color: tab === id ? '#070f12' : 'var(--color-text-muted)',
                                  }}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Gönderiler ── */}
            {tab === 'posts' && (
                <div className="relative border overflow-hidden" style={S}>
                    <Corner />
                    {postLoad ? (
                        <div className="p-10 flex items-center justify-center gap-3"
                             style={{ color: 'var(--color-text-muted)' }}>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="font-mono text-sm">// aranıyor...</span>
                        </div>
                    ) : !searched ? (
                        <div className="p-10 flex flex-col items-center gap-3">
                            <Search className="w-10 h-10 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                // tartışmalarda arama yap
                            </p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="p-10 flex flex-col items-center gap-3">
                            <AlertCircle className="w-8 h-8 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                // "{query}" için gönderi bulunamadı
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={BD}>
                                <span className="font-mono text-xs tracking-widest uppercase"
                                      style={{ color: 'var(--color-brand-primary)' }}>
                                    // SONUÇLAR
                                </span>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {postTotal} gönderi
                                </span>
                            </div>
                            {posts.map(t => <ThreadCard key={t.id} t={t} />)}
                        </>
                    )}
                </div>
            )}

            {/* ── Kişiler ── */}
            {tab === 'users' && (
                <div className="relative border overflow-hidden" style={S}>
                    <Corner />
                    {userLoad ? (
                        <div className="p-10 flex items-center justify-center gap-3"
                             style={{ color: 'var(--color-text-muted)' }}>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="font-mono text-sm">// aranıyor...</span>
                        </div>
                    ) : !searched ? (
                        <div className="p-10 flex flex-col items-center gap-3">
                            <Users className="w-10 h-10 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                // kullanıcılarda arama yap
                            </p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-10 flex flex-col items-center gap-3">
                            <AlertCircle className="w-8 h-8 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                // "{query}" adında kullanıcı bulunamadı
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={BD}>
                                <span className="font-mono text-xs tracking-widest uppercase"
                                      style={{ color: 'var(--color-brand-primary)' }}>
                                    // KİŞİLER
                                </span>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {userTotal} kullanıcı
                                </span>
                            </div>
                            {users.map(u => (
                                <UserCard key={u.id} user={u} onFollowToggle={handleFollowToggle} />
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
