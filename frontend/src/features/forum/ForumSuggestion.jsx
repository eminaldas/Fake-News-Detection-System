import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, Plus } from 'lucide-react';
import axiosInstance from '../../api/axios';

/**
 * Analiz sonucu ekranında gösterilen forum öneri componenti.
 *
 * Props:
 *   articleId  — bağlı article UUID (varsa); yoksa sadece "Tartışma Başlat" CTA gösterilir
 */
const ForumSuggestion = ({ articleId }) => {
    const [threads,  setThreads]  = React.useState([]);
    const [loading,  setLoading]  = React.useState(false);

    React.useEffect(() => {
        if (!articleId) return;
        setLoading(true);
        axiosInstance.get(`/forum/articles/${articleId}/threads`)
            .then(r => setThreads(r.data.items ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [articleId]);

    const newThreadUrl = articleId ? `/forum/new?article=${articleId}` : '/forum/new';

    return (
        <div
            className="mt-4 rounded-xl border p-4"
            style={{
                background:  'rgba(63,255,139,0.03)',
                borderColor: 'rgba(63,255,139,0.12)',
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
                <span className="text-[12px] font-bold text-tx-primary">Topluluk Tartışması</span>
            </div>

            {loading ? (
                <div className="h-10 animate-pulse rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)' }} />
            ) : threads.length > 0 ? (
                <>
                    <p className="text-[10px] text-muted mb-2">
                        Bu haber için <span className="text-tx-primary font-semibold">{threads.length}</span> aktif tartışma var
                    </p>
                    <div className="flex flex-col gap-1.5 mb-3">
                        {threads.slice(0, 3).map(t => (
                            <Link
                                key={t.id}
                                to={`/forum/${t.id}`}
                                className="flex items-center justify-between gap-2 group"
                            >
                                <span className="text-[11px] text-muted group-hover:text-tx-primary transition-colors truncate flex-1">
                                    {t.title}
                                </span>
                                <span className="text-[9px] text-muted flex-shrink-0 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    {t.comment_count}
                                    <ArrowRight className="w-3 h-3 ml-1 group-hover:text-brand transition-colors" />
                                </span>
                            </Link>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to={newThreadUrl}
                            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border transition-colors hover:text-tx-primary"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                        >
                            <Plus className="w-3 h-3" />
                            Farklı bir açıdan tartışma başlat
                        </Link>
                        {threads.length > 3 && (
                            <Link
                                to={`/forum?article=${articleId}`}
                                className="text-[10px] text-brand hover:underline"
                            >
                                Tümünü gör ({threads.length})
                            </Link>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <p className="text-[10px] text-muted mb-3">
                        Bu haber henüz tartışılmadı. İlk tartışmayı sen başlat!
                    </p>
                    <Link
                        to={newThreadUrl}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-opacity hover:opacity-85"
                        style={{ background: 'var(--color-brand)', color: '#070f12' }}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Bu Konuda İlk Tartışmayı Başlat
                    </Link>
                </>
            )}
        </div>
    );
};

export default ForumSuggestion;
