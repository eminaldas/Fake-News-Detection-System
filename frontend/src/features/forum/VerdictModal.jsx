import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import axiosInstance from '../../api/axios';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const OPTIONS = [
    { value: 'DOGRU',     label: 'DOĞRU',     icon: CheckCircle,  color: 'var(--color-brand-primary)',   bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.35)'  },
    { value: 'YANLIS',    label: 'YANLIŞ',    icon: XCircle,      color: 'var(--color-fake-fill)',        bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)'   },
    { value: 'YANILTICI', label: 'YANILTICI', icon: AlertTriangle, color: 'var(--color-accent-amber)',   bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)'  },
];

const VerdictModal = ({ threadId, onClose, onResolved }) => {
    const [selected,    setSelected]    = useState('');
    const [reason,      setReason]      = useState('');
    const [submitting,  setSubmitting]  = useState(false);
    const [error,       setError]       = useState('');
    const [visible,     setVisible]     = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 20);
        document.body.style.overflow = 'hidden';
        return () => { clearTimeout(t); document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []); // eslint-disable-line

    const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selected) { setError('Bir karar seçin.'); return; }
        if (reason.trim().length < 10) { setError('Açıklama en az 10 karakter olmalı.'); return; }
        setSubmitting(true); setError('');
        try {
            const { data } = await axiosInstance.post(
                `/forum/threads/${threadId}/resolve`,
                { verdict: selected, reason: reason.trim() }
            );
            onResolved(data);
            handleClose();
        } catch (err) {
            setError(err?.response?.data?.detail ?? 'Sonuçlandırılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[300]"
                style={{ background: visible ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)', transition: 'background 0.18s ease' }}
                onClick={handleClose}
            />
            <div className="fixed inset-0 z-[301] flex items-start justify-center pt-[80px] px-4 pointer-events-none">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md pointer-events-auto flex flex-col overflow-hidden relative"
                    style={{
                        ...TS,
                        border: '1px solid var(--color-terminal-border-raw)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.80)',
                        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
                        opacity:   visible ? 1 : 0,
                        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.18s ease',
                    }}
                >
                    <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-brand pointer-events-none" />
                    <div className="absolute bottom-0 right-0 h-3 w-[2px] bg-brand pointer-events-none" />

                    <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={BD}>
                        <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                            // tartışmayı_sonuçlandır
                        </span>
                        <button type="button" onClick={handleClose} className="font-mono text-xs transition-opacity hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                            [✕]
                        </button>
                    </div>

                    <div className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--color-text-muted)' }}>Karar</span>
                            <div className="flex gap-2">
                                {OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    const active = selected === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setSelected(opt.value)}
                                            className="flex-1 flex flex-col items-center gap-1.5 py-3 font-mono text-xs font-bold border transition-all"
                                            style={{
                                                color:       opt.color,
                                                borderColor: active ? opt.color : 'var(--color-terminal-border-raw)',
                                                background:  active ? opt.bg : 'transparent',
                                            }}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--color-text-muted)' }}>
                                Açıklama <span style={{ color: 'var(--color-fake-fill)' }}>*</span>
                                <span className="font-normal ml-1 opacity-60">(min 10 karakter)</span>
                            </span>
                            <textarea
                                ref={textareaRef}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={4}
                                placeholder="Neden bu kararı verdiniz? Kaynak veya kanıt ekleyebilirsiniz..."
                                className="w-full resize-none font-mono text-sm outline-none px-3 py-2.5 border transition-colors"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-terminal-surface)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                            />
                        </div>

                        {error && (
                            <p className="font-mono text-xs" style={{ color: 'var(--color-fake-fill)' }}>{error}</p>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 font-mono text-xs border transition-opacity hover:opacity-60"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                            >
                                [ İPTAL ]
                            </button>
                            <button
                                type="submit"
                                disabled={!selected || reason.trim().length < 10 || submitting}
                                className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-30"
                                style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                            >
                                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                [ SONUÇLANDIR ]
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>,
        document.body
    );
};

export default VerdictModal;
