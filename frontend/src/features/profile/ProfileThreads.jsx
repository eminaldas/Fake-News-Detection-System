import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    MessageSquare, ChevronLeft, ChevronRight,
    Pencil, Trash2, Check, X, ExternalLink,
    AlertTriangle, MessagesSquare,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

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

const STATUS_COLOR = {
    active:       'var(--color-brand-primary)',
    under_review: 'var(--color-accent-amber)',
    resolved:     'var(--color-accent-blue)',
};
const STATUS_LABEL = {
    active:       'AKTİF',
    under_review: 'İNCELEMEDE',
    resolved:     'ÇÖZÜLDÜ',
};

const CATEGORIES = ['haberler','teknoloji','kültür','spor','eğlence','bilim','ekonomi','genel'];

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return `${Math.floor(diff)}s`;
    if (diff < 3600)   return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}sa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ThreadRow({ thread, onUpdated, onDeleted }) {
    const [editing,   setEditing]   = useState(false);
    const [deleting,  setDeleting]  = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [editTitle, setEditTitle] = useState(thread.title);
    const [editCat,   setEditCat]   = useState(thread.category ?? '');

    const statusColor = STATUS_COLOR[thread.status] ?? STATUS_COLOR.active;
    const statusLabel = STATUS_LABEL[thread.status] ?? 'AKTİF';

    const handleSave = async () => {
        if (!editTitle.trim()) return;
        setSaving(true);
        try {
            await axiosInstance.put(`/forum/threads/${thread.id}`, {
                title:    editTitle.trim(),
                category: editCat || null,
            });
            onUpdated(thread.id, { title: editTitle.trim(), category: editCat || null });
            setEditing(false);
        } catch { /* sessiz */ }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axiosInstance.delete(`/forum/threads/${thread.id}`);
            onDeleted(thread.id);
        } catch { /* sessiz */ }
        finally { setDeleting(false); setConfirmDel(false); }
    };

    return (
        <div
            className="border-l-[3px] transition-colors"
            style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: statusColor + '60' }}
            onMouseEnter={e => e.currentTarget.style.borderLeftColor = statusColor}
            onMouseLeave={e => e.currentTarget.style.borderLeftColor = statusColor + '60'}
        >
            {editing ? (
                /* ── Düzenleme modu ── */
                <div className="p-4 flex flex-col gap-3">
                    <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-transparent outline-none font-mono text-sm px-3 py-2 border"
                        style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-text-primary)', background: 'var(--color-bg-base)' }}
                        placeholder="Başlık..."
                        maxLength={300}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={editCat}
                            onChange={e => setEditCat(e.target.value)}
                            className="bg-transparent border font-mono text-xs px-2 py-1.5 outline-none"
                            style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', background: 'var(--color-terminal-surface)' }}
                        >
                            <option value="">Kategori seç...</option>
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <span className="font-mono text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                            {editTitle.length}/300
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !editTitle.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 font-mono text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                            style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                        >
                            <Check className="w-3.5 h-3.5" />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                            onClick={() => { setEditing(false); setEditTitle(thread.title); setEditCat(thread.category ?? ''); }}
                            className="flex items-center gap-1.5 px-4 py-2 font-mono text-xs border transition-opacity hover:opacity-70"
                            style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                        >
                            <X className="w-3.5 h-3.5" /> İptal
                        </button>
                    </div>
                </div>
            ) : confirmDel ? (
                /* ── Silme onayı ── */
                <div className="p-4 flex items-center gap-3 flex-wrap">
                    <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#ef4444' }} />
                    <span className="font-mono text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        Bu tartışma kalıcı olarak silinecek. Emin misiniz?
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-1.5 font-mono text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                            style={{ background: '#ef4444', color: '#fff' }}
                        >
                            {deleting ? 'Siliniyor...' : 'Evet, Sil'}
                        </button>
                        <button
                            onClick={() => setConfirmDel(false)}
                            className="px-4 py-1.5 font-mono text-xs border transition-opacity hover:opacity-70"
                            style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                        >
                            İptal
                        </button>
                    </div>
                </div>
            ) : (
                /* ── Normal görünüm ── */
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Durum + Başlık */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {thread.category && (
                                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border shrink-0"
                                      style={{ color: 'var(--color-accent-blue)', borderColor: 'rgba(59,130,246,0.30)' }}>
                                    {thread.category}
                                </span>
                            )}
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border shrink-0"
                                  style={{ color: statusColor, borderColor: statusColor + '40' }}>
                                {statusLabel}
                            </span>
                        </div>
                        <Link
                            to={`/forum/${thread.id}`}
                            className="font-mono text-sm font-bold leading-snug transition-opacity hover:opacity-70 truncate"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {thread.title}
                        </Link>
                        <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {thread.comment_count ?? 0}
                            </span>
                            <span>{timeAgo(thread.created_at)}</span>
                        </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Link
                            to={`/forum/${thread.id}`}
                            className="p-2 transition-opacity hover:opacity-60"
                            title="Görüntüle"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                            onClick={() => setEditing(true)}
                            className="p-2 transition-opacity hover:opacity-70"
                            title="Düzenle"
                            style={{ color: 'var(--color-brand-primary)' }}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setConfirmDel(true)}
                            className="p-2 transition-opacity hover:opacity-70"
                            title="Sil"
                            style={{ color: '#ef4444', opacity: 0.7 }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const ProfileThreads = () => {
    const { user }    = useAuth();
    const [threads,   setThreads]   = useState([]);
    const [total,     setTotal]     = useState(0);
    const [page,      setPage]      = useState(1);
    const [loading,   setLoading]   = useState(true);
    const SIZE = 20;

    const load = useCallback((pg = 1) => {
        if (!user) return;
        setLoading(true);
        axiosInstance.get(`/users/${user.id}/threads`, { params: { page: pg, size: SIZE } })
            .then(({ data }) => {
                setThreads(data.items ?? []);
                setTotal(data.total ?? 0);
                setPage(pg);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    useEffect(() => { load(1); }, [load]);

    const handleUpdated = (id, changes) => {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    };

    const handleDeleted = (id) => {
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
                        // TARTIŞMALARIM
                    </span>
                    {total > 0 && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {total} tartışma
                        </span>
                    )}
                </div>

                {/* İçerik */}
                {loading ? (
                    <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        // yükleniyor...
                    </div>
                ) : threads.length === 0 ? (
                    <div className="p-12 flex flex-col items-center gap-4">
                        <MessagesSquare className="w-10 h-10 opacity-15" style={{ color: 'var(--color-text-muted)' }} />
                        <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            // henüz tartışma yok
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
                                <ThreadRow
                                    thread={t}
                                    onUpdated={handleUpdated}
                                    onDeleted={handleDeleted}
                                />
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
                            className="p-1.5 transition-opacity disabled:opacity-20 hover:opacity-60"
                        >
                            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => load(page + 1)}
                            disabled={page >= totalPages}
                            className="p-1.5 transition-opacity disabled:opacity-20 hover:opacity-60"
                        >
                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2 border-t flex justify-between" style={BD}>
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                        // THREAD_LOG
                    </span>
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>
                        24s düzenlenebilir
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProfileThreads;
