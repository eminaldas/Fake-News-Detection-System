import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon, Image, X } from 'lucide-react';
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

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const MAX_IMAGES = 4;
const MAX_FILE_MB = 3;

/* Pydantic veya string hata → okunabilir mesaj */
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
    const [tags,       setTags]       = React.useState([]);
    const [imageUrls,  setImageUrls]  = React.useState([]);
    const [urlInput,   setUrlInput]   = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [error,      setError]      = React.useState('');
    const fileInputRef = React.useRef(null);

    const handleClose = React.useCallback(() => {
        setVisible(false);
        setTimeout(onClose, 220);
    }, [onClose]);

    const [visible, setVisible] = React.useState(false);

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

    /* ── Görsel işlemleri ── */
    const addImageUrl = () => {
        const u = urlInput.trim();
        if (!u || imageUrls.includes(u) || imageUrls.length >= MAX_IMAGES) return;
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
            setError('Görsel URL\'si http:// veya https:// ile başlamalı.');
            return;
        }
        setImageUrls(prev => [...prev, u]);
        setUrlInput('');
        setError('');
    };

    const removeImage = (idx) => setImageUrls(prev => prev.filter((_, i) => i !== idx));

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        const remaining = MAX_IMAGES - imageUrls.length;
        let addedCount = 0;
        files.slice(0, remaining).forEach(file => {
            if (file.size > MAX_FILE_MB * 1024 * 1024) {
                setError(`"${file.name}" ${MAX_FILE_MB}MB'dan büyük, atlandı.`);
                return;
            }
            addedCount++;
            const reader = new FileReader();
            reader.onload = ev => setImageUrls(prev =>
                prev.length < MAX_IMAGES ? [...prev, ev.target.result] : prev
            );
            reader.readAsDataURL(file);
        });
        if (files.length > remaining) {
            setError(`Maks ${MAX_IMAGES} görsel. ${files.length - remaining} dosya atlandı.`);
        }
        e.target.value = '';
    };

    /* ── Form gönder ── */
    const handleSubmit = async (e) => {
        e.preventDefault();

        /* Frontend validasyon */
        if (!title.trim()) { setError('Başlık zorunludur.'); return; }
        if (title.trim().length < 3) { setError('Başlık en az 3 karakter olmalı.'); return; }
        if (!body.trim()) { setError('Açıklama zorunludur.'); return; }
        if (body.trim().length < 10) { setError('Açıklama en az 10 karakter olmalı.'); return; }

        /* base64 URL'leri gönderme — API'ye sadece http(s) URL'ler */
        const safeImageUrls = imageUrls.filter(u => u.startsWith('http://') || u.startsWith('https://'));
        const skipped = imageUrls.length - safeImageUrls.length;

        setSubmitting(true);
        setError('');
        try {
            const { data } = await axiosInstance.post('/forum/threads', {
                title:      title.trim(),
                body:       body.trim(),
                category:   category || null,
                tag_names:  tags,
                article_id: articleId || null,
                image_urls: safeImageUrls,
            });
            handleClose();
            navigate(`/forum/${data.id}`);
        } catch (err) {
            setError(extractError(err));
            setSubmitting(false);
        }
    };

    const canSubmit = title.trim().length >= 3 && body.trim().length >= 10 && !submitting;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[200]"
                style={{
                    background: visible ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0)',
                    backdropFilter: visible ? 'blur(3px)' : 'blur(0px)',
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
                        opacity: visible ? 1 : 0,
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
                        <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                            // tartışma_başlat
                        </span>
                        <button onClick={handleClose} className="font-mono text-xs transition-opacity hover:opacity-60"
                                style={{ color: 'var(--color-text-muted)' }}>
                            [✕]
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">

                        {/* Bağlı haber bandı */}
                        {articleId && (
                            <div className="mx-4 mt-4 flex items-center gap-3 px-3 py-2.5 border"
                                 style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.25)' }}>
                                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <p className="font-mono text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>
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
                                <span className="font-mono text-sm shrink-0" style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
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
                                    Açıklama <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                                </label>
                                <span className="font-mono text-[9px]"
                                      style={{ color: body.trim().length > 0 && body.trim().length < 10 ? '#ff6b6b' : 'var(--color-text-muted)' }}>
                                    {body.trim().length < 10 && body.trim().length > 0
                                        ? `min 10 (${body.trim().length})`
                                        : `${body.length}/10000`}
                                </span>
                            </div>
                            <div className="flex gap-2 items-start">
                                <span className="font-mono text-sm shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span>
                                <textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={4}
                                    placeholder="kanıtını veya sorununu detaylı açıkla..."
                                    className="flex-1 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed"
                                    style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                />
                            </div>
                        </div>

                        {/* Kategori + Etiketler */}
                        <div className="px-4 pt-3 pb-3 border-b flex gap-4" style={BD}>
                            <div className="w-40 flex-shrink-0">
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
                            <div className="flex-1 min-w-0">
                                <label className="block font-mono text-[9px] font-bold uppercase tracking-widest mb-2"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Etiketler <span className="font-normal">(# ile, maks 10)</span>
                                </label>
                                <TagInput value={tags} onChange={setTags} category={category} />
                            </div>
                        </div>

                        {/* Görseller */}
                        <div className="px-4 pt-3 pb-3 border-b" style={BD}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="font-mono text-[9px] font-bold uppercase tracking-widest"
                                       style={{ color: 'var(--color-text-muted)' }}>
                                    Görseller <span className="font-normal">(maks {MAX_IMAGES}, http URL veya dosya)</span>
                                </label>
                                <span className="font-mono text-[9px]"
                                      style={{ color: imageUrls.length >= MAX_IMAGES ? 'var(--color-accent-amber)' : 'var(--color-brand-primary)' }}>
                                    {imageUrls.length}/{MAX_IMAGES}
                                </span>
                            </div>

                            {imageUrls.length < MAX_IMAGES && (
                                <div className="flex gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-1 border" style={BD}>
                                        <span className="px-2 shrink-0" style={{ color: 'var(--color-brand-primary)' }}>
                                            <Image className="w-3.5 h-3.5" />
                                        </span>
                                        <input
                                            value={urlInput}
                                            onChange={e => setUrlInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                                            placeholder="https://örnek.com/foto.jpg — Enter ile ekle"
                                            className="flex-1 bg-transparent outline-none font-mono text-xs py-2"
                                            style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                                        />
                                        {urlInput && (
                                            <button type="button" onClick={addImageUrl}
                                                className="font-mono text-xs px-2 py-1 mr-1 border transition-opacity hover:opacity-70"
                                                style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.30)' }}>
                                                + ekle
                                            </button>
                                        )}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-2 font-mono text-[10px] border transition-opacity hover:opacity-70 shrink-0"
                                        style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                                    >
                                        [ DOSYA ]
                                    </button>
                                </div>
                            )}

                            {imageUrls.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {imageUrls.map((url, idx) => (
                                        <div key={idx} className="relative border overflow-hidden group" style={{ ...BD, width: 80, height: 60 }}>
                                            <img src={url} alt="" className="w-full h-full object-cover"
                                                 onError={() => removeImage(idx)} />
                                            <button type="button" onClick={() => removeImage(idx)}
                                                className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 9 }}>
                                                ✕
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 font-mono px-1 py-0.5 text-center"
                                                 style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.65)', fontSize: 8 }}>
                                                {idx + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.18)' }}>
                            {error ? (
                                <p className="font-mono text-[10px] flex-1 leading-relaxed" style={{ color: '#ff6b6b' }}>{error}</p>
                            ) : (
                                <span />
                            )}
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
