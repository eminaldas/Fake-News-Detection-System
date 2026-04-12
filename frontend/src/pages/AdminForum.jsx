import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';

const FLAG_LABELS = {
    flagged_ai:   'AI Tespiti',
    flagged_user: 'Kullanıcı Bildirimi',
};

const AdminForum = () => {
    const [items,   setItems]   = useState([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(true);
    const [acting,  setActing]  = useState(null);

    const PAGE_SIZE = 20;

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/forum/queue?page=${page}&size=${PAGE_SIZE}`);
            setItems(res.data.items);
            setTotal(res.data.total);
        } catch (err) {
            console.error('Kuyruk yüklenemedi:', err.message);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    const approve = async (id) => {
        setActing(id);
        try {
            await axiosInstance.post(`/admin/forum/comments/${id}/approve`);
            await fetchQueue();
        } finally { setActing(null); }
    };

    const remove = async (id) => {
        setActing(id);
        try {
            await axiosInstance.post(`/admin/forum/comments/${id}/remove`);
            await fetchQueue();
        } finally { setActing(null); }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6" style={{ color: 'var(--color-brand)' }} />
                <h1 className="text-xl font-bold text-tx-primary">Forum Moderasyon Kuyruğu</h1>
                <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'rgba(255,115,81,0.15)', color: '#ff7351' }}>
                    {total} bekliyor
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-tx-secondary" />
                </div>
            ) : items.length === 0 ? (
                <p className="text-tx-secondary text-sm text-center py-12">Kuyruk boş.</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map(item => (
                        <div key={item.id}
                             className="rounded-xl border p-4"
                             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-tx-primary">{item.author}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                            {FLAG_LABELS[item.flag_type] || item.flag_type}
                                        </span>
                                        {item.report_count > 0 && (
                                            <span className="text-[10px] text-tx-secondary">
                                                {item.report_count} bildirim
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-tx-secondary truncate mb-1">
                                        Thread: {item.thread_title}
                                    </p>
                                    <p className="text-sm text-tx-primary line-clamp-2">{item.body}</p>
                                    {item.moderation_note && (
                                        <p className="text-[10px] text-amber-400 mt-1 italic">
                                            AI: {item.moderation_note}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => approve(item.id)}
                                        disabled={acting === item.id}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                                        style={{ background: 'rgba(63,255,139,0.15)', color: '#3fff8b' }}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Onayla
                                    </button>
                                    <button
                                        onClick={() => remove(item.id)}
                                        disabled={acting === item.id}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                                        style={{ background: 'rgba(255,115,81,0.15)', color: '#ff7351' }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Kaldır
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-6">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg disabled:opacity-30"
                            style={{ background: 'var(--color-surface)' }}>
                        <ChevronLeft className="w-4 h-4 text-tx-primary" />
                    </button>
                    <span className="text-xs text-tx-secondary">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg disabled:opacity-30"
                            style={{ background: 'var(--color-surface)' }}>
                        <ChevronRight className="w-4 h-4 text-tx-primary" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminForum;
