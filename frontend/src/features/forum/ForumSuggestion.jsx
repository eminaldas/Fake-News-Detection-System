import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ChevronRight } from 'lucide-react';
import axiosInstance from '../../api/axios';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

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
        <div className="relative border mt-4" style={TS}>
            {/* Başlık border'ı keser */}
            <span
                className="absolute -top-px left-4 px-2 font-mono text-[10px] tracking-widest uppercase"
                style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
            >
                // topluluk_tartışması
            </span>

            <div className="px-4 pt-5 pb-4">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2].map(i => (
                            <div key={i} className="h-8 animate-pulse border" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-terminal-border-raw)' }} />
                        ))}
                    </div>
                ) : threads.length > 0 ? (
                    <>
                        <p className="font-mono text-xs mb-3" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                            {threads.length} aktif tartışma
                        </p>
                        <div className="flex flex-col mb-3">
                            {threads.slice(0, 3).map((t, idx) => (
                                <Link
                                    key={t.id}
                                    to={`/forum/${t.id}`}
                                    className="flex items-center gap-3 py-2.5 border-l-2 border-transparent px-2 transition-colors group"
                                    onMouseEnter={e => e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
                                >
                                    <span
                                        className="font-mono text-[10px] font-black shrink-0"
                                        style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}
                                    >
                                        {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    <span
                                        className="font-mono text-sm flex-1 truncate group-hover:text-brand transition-colors"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {t.title}
                                    </span>
                                    <span className="flex items-center gap-1 font-mono text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                                        <MessageSquare className="w-3 h-3" />
                                        {t.comment_count}
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--color-brand-primary)' }} />
                                </Link>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t" style={BD}>
                            <Link
                                to={newThreadUrl}
                                className="flex items-center gap-1.5 font-mono text-xs px-3 py-2 border transition-opacity hover:opacity-80"
                                style={{ borderColor: 'rgba(16,185,129,0.30)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Yeni Tartışma
                            </Link>
                            {threads.length > 3 && (
                                <Link
                                    to={`/forum?article=${articleId}`}
                                    className="font-mono text-xs transition-opacity hover:opacity-70"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    tümünü gör ({threads.length})
                                </Link>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <p className="font-mono text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Bu haber henüz tartışılmadı.
                        </p>
                        <Link
                            to={newThreadUrl}
                            className="inline-flex items-center gap-2 px-4 py-2.5 font-mono text-sm font-bold tracking-wider transition-opacity hover:opacity-85"
                            style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                        >
                            <MessageSquare className="w-4 h-4" />
                            [ İLK TARTIŞMAYI BAŞLAT ]
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForumSuggestion;
