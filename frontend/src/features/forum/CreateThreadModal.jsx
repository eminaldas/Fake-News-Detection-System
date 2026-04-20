import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Link as LinkIcon } from 'lucide-react';
import axiosInstance from '../../api/axios';
import TagInput from './TagInput';

const CATEGORIES = [
    { value: '',           label: 'Kategori seç...' },
    { value: 'gündem',    label: 'Gündem'      },
    { value: 'ekonomi',   label: 'Ekonomi'     },
    { value: 'sağlık',    label: 'Sağlık'      },
    { value: 'teknoloji', label: 'Teknoloji'   },
    { value: 'spor',      label: 'Spor'        },
    { value: 'kültür',    label: 'Kültür'      },
    { value: 'yaşam',     label: 'Yaşam'       },
];

const CreateThreadModal = ({ onClose, articleId = null }) => {
    const navigate   = useNavigate();
    const firstInput = useRef(null);

    const [title,      setTitle]      = React.useState('');
    const [body,       setBody]       = React.useState('');
    const [category,   setCategory]   = React.useState('');
    const [tags,       setTags]       = React.useState([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [error,      setError]      = React.useState('');
    const [visible,    setVisible]    = React.useState(false);

    const handleClose = React.useCallback(() => {
        setVisible(false);
        setTimeout(onClose, 220);
    }, [onClose]);

    /* Mount → animasyon tetikle */
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 20);
        firstInput.current?.focus();
        return () => clearTimeout(t);
    }, []);

    /* Escape tuşu kapatır */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleClose]);

    /* Body scroll kilitle */
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            setError('Başlık ve açıklama zorunludur.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const { data } = await axiosInstance.post('/forum/threads', {
                title:      title.trim(),
                body:       body.trim(),
                category:   category || null,
                tag_names:  tags,
                article_id: articleId || null,
            });
            handleClose();
            navigate(`/forum/${data.id}`);
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Tartışma oluşturulamadı.');
            setSubmitting(false);
        }
    };

    const inputStyle = {
        background: 'var(--color-bg-base)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        borderRadius: '6px',
        outline: 'none',
    };

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[200] transition-all duration-200"
                style={{
                    background: visible ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
                    backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
                    WebkitBackdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
                }}
                onClick={handleClose}
            />

            {/* Modal container */}
            <div className="fixed inset-0 z-[201] flex items-start justify-center pt-28 px-4 pointer-events-none">
                <div
                    className="w-full max-w-xl pointer-events-auto flex flex-col overflow-hidden transition-all duration-220"
                    style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(16,185,129,0.08)',
                        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
                        opacity: visible ? 1 : 0,
                        maxHeight: '90vh',
                    }}
                >
                    {/* Başlık */}
                    <div
                        className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
                        style={{ borderColor: 'var(--color-border)', background: 'rgba(0,0,0,0.15)' }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-5 rounded-full" style={{ background: 'var(--color-brand-primary)' }} />
                            <h2 className="font-manrope font-black text-sm uppercase tracking-tight"
                                style={{ color: 'var(--color-text-primary)' }}>
                                Tartışma Başlat
                            </h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">

                        {/* Bağlı haber bandı */}
                        {articleId && (
                            <div className="mx-5 mt-4 flex items-center gap-3 p-3 rounded-lg"
                                 style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <p className="text-[11px] font-semibold flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    Haber ID: {articleId.slice(0, 12)}…
                                </p>
                            </div>
                        )}

                        {/* Başlık alanı */}
                        <div className="px-5 pt-4 pb-0">
                            <label className="block text-[9px] font-bold uppercase tracking-widest mb-2"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                Başlık <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                            </label>
                            <input
                                ref={firstInput}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={300}
                                placeholder="Tartışma başlığını yaz..."
                                className="w-full px-4 py-2.5 text-sm"
                                style={inputStyle}
                            />
                            <p className="text-[9px] mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
                                {title.length}/300
                            </p>
                        </div>

                        {/* Açıklama */}
                        <div className="px-5 pt-3 pb-0">
                            <label className="block text-[9px] font-bold uppercase tracking-widest mb-2"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                Açıklama <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                            </label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={4}
                                placeholder="Kanıtın veya sorununu detaylı açıkla..."
                                className="w-full px-4 py-2.5 text-sm resize-none leading-relaxed"
                                style={inputStyle}
                            />
                        </div>

                        {/* Kategori + Etiketler */}
                        <div className="px-5 pt-3 pb-0 flex gap-4">
                            <div className="w-40 flex-shrink-0">
                                <label className="block text-[9px] font-bold uppercase tracking-widest mb-2"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Kategori
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 text-[11px] cursor-pointer"
                                    style={inputStyle}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-0">
                                <label className="block text-[9px] font-bold uppercase tracking-widest mb-2"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Etiketler
                                    <span className="font-normal ml-1">(# ile, maks 10)</span>
                                </label>
                                <TagInput value={tags} onChange={setTags} category={category} />
                            </div>
                        </div>

                        {/* Footer: hata + butonlar */}
                        <div
                            className="flex items-center gap-3 px-5 py-4 mt-4 border-t flex-shrink-0"
                            style={{ borderColor: 'var(--color-border)', background: 'rgba(0,0,0,0.12)' }}
                        >
                            {error && (
                                <p className="text-[10px] flex-1" style={{ color: '#ff6b6b' }}>{error}</p>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 text-[11px] font-semibold rounded-lg transition-colors hover:bg-white/5"
                                    style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !title.trim() || !body.trim()}
                                    className="px-5 py-2 text-[11px] font-black rounded-lg transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
                                    style={{
                                        background: 'var(--color-brand-primary)',
                                        color: 'var(--color-bg-base)',
                                        boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
                                    }}
                                >
                                    {submitting ? 'Oluşturuluyor...' : 'Tartışmayı Başlat →'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>,
        document.body
    );
};

export default CreateThreadModal;
