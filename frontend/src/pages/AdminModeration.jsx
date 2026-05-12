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

    const [reports,      setReports]      = React.useState([]);
    const [reportsTotal, setReportsTotal] = React.useState(0);
    const [replyModal,   setReplyModal]   = React.useState(null);
    const [replyText,    setReplyText]    = React.useState('');
    const [replyStatus,  setReplyStatus]  = React.useState('resolved');
    const [replySaving,  setReplySaving]  = React.useState(false);

    React.useEffect(() => {
        if (!user) return;
        if (user.role !== 'admin') { navigate('/forum'); return; }
        Promise.all([
            axiosInstance.get('/forum/admin/flagged-comments'),
            axiosInstance.get('/forum/admin/flagged-threads'),
            axiosInstance.get('/reports/admin?size=50'),
        ])
        .then(([c, t, r]) => {
            setFlaggedComments(c.data);
            setFlaggedThreads(t.data);
            setReports(r.data.items || []);
            setReportsTotal(r.data.total || 0);
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

    const submitReply = async () => {
        if (!replyModal) return;
        setReplySaving(true);
        try {
            await axiosInstance.post(`/reports/admin/${replyModal.id}/reply`, {
                reply:  replyText.trim(),
                status: replyStatus,
            });
            setReports(prev => prev.map(r =>
                r.id === replyModal.id
                    ? { ...r, status: replyStatus, admin_reply: replyText.trim() || r.admin_reply }
                    : r
            ));
            setReplyModal(null);
            setReplyText('');
        } catch {
            // sessizce başarısız
        } finally {
            setReplySaving(false);
        }
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
                    { key: 'reports',  label: `Raporlar (${reportsTotal})` },
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

            {tab === 'reports' && (
                <div className="flex flex-col gap-3">
                    {reports.length === 0 ? (
                        <p className="text-sm text-center py-12 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                            Rapor yok.
                        </p>
                    ) : reports.map(r => {
                        const statusColor = r.status === 'open' ? '#f59e0b' : r.status === 'in_review' ? '#3b82f6' : '#10b981';
                        const typeLabels = { fake_news: 'Sahte Haber', bug: 'Hata', complaint: 'Şikayet', other: 'Diğer' };
                        return (
                            <div key={r.id} className="border p-4 flex flex-col gap-2"
                                 style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[10px] px-2 py-0.5 font-black uppercase"
                                          style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                                        {r.status}
                                    </span>
                                    <span className="font-mono text-[10px] px-2 py-0.5"
                                          style={{ background: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                                        {typeLabels[r.type] || r.type}
                                    </span>
                                    <span className="font-mono text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                                        @{r.reporter_username} · {new Date(r.created_at).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                                <p className="font-mono text-sm font-bold text-tx-primary">{r.subject}</p>
                                <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                    {r.description.slice(0, 200)}{r.description.length > 200 ? '...' : ''}
                                </p>
                                {r.url_or_ref && (
                                    <a href={r.url_or_ref} target="_blank" rel="noopener noreferrer"
                                       className="font-mono text-[10px] truncate hover:opacity-70" style={{ color: 'var(--color-brand-primary)' }}>
                                        {r.url_or_ref}
                                    </a>
                                )}
                                {r.admin_reply && (
                                    <p className="font-mono text-xs px-3 py-2 border-l-2"
                                       style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-text-secondary)', background: 'rgba(16,185,129,0.04)' }}>
                                        <span style={{ color: 'var(--color-brand-primary)' }}>Admin: </span>{r.admin_reply}
                                    </p>
                                )}
                                <button
                                    onClick={() => { setReplyModal(r); setReplyText(r.admin_reply || ''); setReplyStatus(r.status); }}
                                    className="self-start font-mono text-[10px] px-4 py-1.5 border transition-opacity hover:opacity-70"
                                    style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                                    İncele / Yanıtla
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {replyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                     style={{ background: 'rgba(0,0,0,0.7)' }}
                     onClick={e => { if (e.target === e.currentTarget) setReplyModal(null); }}>
                    <div className="w-full max-w-lg border flex flex-col gap-4 p-6"
                         style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' }}>
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-brand-primary)' }}>
                                // RAPOR_YANITI
                            </p>
                            <p className="font-mono text-base font-black text-tx-primary">{replyModal.subject}</p>
                            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                @{replyModal.reporter_username} · {replyModal.reporter_email}
                            </p>
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)' }}>Durum</label>
                            <select value={replyStatus} onChange={e => setReplyStatus(e.target.value)}
                                    className="w-full border px-3 py-2 font-mono text-sm"
                                    style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
                                <option value="open">Açık</option>
                                <option value="in_review">İnceleniyor</option>
                                <option value="resolved">Çözüldü</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                Yanıt <span style={{ opacity: 0.5 }}>(opsiyonel — boşsa mail gönderilmez)</span>
                            </label>
                            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                                      rows={4} placeholder="Kullanıcıya gönderilecek yanıt..."
                                      className="w-full border px-3 py-2 font-mono text-sm resize-y"
                                      style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }} />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setReplyModal(null)} className="font-mono text-xs px-4 py-2 border"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                                İptal
                            </button>
                            <button disabled={replySaving} onClick={submitReply}
                                    className="font-mono text-xs px-5 py-2 font-black disabled:opacity-50"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                                {replySaving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
