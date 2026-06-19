import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Link as LinkIcon, X } from 'lucide-react';
import axiosInstance from '../../api/axios';

const CATEGORIES = [
    { value: '',          label: 'Kategori seç...' },
    { value: 'haberler',  label: 'Haberler'  },
    { value: 'teknoloji', label: 'Teknoloji' },
    { value: 'kültür',    label: 'Kültür'    },
    { value: 'spor',      label: 'Spor'      },
    { value: 'eğlence',   label: 'Eğlence'   },
    { value: 'bilim',     label: 'Bilim'     },
    { value: 'ekonomi',   label: 'Ekonomi'   },
    { value: 'genel',     label: 'Genel'     },
];

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const ForumCreateThread = () => {
    const [searchParams] = useSearchParams();
    const navigate        = useNavigate();
    const articleId       = searchParams.get('article');

    const [article,    setArticle]    = React.useState(null);
    const [existing,   setExisting]   = React.useState([]);
    const [title,      setTitle]      = React.useState('');
    const [body,       setBody]       = React.useState('');
    const [category,   setCategory]   = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [error,      setError]      = React.useState('');

    React.useEffect(() => {
        if (!articleId) return;
        axiosInstance.get(`/forum/articles/${articleId}/threads`)
            .then(r => {
                setExisting(r.data.items ?? []);
                const firstThread = r.data.items?.[0];
                if (firstThread?.article) setArticle(firstThread.article);
            })
            .catch(() => {});
        axiosInstance.get(`/news/${articleId}`)
            .then(r => setArticle(r.data))
            .catch(() => {});
    }, [articleId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) { setError('Başlık zorunludur.'); return; }
        if (title.trim().length < 3) { setError('Başlık en az 3 karakter olmalı.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const { data } = await axiosInstance.post('/forum/threads', {
                title:      title.trim(),
                body:       body.trim() || '',
                category:   category || null,
                tag_names:  [],
                article_id: articleId || null,
            });
            navigate(`/forum/${data.id}`);
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Tartışma oluşturulamadı.');
            setSubmitting(false);
        }
    };

    const canSubmit = title.trim().length >= 3 && !submitting;

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

            {/* Üst bant */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold tracking-widest uppercase"
                      style={{ color: 'var(--color-brand-primary)' }}>
                </span>
                <div className="flex-1 h-px opacity-30" style={{ background: 'var(--color-terminal-border-raw)' }} />
                <Link to="/forum"
                      className="font-mono text-xs transition-opacity hover:opacity-60"
                      style={{ color: 'var(--color-text-muted)' }}>
                    ← foruma dön
                </Link>
            </div>

            {/* Bağlı haber bandı */}
            {articleId && (
                <div className="flex items-center gap-3 p-3 border"
                     style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.25)' }}>
                    {article?.image_url ? (
                        <img src={article.image_url} alt=""
                             className="w-14 h-10 object-cover shrink-0"
                             onError={e => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                        <div className="w-7 h-7 flex items-center justify-center shrink-0"
                             style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
                            <LinkIcon className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-primary)' }} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5"
                           style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }}>
                            Bağlı Haber
                        </p>
                        <p className="font-mono text-xs font-semibold truncate"
                           style={{ color: 'var(--color-text-primary)' }}>
                            {article?.title ?? `Haber ID: ${articleId.slice(0, 8)}…`}
                        </p>
                        {article?.source_name && (
                            <p className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                {article.source_name}
                                {article.source_url && (
                                    <a href={article.source_url} target="_blank" rel="noopener noreferrer"
                                       className="ml-2 transition-opacity hover:opacity-70"
                                       style={{ color: 'var(--color-accent-blue)' }}
                                       onClick={e => e.stopPropagation()}>
                                        ↗ kaynak
                                    </a>
                                )}
                            </p>
                        )}
                    </div>
                    <Link to="/forum/new"
                          className="font-mono text-xs transition-opacity hover:opacity-60 shrink-0"
                          style={{ color: 'var(--color-text-muted)' }}>
                        <X className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {/* Mevcut tartışma uyarısı */}
            {articleId && existing.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-2.5 border"
                     style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.20)' }}>
                    <span className="font-mono text-xs shrink-0" style={{ color: 'var(--color-accent-amber)' }}>!</span>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-accent-amber)' }}>
                        Bu haber için {existing.length} tartışma mevcut —{' '}
                        <Link to={`/forum?article=${articleId}`}
                              className="underline transition-opacity hover:opacity-70">
                            görüntüle
                        </Link>
                    </p>
                </div>
            )}

            {/* Form kutusu */}
            <div className="relative border overflow-hidden" style={TS}>
                {/* Köşe aksanları */}
                <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

                <form onSubmit={handleSubmit} className="flex flex-col">

                    {/* Başlık */}
                    <div className="px-4 pt-4 pb-3 border-b" style={BD}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-mono text-[9px] font-bold uppercase tracking-widest"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                Başlık <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                            </label>
                            <span className="font-mono text-[9px]"
                                  style={{ color: title.length > 0 && title.length < 3 ? '#ff6b6b' : 'var(--color-text-muted)' }}>
                                {title.length}/300
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm shrink-0"
                                  style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                            <input
                                autoFocus
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={300}
                                placeholder="tartışma başlığını yaz..."
                                className="flex-1 bg-transparent outline-none font-mono text-sm"
                                style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                            />
                        </div>
                    </div>

                    {/* Açıklama */}
                    <div className="px-4 pt-3 pb-3 border-b" style={BD}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-mono text-[9px] font-bold uppercase tracking-widest"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                Açıklama
                                <span className="font-normal ml-1 opacity-60">(isteğe bağlı)</span>
                            </label>
                            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                {body.length}/10000
                            </span>
                        </div>
                        <div className="flex gap-2 items-start">
                            <span className="font-mono text-sm shrink-0 mt-0.5"
                                  style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={5}
                                maxLength={10000}
                                placeholder="kanıtını veya sorununu açıkla..."
                                className="flex-1 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed"
                                style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                            />
                        </div>
                    </div>

                    {/* Kategori */}
                    <div className="px-4 pt-3 pb-3 border-b" style={BD}>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest mb-2"
                               style={{ color: 'var(--color-text-muted)' }}>
                            Kategori
                        </label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-3 py-2 font-mono text-[11px] cursor-pointer border outline-none"
                            style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 px-4 py-3"
                         style={{ background: 'rgba(0,0,0,0.18)' }}>
                        {error
                            ? <p className="font-mono text-[10px] flex-1 leading-relaxed" style={{ color: '#ff6b6b' }}>{error}</p>
                            : <span className="flex-1" />
                        }
                        <div className="flex gap-2 shrink-0">
                            <Link to="/forum"
                                  className="px-4 py-2 font-mono text-[11px] font-semibold border transition-opacity hover:opacity-60"
                                  style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                [ İPTAL ]
                            </Link>
                            <button type="submit" disabled={!canSubmit}
                                    className="px-4 py-2 font-mono text-[11px] font-bold transition-opacity hover:opacity-80 disabled:opacity-30"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                                {submitting ? '[ OLUŞTURULUYOR... ]' : '[ BAŞLAT ]'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

        </div>
    );
};

export default ForumCreateThread;
