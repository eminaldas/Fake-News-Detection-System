import React, { useState, useEffect, useCallback } from 'react';
import { Database, ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import axiosInstance from '../api/axios';

const STATUS_STYLE = {
    authentic:  { label: 'Doğru',    bg: 'rgba(16,185,129,0.12)',  color: '#3fff8b'  },
    fake:       { label: 'Yanlış',   bg: 'rgba(255,115,81,0.12)',  color: '#ff7351'  },
    unverified: { label: 'Belirsiz', bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b'  },
};

const AdminDataset = () => {
    const [items,        setItems]        = useState([]);
    const [total,        setTotal]        = useState(0);
    const [page,         setPage]         = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading,      setLoading]      = useState(true);
    const [acting,       setActing]       = useState(null);

    const PAGE_SIZE = 20;

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, size: PAGE_SIZE };
            if (statusFilter) params.status_filter = statusFilter;
            const res = await axiosInstance.get('/articles/', { params });
            setItems(res.data.items);
            setTotal(res.data.total);
        } catch (err) {
            console.error('Makaleler yüklenemedi:', err.message);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const classify = async (id, newStatus) => {
        setActing(id);
        try {
            const res = await axiosInstance.patch(`/admin/articles/${id}/classify`, { status: newStatus });
            setItems(prev => prev.map(a => a.id === id ? { ...a, status: res.data.status } : a));
        } catch (err) {
            console.error('Sınıflandırma hatası:', err.message);
        } finally {
            setActing(null);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Başlık */}
            <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
                <h1 className="text-xl font-bold text-tx-primary">Dataset Manager</h1>
                <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-brand-primary)' }}
                >
                    {total} makale
                </span>
            </div>

            {/* Filtre */}
            <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-tx-secondary">Filtre:</span>
                {['', 'authentic', 'fake', 'unverified'].map(s => (
                    <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className="text-xs px-3 py-1 rounded-full transition-colors"
                        style={{
                            background: statusFilter === s ? 'var(--color-brand-primary)' : 'var(--color-surface)',
                            color:      statusFilter === s ? '#070f12' : 'var(--color-text-secondary)',
                            border:     '1px solid var(--color-border)',
                        }}
                    >
                        {s === '' ? 'Tümü' : (STATUS_STYLE[s]?.label ?? s)}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-tx-secondary" />
                </div>
            ) : items.length === 0 ? (
                <p className="text-sm text-tx-secondary text-center py-16">Makale bulunamadı.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {items.map(article => {
                        const style    = STATUS_STYLE[article.status] ?? STATUS_STYLE.unverified;
                        const isActing = acting === article.id;
                        return (
                            <div
                                key={article.id}
                                className="rounded-xl border p-4 flex items-center gap-4"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-tx-primary truncate">
                                        {article.title.length > 80
                                            ? article.title.slice(0, 80) + '…'
                                            : article.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                            style={{ background: style.bg, color: style.color }}
                                        >
                                            {style.label}
                                        </span>
                                        {article.metadata_info?.source_name && (
                                            <span className="text-[10px] text-tx-secondary">
                                                {article.metadata_info.source_name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => classify(article.id, 'authentic')}
                                        disabled={isActing || article.status === 'authentic'}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                                        style={{ background: 'rgba(16,185,129,0.12)', color: '#3fff8b' }}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Doğru
                                    </button>
                                    <button
                                        onClick={() => classify(article.id, 'fake')}
                                        disabled={isActing || article.status === 'fake'}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                                        style={{ background: 'rgba(255,115,81,0.12)', color: '#ff7351' }}
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Yanlış
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sayfalama */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg disabled:opacity-30"
                        style={{ background: 'var(--color-surface)' }}
                    >
                        <ChevronLeft className="w-4 h-4 text-tx-primary" />
                    </button>
                    <span className="text-xs text-tx-secondary">{page} / {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg disabled:opacity-30"
                        style={{ background: 'var(--color-surface)' }}
                    >
                        <ChevronRight className="w-4 h-4 text-tx-primary" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminDataset;
