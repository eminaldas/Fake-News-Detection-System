import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import axiosInstance from '../../api/axios';

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

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

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

const CreateThreadModal = ({ onClose, articleId = null }) => {
    const navigate   = useNavigate();
    const firstInput = useRef(null);

    const [title,      setTitle]      = React.useState('');
    const [body,       setBody]       = React.useState('');
    const [category,   setCategory]   = React.useState('');
    const [postType,   setPostType]   = React.useState('iddia');
    const [submitting, setSubmitting] = React.useState(false);
    const [error,      setError]      = React.useState('');
    const [visible,    setVisible]    = React.useState(false);

    const handleClose = React.useCallback(() => {
        setVisible(false);
        setTimeout(onClose, 220);
    }, [onClose]);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 20);
        firstInput.current?.focus();
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
                className="fixed inset-0 z-[200]"
                style={{
                    background:        visible ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0)',
                    backdropFilter:    visible ? 'blur(3px)' : 'blur(0px)',
                    WebkitBackdropFilter: visible ? 'blur(3px)' : 'blur(0px)',
                    transition: 'background 0.18s ease, backdrop-filter 0.18s ease',
                }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[82px] px-4 pointer-events-none">
                <div
                    className="w-full max-w-xl pointer-events-auto flex flex-col overflow-hidden relative"
                    style={{
                        ...TS,
                        border: '1px solid var(--color-terminal-border-raw)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.80), 0 0 0 1px rgba(16,185,129,0.12)',
                        transformOrigin: 'top center',
                        transform: visible ? 'scaleY(1) translateY(0)' : 'scaleY(0.62) translateY(-14px)',
                        opacity:   visible ? 1 : 0,
                        transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                        maxHeight: '84vh',
                    }}
                >
                    {/* Köşe aksanları */}
                    <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={BD}>
                        <span className="font-mono text-xs font-bold tracking-widest uppercase"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            // tartışma_başlat
                        </span>
                        <button onClick={handleClose}
                                className="font-mono text-xs transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-muted)' }}>
                            [✕]
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">

                        {/* Bağlı haber bandı */}
                        {articleId && (
                            <div className="mx-4 mt-4 flex items-center gap-3 px-3 py-2.5 border"
                                 style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.25)' }}>
                                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0"
                                          style={{ color: 'var(--color-brand-primary)' }} />
                                <p className="font-mono text-xs flex-1"
                                   style={{ color: 'var(--color-text-secondary)' }}>
                                    Haber ID: {articleId.slice(0, 12)}…
                                </p>
                            </div>
                        )}

                        {/* Başlık */}
                        <div className="px-4 pt-4 pb-3 border-b" style={BD}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="font-mono text-[9px] font-bold uppercase tracking-widest"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Başlık <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                                </label>
                                <span className="font-mono text-[9px]"
                                      style={{ color: title.length < 3 && title.length > 0 ? '#ff6b6b' : 'var(--color-text-muted)' }}>
                                    {title.length}/300
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm shrink-0"
                                      style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                                <input
                                    ref={firstInput}
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
                                    rows={4}
                                    maxLength={10000}
                                    placeholder="kanıtını veya sorununu açıkla..."
                                    className="flex-1 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed"
                                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                />
                            </div>
                        </div>

                        {/* Gönderi Türü */}
                        <div className="px-4 pt-3 pb-3 border-b" style={BD}>
                            <div className="flex flex-col gap-1.5">
                                <span className="font-mono text-[10px] uppercase tracking-widest font-bold"
                                      style={{ color: 'var(--color-text-muted)' }}>
                                    Gönderi Türü
                                </span>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'iddia',    label: 'İddia / Haber' },
                                        { value: 'soru',     label: 'Soru' },
                                        { value: 'tartisma', label: 'Tartışma' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPostType(opt.value)}
                                            className="flex-1 py-2 font-mono text-xs border transition-all"
                                            style={{
                                                borderColor: postType === opt.value ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                                color:       postType === opt.value ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                                background:  postType === opt.value ? 'rgba(16,185,129,0.06)' : 'transparent',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
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
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                             style={{ background: 'rgba(0,0,0,0.18)' }}>
                            {error
                                ? <p className="font-mono text-[10px] flex-1 leading-relaxed" style={{ color: '#ff6b6b' }}>{error}</p>
                                : <span className="flex-1" />
                            }
                            <div className="flex gap-2 ml-auto shrink-0">
                                <button type="button" onClick={handleClose}
                                        className="px-4 py-2 font-mono text-[11px] font-semibold border transition-opacity hover:opacity-60"
                                        style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                    [ İPTAL ]
                                </button>
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
        </>,
        document.body
    );
};

export default CreateThreadModal;
