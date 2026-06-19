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
        setTimeout(onClose, 220);
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
                    background:           visible ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0)',
                    backdropFilter:       visible ? 'blur(3px)' : 'blur(0px)',
                    WebkitBackdropFilter: visible ? 'blur(3px)' : 'blur(0px)',
                    transition: 'background 0.18s ease, backdrop-filter 0.18s ease',
                }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-10000 flex items-center justify-center px-4 py-6 pointer-events-none">
                <div
                    className="w-full max-w-xl pointer-events-auto flex flex-col overflow-hidden relative"
                    style={{
                        background:      'var(--color-terminal-surface)',
                        border:          '1px solid var(--color-terminal-border-raw)',
                        borderTop:       `3px solid ${BRAND}`,
                        boxShadow:       '0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(16,185,129,0.10)',
                        transformOrigin: 'top center',
                        transform:       visible ? 'scaleY(1) translateY(0)' : 'scaleY(0.62) translateY(-14px)',
                        opacity:         visible ? 1 : 0,
                        transition:      'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                        maxHeight:       '86vh',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={BD}>
                        <div className="w-7 h-7 flex items-center justify-center shrink-0"
                             style={{ background: 'rgba(63,255,139,0.10)', border: '1px solid rgba(63,255,139,0.22)' }}>
                            <MessageSquare className="w-3.5 h-3.5" style={{ color: BRAND }} />
                        </div>
                        <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                            Tartışma Başlat
                        </span>
                        <button onClick={handleClose}
                                className="p-1 transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-muted)' }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">

                        {/* Bağlı haber bandı */}
                        {articleId && suggestion && (
                            <div className="mx-5 mt-4 flex items-start gap-3 px-3 py-2.5"
                                 style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.20)' }}>
                                <LinkIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: BRAND }} />
                                <p className="text-xs flex-1 leading-snug"
                                   style={{ color: 'var(--color-text-secondary)' }}>
                                    {suggestion}
                                </p>
                            </div>
                        )}

                        {/* Başlık */}
                        <div className="px-5 pt-4 pb-4 border-b" style={BD}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wider"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Başlık <span style={{ color: 'var(--color-es-error)' }}>*</span>
                                </label>
                                <span className="text-[10px]"
                                      style={{ color: title.length > 0 && title.length < 3 ? '#ff6b6b' : 'var(--color-text-muted)' }}>
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
                                className="w-full bg-transparent outline-none text-sm"
                                style={{
                                    color:       'var(--color-text-primary)',
                                    caretColor:  BRAND,
                                    fontFamily:  "'Elms Sans', sans-serif",
                                    padding:     '6px 0',
                                    borderBottom: `1px solid ${title ? 'rgba(63,255,139,0.30)' : 'var(--color-terminal-border-raw)'}`,
                                    transition:  'border-color 0.2s',
                                }}
                            />

                            {/* Tab öneri ipucu */}
                            {suggestion && !title && (
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold font-mono"
                                          style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-terminal-border-raw)' }}>
                                        Tab ↹
                                    </span>
                                    <span className="text-[10px] truncate max-w-75"
                                          style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                        {suggestion.length > 60 ? suggestion.slice(0, 60) + '…' : suggestion}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Açıklama */}
                        <div className="px-5 pt-4 pb-4 border-b" style={BD}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wider"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Açıklama
                                    <span className="ml-1 font-normal normal-case" style={{ opacity: 0.55 }}>(isteğe bağlı)</span>
                                </label>
                                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {body.length}/10000
                                </span>
                            </div>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={3}
                                maxLength={10000}
                                placeholder="Kanıtını veya görüşünü yaz…"
                                className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
                                style={{
                                    color:      'var(--color-text-primary)',
                                    caretColor: BRAND,
                                    fontFamily: "'Elms Sans', sans-serif",
                                }}
                            />
                        </div>

                        {/* Gönderi türü + Kategori — yan yana */}
                        <div className="px-5 pt-4 pb-4 border-b flex gap-4" style={BD}>
                            <div className="flex-1">
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
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
                                            className="flex-1 py-1.5 text-xs font-semibold border transition-all"
                                            style={{
                                                borderColor: postType === opt.value ? BRAND : 'var(--color-terminal-border-raw)',
                                                color:       postType === opt.value ? BRAND : 'var(--color-text-muted)',
                                                background:  postType === opt.value ? 'rgba(16,185,129,0.06)' : 'transparent',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Kategori
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs cursor-pointer border outline-none"
                                    style={{
                                        background:  'var(--color-terminal-surface)',
                                        borderColor: 'var(--color-terminal-border-raw)',
                                        color:       'var(--color-text-primary)',
                                        fontFamily:  "'Elms Sans', sans-serif",
                                    }}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
                             style={{ background: 'rgba(0,0,0,0.15)', borderTop: `1px solid var(--color-terminal-border-raw)` }}>
                            {error
                                ? <p className="text-xs flex-1 leading-relaxed" style={{ color: '#ff6b6b' }}>{error}</p>
                                : <span className="flex-1" />
                            }
                            <div className="flex gap-2 ml-auto shrink-0">
                                <button type="button" onClick={handleClose}
                                        className="px-4 py-2 text-xs font-semibold border transition-opacity hover:opacity-60"
                                        style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                    İptal
                                </button>
                                <button type="submit" disabled={!canSubmit}
                                        className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-30"
                                        style={{ background: BRAND, color: '#070f12' }}>
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
