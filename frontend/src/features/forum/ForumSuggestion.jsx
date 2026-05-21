import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ArrowRight } from 'lucide-react';
import axiosInstance from '../../api/axios';

const BORDER = 'var(--color-terminal-border-raw)';
const BRAND  = 'var(--color-brand-primary)';

const ForumSuggestion = ({ articleId }) => {
    const [threads, setThreads] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

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
        <div className="mt-4 overflow-hidden"
             style={{ background: 'var(--color-bg-surface)', border: `1px solid ${BORDER}`, borderTop: `3px solid ${BRAND}` }}>

            {/* Başlık */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: BORDER }}>
                <div className="w-8 h-8 flex items-center justify-center shrink-0"
                     style={{ background: 'rgba(63,255,139,0.08)', border: '1px solid rgba(63,255,139,0.20)' }}>
                    <MessageSquare className="w-4 h-4" style={{ color: BRAND }} />
                </div>
                <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Topluluk Tartışması
                    </h3>
                    {!loading && threads.length > 0 && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {threads.length} aktif tartışma
                        </p>
                    )}
                </div>
                <Link
                    to={newThreadUrl}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(63,255,139,0.08)', color: BRAND, border: '1px solid rgba(63,255,139,0.25)' }}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Yeni
                </Link>
            </div>

            {/* İçerik */}
            <div className="px-5 py-4">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2].map(i => (
                            <div key={i} className="h-10 animate-pulse"
                                 style={{ background: 'var(--color-skeleton)' }} />
                        ))}
                    </div>
                ) : threads.length === 0 ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Bu haber henüz tartışılmadı. İlk tartışmayı sen başlat.
                        </p>
                        <Link
                            to={newThreadUrl}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-85"
                            style={{ background: BRAND, color: '#070f12' }}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Tartışma Başlat
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: BORDER }}>
                        {threads.slice(0, 3).map((t, idx) => (
                            <Link
                                key={t.id}
                                to={`/forum/${t.id}`}
                                className="flex items-center gap-3 py-3 group transition-colors"
                                style={{ textDecoration: 'none' }}
                            >
                                <span className="text-[11px] font-bold tabular-nums shrink-0 w-5 text-center"
                                      style={{ color: idx === 0 ? BRAND : 'var(--color-text-muted)' }}>
                                    {idx + 1}
                                </span>
                                <span className="flex-1 text-sm font-medium truncate transition-colors group-hover:text-brand"
                                      style={{ color: 'var(--color-text-primary)' }}>
                                    {t.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0"
                                     style={{ color: 'var(--color-text-muted)' }}>
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="text-[11px]">{t.comment_count}</span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                                            style={{ color: BRAND }} />
                            </Link>
                        ))}

                        {threads.length > 3 && (
                            <div className="pt-3">
                                <Link
                                    to={`/forum?article=${articleId}`}
                                    className="text-xs font-semibold transition-opacity hover:opacity-70 flex items-center gap-1"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    <ArrowRight className="w-3 h-3" />
                                    Tümünü gör ({threads.length} tartışma)
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForumSuggestion;
