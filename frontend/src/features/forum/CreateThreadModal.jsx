import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Link as LinkIcon, CornerDownLeft } from 'lucide-react';
import axiosInstance from '../../api/axios';

const CATEGORIES = [
    { value: '',           label: 'Kategori seç...' },
    { value: 'haberler',  label: 'Haberler'    },
    { value: 'teknoloji', label: 'Teknoloji'   },
    { value: 'kültür',    label: 'Kültür'      },
    { value: 'spor',      label: 'Spor'        },
    { value: 'eğlence',   label: 'Eğlence'     },
    { value: 'bilim',     label: 'Bilim'       },
    { value: 'ekonomi',   label: 'Ekonomi'     },
    { value: 'genel',     label: 'Genel'       },
];

const BD    = { borderColor: 'var(--color-terminal-border-raw)' };
const BRAND = 'var(--color-brand-primary)';
const soft  = (v, pct) => `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;

const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

function extractError(err) {
    const detail = err?.response?.data?.detail;
    if (!detail) return 'Tartışma oluşturulamadı.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        return first?.msg ?? first?.message ?? 'Doğrulama hatası, lütfen alanları kontrol et.';
    }
    return 'Tartışma oluşturulamadı.';
}

const CreateThreadModal = ({ onClose, articleId = null, articleTitle: propTitle = null }) => {
    const navigate   = useNavigate();
    const titleRef   = useRef(null);

    const [title,      setTitle]      = React.useState('');
    const [body,       setBody]       = React.useState('');
    const [category,   setCategory]   = React.useState('');
    const [postType,   setPostType]   = React.useState('iddia');
    const [submitting, setSubmitting] = React.useState(false);
    const [error,      setError]      = React.useState('');
    const [visible,    setVisible]    = React.useState(false);
    const [suggestion, setSuggestion] = React.useState(propTitle || '');

    useEffect(() => {
        if (propTitle) { setSuggestion(propTitle); return; }
        if (!articleId) return;
        axiosInstance.get(`/news/${articleId}`)
            .then(r => { if (r.data?.title) setSuggestion(r.data.title); })
            .catch(() => {});
    }, [articleId, propTitle]);

    const handleClose = React.useCallback(() => {
        setVisible(false);
        setTimeout(onClose, 200);
    }, [onClose]);

    useEffect(() => {
        const t = setTimeout(() => { setVisible(true); titleRef.current?.focus(); }, 20);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Tab' && suggestion && !title) {
            e.preventDefault();
            setTitle(suggestion);
            setTimeout(() => {
                const inp = titleRef.current;
                if (inp) inp.setSelectionRange(inp.value.length, inp.value.length);
            }, 0);
        }
    };

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
                post_type:  postType,
                tag_names:  [],
                article_id: articleId || null,
                image_urls: [],
            });
            handleClose();
            navigate(`/forum/${data.id}`);
        } catch (err) {
            setError(extractError(err));
            setSubmitting(false);
        }
    };

    const canSubmit = title.trim().length >= 3 && !submitting;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-9999"
                style={{
                    background:           visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                    backdropFilter:       visible ? 'blur(4px)' : 'blur(0px)',
                    WebkitBackdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
                    transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
                }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-10000 flex items-center justify-center px-4 py-6 pointer-events-none">
                <div
                    className="w-full max-w-xl pointer-events-auto flex flex-col overflow-hidden relative"
                    style={{
                        background: 'var(--color-terminal-surface)',
                        boxShadow:  '0 24px 64px rgba(0,0,0,0.35)',
                        transform:  visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
                        opacity:    visible ? 1 : 0,
                        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                        maxHeight:  '86vh',
                    }}
                >
                    <Corner />
                    {/* Header */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b shrink-0" style={BD}>
                        <div className="w-9 h-9 flex items-center justify-center shrink-0"
                             style={{ background: soft('--color-brand-primary', 12) }}>
                            <MessageSquare className="w-4 h-4" style={{ color: BRAND }} />
                        </div>
                        <span className="text-[16px] font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                            Tartışma Başlat
                        </span>
                        <button onClick={handleClose}
                                className="p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: 'var(--color-text-muted)' }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">

                        {/* Bağlı haber bandı */}
                        {articleId && suggestion && (
                            <div className="mx-6 mt-5 flex items-start gap-3 px-4 py-3"
                                 style={{ background: soft('--color-brand-primary', 8) }}>
                                <LinkIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: BRAND }} />
                                <p className="text-[13px] flex-1 leading-snug"
                                   style={{ color: 'var(--color-text-secondary)' }}>
                                    {suggestion}
                                </p>
                            </div>
                        )}

                        {/* Başlık */}
                        <div className="px-6 pt-5 pb-5 border-b" style={BD}>
                            <div className="flex items-center justify-between mb-2.5">
                                <label className="text-[12px] font-bold uppercase tracking-wider"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Başlık <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                                </label>
                                <span className="text-[11px] font-semibold"
                                      style={{ color: title.length > 0 && title.length < 3 ? 'var(--color-fake-fill)' : 'var(--color-text-muted)' }}>
                                    {title.length}/300
                                </span>
                            </div>

                            <input
                                ref={titleRef}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                onKeyDown={handleTitleKeyDown}
                                maxLength={300}
                                placeholder={suggestion ? 'Başlık yaz veya Tab ile önerilen başlığı kullan…' : 'Tartışma başlığını yaz…'}
                                className="w-full bg-transparent outline-none text-[15px]"
                                style={{
                                    color:        'var(--color-text-primary)',
                                    caretColor:   BRAND,
                                    padding:      '8px 0',
                                    borderBottom: `2px solid ${title ? BRAND : 'var(--color-border)'}`,
                                    transition:   'border-color 0.2s',
                                }}
                            />

                            {/* Tab öneri ipucu */}
                            {suggestion && !title && (
                                <div className="flex items-center gap-2 mt-2.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
                                          style={{ background: 'var(--color-bg-surface-solid)', color: 'var(--color-text-muted)' }}>
                                        Tab ↹
                                    </span>
                                    <span className="text-[12px] truncate max-w-75" style={{ color: 'var(--color-text-muted)' }}>
                                        {suggestion.length > 60 ? suggestion.slice(0, 60) + '…' : suggestion}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Açıklama */}
                        <div className="px-6 pt-5 pb-5 border-b" style={BD}>
                            <div className="flex items-center justify-between mb-2.5">
                                <label className="text-[12px] font-bold uppercase tracking-wider"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Açıklama
                                    <span className="ml-1.5 font-medium normal-case" style={{ opacity: 0.6 }}>(isteğe bağlı)</span>
                                </label>
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                                    {body.length}/10000
                                </span>
                            </div>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={3}
                                maxLength={10000}
                                placeholder="Kanıtını veya görüşünü yaz…"
                                className="w-full bg-transparent resize-none outline-none text-[14.5px] leading-relaxed"
                                style={{ color: 'var(--color-text-primary)', caretColor: BRAND }}
                            />
                        </div>

                        {/* Gönderi türü + Kategori — yan yana */}
                        <div className="px-6 pt-5 pb-5 border-b flex gap-4" style={BD}>
                            <div className="flex-1">
                                <label className="block text-[12px] font-bold uppercase tracking-wider mb-2.5"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Tür
                                </label>
                                <div className="flex gap-1.5">
                                    {[
                                        { value: 'iddia',    label: 'İddia' },
                                        { value: 'soru',     label: 'Soru' },
                                        { value: 'tartisma', label: 'Tartışma' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPostType(opt.value)}
                                            className="flex-1 py-2 text-[12.5px] font-bold transition-all duration-150 border"
                                            style={{
                                                color:       postType === opt.value ? BRAND : 'var(--color-text-muted)',
                                                background:  postType === opt.value ? soft('--color-brand-primary', 12) : 'var(--color-bg-surface-solid)',
                                                borderColor: postType === opt.value ? BRAND : 'var(--color-terminal-border-raw)',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="block text-[12px] font-bold uppercase tracking-wider mb-2.5"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Kategori
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 text-[12.5px] font-semibold cursor-pointer outline-none border"
                                    style={{ background: 'var(--color-bg-surface-solid)', color: 'var(--color-text-primary)', borderColor: 'var(--color-terminal-border-raw)' }}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-6 py-5 shrink-0">
                            {error
                                ? <p className="text-[13px] flex-1 leading-relaxed font-medium" style={{ color: 'var(--color-fake-fill)' }}>{error}</p>
                                : <span className="flex-1" />
                            }
                            <div className="flex gap-2 ml-auto shrink-0">
                                <button type="button" onClick={handleClose}
                                        className="px-4 py-2 text-[13px] font-bold transition-colors border"
                                        style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                    İptal
                                </button>
                                <button type="submit" disabled={!canSubmit}
                                        className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-bold transition-all duration-150 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                                        style={{ background: BRAND, color: '#fff' }}>
                                    <CornerDownLeft className="w-3.5 h-3.5" />
                                    {submitting ? 'Oluşturuluyor…' : 'Tartışmayı Başlat'}
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
