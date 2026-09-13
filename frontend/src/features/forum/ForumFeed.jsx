import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Users, Compass, Loader2 } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import CreateThreadModal from './CreateThreadModal';
import ThreadCard from './ThreadCard';
import AuthorAvatar from './AuthorAvatar';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const ForumFeed = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') ?? '';
    const tag      = searchParams.get('tag')      ?? '';
    const storedSort = (() => { try { return localStorage.getItem('forum_sort'); } catch { return null; } })();
    const sort     = searchParams.get('sort')     ?? storedSort ?? 'hot';
    const navigate = useNavigate();

    const [activeTab,   setActiveTab]   = React.useState('discover');
    const [threads,     setThreads]     = React.useState([]);
    const [page,        setPage]        = React.useState(1);
    const [loading,     setLoading]     = React.useState(false);
    const [loadError,   setLoadError]   = React.useState(false);
    const [showModal,   setShowModal]   = React.useState(false);
    const [pending,     setPending]     = React.useState([]);
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
                setPending([]);
                if (items.length > 0) {
                    newestAtRef.current = items[0].created_at;
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
                const params = { sort: 'new', page: 1, size: 10 };
                if (category) params.category = category;
                if (tag)      params.tag      = tag;
                const { data } = await axiosInstance.get('/forum/threads/discover', { params });
                const fresh = (data.items ?? []).filter(t => t.created_at > newestAtRef.current);
                if (fresh.length === 0) return;
                newestAtRef.current = fresh[0].created_at;
                if (window.scrollY < 80) {
                    setThreads(prev => [...fresh, ...prev]);      // sessiz prepend
                } else {
                    setPending(prev => [...fresh, ...prev]);      // birikir
                }
            } catch { /* sessiz */ }
        }, 60_000);
        return () => clearInterval(id);
    }, [activeTab, category, tag]);

    return (
        <>
        <div className="flex flex-col gap-2">

            {/* ── Yeni gönderi pill (aşağıdayken) ── */}
            {pending.length > 0 && (
                <button
                    type="button"
                    onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setThreads(prev => [...pending, ...prev]); setPending([]); }}
                    className="sticky top-20 z-30 self-center flex items-center gap-2 px-4 py-1.5 font-mono text-[11px] font-bold border shadow-lg animate-fade-up"
                    style={{ background: 'var(--color-brand-accent)', borderColor: 'rgba(63,255,139,0.40)', color: 'var(--color-brand-primary)' }}
                >
                    ↑ {pending.length} yeni gönderi
                </button>
            )}

            {/* ── Yeni tartışma çubuğu ── */}
            <div
                className="flex items-center gap-3 h-16 px-5 rounded-full cursor-pointer transition-all duration-200 hover:shadow-md"
                style={{ background: 'var(--color-navbar-bg)', border: '1px solid var(--color-border)' }}
                onClick={() => setShowModal(true)}
            >
                <AuthorAvatar username={user?.username ?? '?'} avatarUrl={user?.avatar_url} size={9} />
                <span className="flex-1 text-[15px]" style={{ color: 'var(--color-text-muted)' }}>
                    Yeni bir tartışma başlat veya iddia paylaş…
                </span>
                <button
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full text-[13.5px] font-bold transition-all duration-150 hover:scale-105 hover:shadow-md"
                    style={{ color: '#fff', background: 'var(--color-brand-primary)' }}
                    onClick={e => { e.stopPropagation(); setShowModal(true); }}
                >
                    <Plus className="w-3.5 h-3.5" /> Yeni
                </button>
            </div>

            {/* ── Tab bar ── */}
            {!category && !tag && (
                <div className="flex gap-6 border-b" style={BD}>
                    {[
                        { id: 'discover',  label: 'Keşfet',          Icon: Compass },
                        { id: 'following', label: 'Takip Edilenler', Icon: Users   },
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
                                className="flex items-center gap-1.5 pb-2.5 text-[14px] font-bold relative"
                                style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                            >
                                <TabIcon className="w-3.5 h-3.5" />
                                {tab.label}
                                {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: 'var(--color-brand-primary)' }} />}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Aktif filtreler ── */}
            {(category || tag) && (
                <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Filtre:</span>
                    {category && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n); }}
                            className="text-[12.5px] font-bold px-3 py-1 rounded-full transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-surface)' }}
                        >
                            {category} ✕
                        </button>
                    )}
                    {tag && (
                        <button
                            onClick={() => { const n = new URLSearchParams(searchParams); n.delete('tag'); setSearchParams(n); }}
                            className="text-[12.5px] font-bold px-3 py-1 rounded-full transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)', background: 'var(--color-bg-surface)' }}
                        >
                            #{tag} ✕
                        </button>
                    )}
                </div>
            )}

            {/* ── Thread listesi ── */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--color-bg-surface)' }} />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="py-16 text-center">
                    {activeTab === 'following' ? (
                        <>
                            <Users className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Takip listesi boş</p>
                            <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>Kullanıcı profillerinden takip edebilirsin</p>
                        </>
                    ) : (
                        <>
                            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                            <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Tartışma bulunamadı</p>
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
