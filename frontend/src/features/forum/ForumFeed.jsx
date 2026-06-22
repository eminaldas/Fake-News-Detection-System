import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Users, Compass, Loader2 } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import CreateThreadModal from './CreateThreadModal';
import ThreadCard from './ThreadCard';
import AuthorAvatar from './AuthorAvatar';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

const ForumFeed = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') ?? '';
    const tag      = searchParams.get('tag')      ?? '';
    const sort     = searchParams.get('sort')     ?? 'hot';
    const navigate = useNavigate();

    const [activeTab,   setActiveTab]   = React.useState('discover');
    const [threads,     setThreads]     = React.useState([]);
    const [page,        setPage]        = React.useState(1);
    const [loading,     setLoading]     = React.useState(false);
    const [loadError,   setLoadError]   = React.useState(false);
    const [showModal,   setShowModal]   = React.useState(false);
    const [newCount,    setNewCount]    = React.useState(0);
    const SIZE = 20;
    const sentinelRef   = React.useRef(null);
    const isLoadingRef  = React.useRef(false);
    const newestAtRef   = React.useRef(null);
    const [hasMore,     setHasMore]     = React.useState(true);
    const [loadingMore, setLoadingMore] = React.useState(false);

    const load = React.useCallback(async (pg = 1, append = false) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        if (pg === 1) { setLoading(true); setLoadError(false); setHasMore(true); }
        else setLoadingMore(true);
        try {
            let data;
            if (activeTab === 'following') {
                const res = await axiosInstance.get('/users/me/following-feed', { params: { page: pg, size: SIZE } });
                data = res.data;
            } else {
                const params = { sort, page: pg, size: SIZE };
                if (category) params.category = category;
                if (tag)      params.tag      = tag;
                const res = await axiosInstance.get('/forum/threads/discover', { params });
                data = res.data;
            }
            const items = data.items ?? [];
            if (append) {
                setThreads(prev => [...prev, ...items]);
            } else {
                setThreads(items);
                if (items.length > 0) {
                    newestAtRef.current = items[0].created_at;
                    setNewCount(0);
                }
            }
            setPage(data.page ?? pg);
            setHasMore((data.page ?? pg) < Math.ceil((data.total ?? 0) / SIZE));
        } catch {
            setHasMore(false);
            setLoadError(true);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [sort, category, tag, activeTab]);

    React.useEffect(() => { load(1); }, [load]);
    React.useEffect(() => { setPage(1); }, [activeTab]);

    React.useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
                    load(page + 1, true);
                }
            },
            { rootMargin: '0px 0px 300px 0px', threshold: 0 }
        );
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [hasMore, page, load]);

    React.useEffect(() => {
        if (activeTab === 'following') return;
        const id = setInterval(async () => {
            if (!newestAtRef.current || document.hidden) return;
            try {
                const { data } = await axiosInstance.get('/forum/threads/discover', {
                    params: { sort: 'new', page: 1, size: 1 },
                });
                const latest = data.items?.[0];
                if (latest && latest.created_at > newestAtRef.current) {
                    setNewCount(n => n + 1);
                }
            } catch { /* sessiz */ }
        }, 60_000);
        return () => clearInterval(id);
    }, [activeTab]);

    return (
        <>
        <div className="flex flex-col gap-2">

            {/* ── Yeni gönderi banner ── */}
            {newCount > 0 && (
                <button
                    onClick={() => load(1)}
                    className="flex items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold border transition-all hover:opacity-80 animate-fade-up"
                    style={{ background: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.35)', color: 'var(--color-brand-primary)' }}
                >
                    <Loader2 className="w-3.5 h-3.5" />
                    Yeni gönderiler var — yenile
                </button>
            )}

            {/* ── Yeni tartışma çubuğu ── */}
            <div
                className="relative border flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors"
                style={{ ...TS, borderColor: 'var(--color-terminal-border-raw)' }}
                onClick={() => setShowModal(true)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'}
            >
                <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

                <AuthorAvatar username={user?.username ?? '?'} avatarUrl={user?.avatar_url} size={8} />
                <span className="font-mono text-xs mr-1" style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                <span className="flex-1 font-mono text-sm" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    yeni bir tartışma başlat veya iddia paylaş...
                </span>
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs font-bold transition-colors hover:opacity-80"
                    style={{ borderColor: 'rgba(16,185,129,0.30)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.08)' }}
                    onClick={e => { e.stopPropagation(); setShowModal(true); }}
                >
                    <Plus className="w-3.5 h-3.5" /> YENİ
                </button>
            </div>

            {/* ── Tab bar ── */}
            {!category && !tag && (
                <div className="flex border" style={BD}>
                    {[
                        { id: 'discover',  label: 'KEŞFET',         Icon: Compass },
                        { id: 'following', label: 'TAKİP EDİLENLER', Icon: Users   },
                    ].map((tab) => {
                        const active = activeTab === tab.id;
                        const TabIcon = tab.Icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === 'following' && !user) { navigate('/login'); return; }
                                    setActiveTab(tab.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold tracking-wider uppercase relative overflow-hidden"
                                style={{
                                    background: active ? 'var(--color-forum-tab-active)' : 'var(--color-terminal-surface)',
                                    color:      'var(--color-text-primary)',
                                    borderLeft: `2px solid ${active ? 'var(--color-brand-primary)' : 'transparent'}`,
                                    transition: 'background 0.22s ease, border-color 0.22s ease',
                                }}
                            >
                                <TabIcon className="w-3.5 h-3.5"
                                    style={{
                                        color:      active ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                        transition: 'color 0.22s ease, transform 0.22s ease',
                                        transform:  active ? 'scale(1.1)' : 'scale(1)',
                                    }} />
                                <span style={{ opacity: active ? 1 : 0.6, transition: 'opacity 0.22s ease' }}>
                                    {tab.label}
                                </span>
                                {active && <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--color-brand-primary)' }} />}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Aktif filtreler ── */}
            {(category || tag) && (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--color-text-muted)' }}>filtre:</span>
                    {category && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n); }}
                            className="font-mono text-[10px] uppercase px-2 py-0.5 border transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setSearchParams(n); }}
                            className="font-mono text-[10px] uppercase px-2 py-0.5 border transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)' }}
                        >
                            {tag} ✕
                        </button>
                    )}
                </div>
            )}

            {/* ── Thread listesi ── */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-36 border animate-pulse" style={TS} />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="border py-16 text-center" style={TS}>
                    {activeTab === 'following' ? (
                        <>
                            <Users className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>// takip listesi boş</p>
                            <p className="font-mono text-xs opacity-50" style={{ color: 'var(--color-text-muted)' }}>kullanıcı profillerinden takip edebilirsin</p>
                        </>
                    ) : (
                        <>
                            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// tartışma bulunamadı</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((t, i) => (
                        <div key={t.id} className="animate-fade-up"
                             style={{ animationDelay: `${i * 25}ms`, animationFillMode: 'both' }}>
                            <ThreadCard thread={t} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Infinite scroll sentinel ── */}
            <div ref={sentinelRef} className="py-4 flex flex-col items-center gap-2">
                {loadingMore && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
                {loadError && (
                    <button
                        onClick={() => { setLoadError(false); setHasMore(true); load(page + 1, true); }}
                        className="font-mono text-xs px-3 py-1.5 border transition-opacity hover:opacity-70"
                        style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                    >
                        tekrar dene
                    </button>
                )}
            </div>
        </div>

        {showModal && <CreateThreadModal onClose={() => setShowModal(false)} />}
        </>
    );
};

export default ForumFeed;
