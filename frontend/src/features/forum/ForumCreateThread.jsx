import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Link as LinkIcon, X } from 'lucide-react';
import axiosInstance from '../../api/axios';
import TagInput from './TagInput';

const CATEGORIES = [
    { value: '',           label: 'Kategori seç...' },
    { value: 'haberler',   label: 'Haberler' },
    { value: 'teknoloji',  label: 'Teknoloji' },
    { value: 'kültür',     label: 'Kültür' },
    { value: 'spor',       label: 'Spor' },
    { value: 'eğlence',    label: 'Eğlence' },
    { value: 'bilim',      label: 'Bilim' },
    { value: 'ekonomi',    label: 'Ekonomi' },
    { value: 'genel',      label: 'Genel' },
];

const ForumCreateThread = () => {
    const [searchParams] = useSearchParams();
    const navigate        = useNavigate();
    const articleId       = searchParams.get('article');

    const [article,    setArticle]    = React.useState(null);
    const [existing,   setExisting]   = React.useState([]);
    const [title,      setTitle]      = React.useState('');
    const [body,       setBody]       = React.useState('');
    const [category,   setCategory]   = React.useState('');
    const [tags,       setTags]       = React.useState([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [error,      setError]      = React.useState('');

    React.useEffect(() => {
        if (!articleId) return;
        axiosInstance.get(`/forum/articles/${articleId}/threads`)
            .then(r => {
                setExisting(r.data.items ?? []);
                // İlk thread'in article verisinden başlık/görsel/kaynak al
                const firstThread = r.data.items?.[0];
                if (firstThread?.article) setArticle(firstThread.article);
            })
            .catch(() => {});
        // news endpoint'inden article bilgisini çek
        axiosInstance.get(`/news/${articleId}`)
            .then(r => setArticle(r.data))
            .catch(() => {});
    }, [articleId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            setError('Başlık ve açıklama zorunludur.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                title:      title.trim(),
                body:       body.trim(),
                category:   category || null,
                tag_names:  tags,
                article_id: articleId || null,
            };
            const { data } = await axiosInstance.post('/forum/threads', payload);
            navigate(`/forum/${data.id}`);
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Tartışma oluşturulamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

            <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-tx-primary flex-1">Tartışma Oluştur</h1>
                <Link to="/forum" className="text-[11px] text-muted hover:text-tx-primary transition-colors">
                    ← Tartışmalara dön
                </Link>
            </div>

            {/* Bağlı haber bandı */}
            {articleId && (
                <div
                    className="flex items-center gap-3 p-3 border"
                    style={{ background: 'rgba(168,85,247,0.04)', borderColor: 'rgba(168,85,247,0.20)' }}
                >
                    {article?.image_url && (
                        <img
                            src={article.image_url}
                            alt=""
                            className="w-14 h-10 object-cover shrink-0"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                    )}
                    {!article?.image_url && (
                        <div
                            className="w-8 h-8 flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.20)' }}
                        >
                            <LinkIcon className="w-4 h-4" style={{ color: '#a855f7' }} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#a855f7', opacity: 0.7 }}>
                            Bağlı Haber
                        </p>
                        <p className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {article?.title ?? `Haber ID: ${articleId.slice(0, 8)}…`}
                        </p>
                        {article?.source_name && (
                            <p className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                {article.source_name}
                                {article.source_url && (
                                    <a
                                        href={article.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 transition-opacity hover:opacity-70"
                                        style={{ color: 'var(--color-accent-blue)' }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        ↗ kaynak
                                    </a>
                                )}
                            </p>
                        )}
                    </div>
                    <Link
                        to="/forum/new"
                        className="font-mono text-xs transition-opacity hover:opacity-60 shrink-0"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
                {/* Başlık */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-2">
                        Başlık <span style={{ color: 'var(--color-fake-text)' }}>*</span>
                    </label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={300}
                        placeholder="Tartışma başlığını yaz..."
                        className="w-full bg-transparent outline-none text-[13px] text-tx-primary placeholder:text-muted"
                    />
                    <p className="text-[9px] text-muted mt-1 text-right">{title.length}/300</p>
                </div>

                {/* Açıklama */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-2">
                        Açıklama / Sorun <span style={{ color: 'var(--color-fake-text)' }}>*</span>
                    </label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={5}
                        placeholder="Kanıtın veya sorununu detaylı açıkla..."
                        className="w-full bg-transparent resize-none outline-none text-[12px] text-tx-primary placeholder:text-muted leading-relaxed"
                    />
                </div>

                {/* Kategori + Etiketler */}
                <div className="p-4 border-b flex gap-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="w-40 shrink-0">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-2">
                            Kategori
                        </label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-transparent outline-none text-[11px] text-tx-primary border rounded-lg px-3 py-2 cursor-pointer"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-2">
                            Etiketler
                            <span className="text-[9px] font-normal text-muted ml-1">(# ile başlat, maks 10)</span>
                        </label>
                        <TagInput value={tags} onChange={setTags} category={category} />
                    </div>
                </div>

                {/* Hata + Gönder */}
                <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: 'var(--color-bg-base)' }}
                >
                    {error && (
                        <p className="text-[10px] flex-1" style={{ color: '#ff6b6b' }}>{error}</p>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <Link
                            to="/forum"
                            className="px-4 py-2 rounded-lg text-[11px] border transition-colors hover:text-tx-primary"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                        >
                            İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting || !title.trim() || !body.trim()}
                            className="px-4 py-2 rounded-lg text-[11px] font-bold disabled:opacity-40 transition-opacity"
                            style={{ background: 'var(--color-brand-primary)', color: 'var(--color-es-bg)' }}
                        >
                            {submitting ? 'Oluşturuluyor...' : 'Tartışmayı Başlat'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Mevcut tartışmalar uyarısı */}
            {articleId && existing.length > 0 && (
                <div
                    className="flex items-start gap-3 p-3 rounded-xl border"
                    style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}
                >
                    <span className="text-base shrink-0">💡</span>
                    <div className="flex-1">
                        <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--color-accent-amber)' }}>
                            Bu haber için zaten {existing.length} tartışma var
                        </p>
                        <p className="text-[9px] text-muted mb-2">
                            Yine de farklı bir açı getirmek istiyorsan devam edebilirsin.
                        </p>
                        <div className="flex flex-col gap-1">
                            {existing.slice(0, 3).map(t => (
                                <Link
                                    key={t.id}
                                    to={`/forum/${t.id}`}
                                    className="text-[10px] text-brand hover:underline truncate"
                                >
                                    {t.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ForumCreateThread;
