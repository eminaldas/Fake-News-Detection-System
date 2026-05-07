import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MessageSquare } from 'lucide-react';
import axiosInstance from '../../api/axios';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return `${Math.floor(diff)}S`;
    if (diff < 3600)   return `${Math.floor(diff / 60)}DK`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}SA`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}G`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const palBg   = ['rgba(16,185,129,0.15)','rgba(59,130,246,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(168,85,247,0.15)'];
const palText = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

function BookmarkRow({ thread, onRemove }) {
    const [removing, setRemoving] = useState(false);
    const username = thread.author?.username ?? '';
    const idx = (username.charCodeAt(0) ?? 0) % palBg.length;

    const handleRemove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setRemoving(true);
        try {
            await axiosInstance.post(`/forum/threads/${thread.id}/bookmark`);
            onRemove(thread.id);
        } catch {
            setRemoving(false);
        }
    };

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 border-l-2 transition-colors group"
            style={{
                ...BD,
                borderLeftColor: 'var(--color-brand-primary)40',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)40'; }}
        >
            {/* Avatar */}
            <div
                className="w-7 h-7 flex items-center justify-center font-mono font-black text-xs shrink-0"
                style={{ background: palBg[idx], color: palText[idx], border: `1px solid ${palText[idx]}30` }}
            >
                {(username || '?')[0].toUpperCase()}
            </div>

            {/* Başlık */}
            <Link
                to={`/forum/${thread.id}`}
                className="flex-1 min-w-0 font-mono text-sm truncate transition-colors hover:text-brand"
                style={{ color: 'var(--color-text-primary)' }}
                onClick={e => e.stopPropagation()}
            >
                {thread.title}
            </Link>

            {/* Kategori */}
            {thread.category && (
                <span
                    className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border shrink-0"
                    style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}
                >
                    {thread.category}
                </span>
            )}

            {/* Yorum sayısı */}
            <span
                className="flex items-center gap-1 font-mono text-[10px] shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
            >
                <MessageSquare className="w-3 h-3" />
                {thread.comment_count ?? 0}
            </span>

            {/* Zaman */}
            <span
                className="font-mono text-[10px] shrink-0"
                style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
            >
                {timeAgo(thread.created_at)}
            </span>

            {/* Kaldır */}
            <button
                onClick={handleRemove}
                disabled={removing}
                className="shrink-0 p-1 transition-opacity disabled:opacity-30 hover:opacity-60"
                title="Kaydı kaldır"
            >
                <Bookmark
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--color-brand-primary)' }}
                    fill="currentColor"
                />
            </button>
        </div>
    );
}

const ProfileBookmarks = () => {
    const [threads,  setThreads]  = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const SIZE = 20;

    const load = useCallback((pg = 1) => {
        setLoading(true);
        setError(null);
        axiosInstance.get('/forum/bookmarks/me', { params: { page: pg, size: SIZE } })
            .then(({ data }) => {
                setThreads(data.items ?? []);
                setTotal(data.total ?? 0);
                setPage(pg);
            })
            .catch(() => setError('Kaydedilenler yüklenemedi.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(1); }, [load]);

    const handleRemove = (id) => {
        setThreads(prev => prev.filter(t => t.id !== id));
        setTotal(prev => prev - 1);
    };

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div className="space-y-5">
            <div className="relative border overflow-hidden" style={S}>
                <Corner />

                {/* Başlık */}
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                        // KAYDEDİLENLER
                    </span>
                    {total > 0 && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {total} kayıt
                        </span>
                    )}
                </div>

                {/* İçerik */}
                {loading ? (
                    <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        // yükleniyor...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {error}
                    </div>
                ) : threads.length === 0 ? (
                    <div className="p-12 flex flex-col items-center gap-4">
                        <Bookmark className="w-10 h-10 opacity-15" style={{ color: 'var(--color-text-muted)' }} />
                        <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // kayıtlı tartışma yok
                        </p>
                        <Link
                            to="/forum"
                            className="font-mono text-xs font-bold tracking-wider transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            [ FORUMA GİT ]
                        </Link>
                    </div>
                ) : (
                    <div>
                        {threads.map((t, idx) => (
                            <div
                                key={t.id}
                                className={idx < threads.length - 1 ? 'border-b' : ''}
                                style={BD}
                            >
                                <BookmarkRow thread={t} onRemove={handleRemove} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Sayfalama */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t flex items-center justify-between" style={BD}>
                        <button
                            onClick={() => load(page - 1)}
                            disabled={page <= 1}
                            className="font-mono text-xs font-bold tracking-wider border px-4 py-1.5 disabled:opacity-20 transition-opacity hover:opacity-70"
                            style={{ ...BD, color: 'var(--color-text-primary)' }}
                        >
                            ← ÖNCEKİ
                        </button>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => load(page + 1)}
                            disabled={page >= totalPages}
                            className="font-mono text-xs font-bold tracking-wider border px-4 py-1.5 disabled:opacity-20 transition-opacity hover:opacity-70"
                            style={{ ...BD, color: 'var(--color-text-primary)' }}
                        >
                            SONRAKİ →
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2 border-t flex justify-between" style={BD}>
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                        // BOOKMARK_LOG
                    </span>
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>
                        v1.0
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProfileBookmarks;
