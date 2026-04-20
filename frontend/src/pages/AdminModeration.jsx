import React from 'react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminModeration() {
    const { user }      = useAuth();
    const navigate      = useNavigate();
    const [tab, setTab] = React.useState('comments');

    const [flaggedComments, setFlaggedComments] = React.useState([]);
    const [flaggedThreads,  setFlaggedThreads]  = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!user) return;
        if (user.role !== 'admin') { navigate('/forum'); return; }
        Promise.all([
            axiosInstance.get('/forum/admin/flagged-comments'),
            axiosInstance.get('/forum/admin/flagged-threads'),
        ])
        .then(([c, t]) => {
            setFlaggedComments(c.data);
            setFlaggedThreads(t.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user, navigate]);

    const approveComment = async (id) => {
        await axiosInstance.put(`/forum/admin/comments/${id}/approve`).catch(() => {});
        setFlaggedComments(prev => prev.filter(c => c.id !== id));
    };

    const removeComment = async (id) => {
        await axiosInstance.put(`/forum/admin/comments/${id}/remove`).catch(() => {});
        setFlaggedComments(prev => prev.filter(c => c.id !== id));
    };

    const resolveThread = async (id) => {
        await axiosInstance.put(`/forum/admin/threads/${id}/resolve`).catch(() => {});
        setFlaggedThreads(prev => prev.filter(t => t.id !== id));
    };

    const closeThread = async (id) => {
        await axiosInstance.put(`/forum/admin/threads/${id}/close`).catch(() => {});
        setFlaggedThreads(prev => prev.filter(t => t.id !== id));
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full animate-spin border-2 border-t-transparent"
                 style={{ borderColor: 'var(--color-brand-primary)' }} />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto py-6 flex flex-col gap-5">
            <h1 className="text-base font-black font-manrope" style={{ color: 'var(--color-text-primary)' }}>
                Moderasyon Paneli
            </h1>
            <div className="flex gap-2">
                {[
                    { key: 'comments', label: `Flagged Yorumlar (${flaggedComments.length})` },
                    { key: 'threads',  label: `İnceleme Altı Tartışmalar (${flaggedThreads.length})` },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={tab === t.key
                            ? { background: 'var(--color-brand-primary)', color: '#070f12' }
                            : { border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }
                        }
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'comments' && (
                <div className="flex flex-col gap-3">
                    {flaggedComments.length === 0 ? (
                        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>Flagged yorum yok.</p>
                    ) : flaggedComments.map(c => (
                        <div key={c.id} className="rounded-xl border p-4"
                            style={{ background: 'var(--color-bg-surface)', borderColor: 'rgba(245,158,11,0.30)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>@{c.username}</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                                    style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>
                                    {c.moderation_status}
                                </span>
                                {c.moderation_note && (
                                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>— {c.moderation_note}</span>
                                )}
                            </div>
                            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>{c.body}</p>
                            <div className="flex gap-2">
                                <button onClick={() => approveComment(c.id)}
                                    className="text-[10px] px-3 py-1.5 rounded-lg font-semibold"
                                    style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-brand-primary)' }}>
                                    Onayla
                                </button>
                                <button onClick={() => removeComment(c.id)}
                                    className="text-[10px] px-3 py-1.5 rounded-lg font-semibold"
                                    style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                                    Kaldır
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'threads' && (
                <div className="flex flex-col gap-3">
                    {flaggedThreads.length === 0 ? (
                        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>İnceleme altı tartışma yok.</p>
                    ) : flaggedThreads.map(t => (
                        <div key={t.id} className="rounded-xl border p-4"
                            style={{ background: 'var(--color-bg-surface)', borderColor: 'rgba(245,158,11,0.30)' }}>
                            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.title}</p>
                            <p className="text-[9px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
                                @{t.username} · 🚩{t.vote_suspicious} · ✅{t.vote_authentic}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => resolveThread(t.id)}
                                    className="text-[10px] px-3 py-1.5 rounded-lg font-semibold"
                                    style={{ background: 'rgba(59,130,246,0.10)', color: 'var(--color-accent-blue)' }}>
                                    Çözüldü İşaretle
                                </button>
                                <button onClick={() => closeThread(t.id)}
                                    className="text-[10px] px-3 py-1.5 rounded-lg font-semibold"
                                    style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
