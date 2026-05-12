// frontend/src/pages/Report.jsx
import React, { useState } from 'react';
import { FileWarning, Bug, AlertTriangle, Mail, ChevronRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

const BRAND   = 'var(--color-brand-primary)';
const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';

const TYPES = [
    { key: 'fake_news',  Icon: FileWarning,     title: 'SAHTE HABER',   sub: 'Yanlış veya yanıltıcı içerik',          color: '#ff7351' },
    { key: 'bug',        Icon: Bug,             title: 'HATA / SORUN',  sub: 'Platform veya teknik sorun',             color: '#f59e0b' },
    { key: 'complaint',  Icon: AlertTriangle,   title: 'ŞİKAYET',       sub: 'Kullanıcı veya içerik şikayeti',         color: '#8b5cf6' },
    { key: 'other',      Icon: Mail,            title: 'DİĞER',         sub: 'Yukarıdakilere uymayan konu',            color: BRAND    },
];

const TYPE_LABELS = { fake_news: 'Sahte Haber', bug: 'Hata / Sorun', complaint: 'Şikayet', other: 'Diğer' };

function Notch({ color }) {
    return (
        <>
            <div className="absolute top-0 left-0 w-4 h-[2px] pointer-events-none" style={{ background: color }} />
            <div className="absolute top-0 left-0 w-[2px] h-4 pointer-events-none" style={{ background: color }} />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] pointer-events-none" style={{ background: color }} />
            <div className="absolute bottom-0 right-0 w-[2px] h-4 pointer-events-none" style={{ background: color }} />
        </>
    );
}

export default function Report() {
    const navigate = useNavigate();
    const [step,        setStep]        = useState(1);
    const [type,        setType]        = useState('');
    const [subject,     setSubject]     = useState('');
    const [description, setDescription] = useState('');
    const [urlRef,      setUrlRef]      = useState('');
    const [submitting,  setSubmitting]  = useState(false);
    const [error,       setError]       = useState('');
    const [reportId,    setReportId]    = useState('');

    const selectedType = TYPES.find(t => t.key === type);

    const handleSubmit = async () => {
        if (!subject.trim() || subject.trim().length < 5) { setError('Konu en az 5 karakter olmalı.'); return; }
        if (!description.trim() || description.trim().length < 20) { setError('Açıklama en az 20 karakter olmalı.'); return; }
        setError('');
        setSubmitting(true);
        try {
            const res = await axiosInstance.post('/reports', {
                type,
                subject:     subject.trim(),
                description: description.trim(),
                url_or_ref:  urlRef.trim() || undefined,
            });
            setReportId(res.data.id?.slice(0, 8).toUpperCase());
            setStep('done');
        } catch (e) {
            setError(e?.response?.data?.detail || 'Bir hata oluştu, lütfen tekrar deneyin.');
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setStep(1); setType(''); setSubject(''); setDescription('');
        setUrlRef(''); setError(''); setReportId('');
    };

    const inputBase = {
        background:  SURFACE,
        borderColor: BORDER,
        color:       'var(--color-text-primary)',
        outline:     'none',
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-10 flex flex-col gap-8">

            {/* Büyük başlık */}
            <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: BRAND }}>
                    // BİLDİRİM_SİSTEMİ
                </p>
                <h1 className="font-mono text-4xl md:text-5xl font-black leading-tight text-tx-primary">
                    {step === 1 && 'Neyi Bildiriyorsun?'}
                    {step === 2 && TYPE_LABELS[type]}
                    {step === 'done' && 'Alındı.'}
                </h1>
                {step === 1 && (
                    <p className="font-mono text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Türü seç, ardından detayları doldur — ekibimiz inceleyecek.
                    </p>
                )}
            </div>

            {/* Adım 1 — tür seçimi */}
            {step === 1 && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {TYPES.map(({ key, Icon, title, sub, color }) => {
                            const active = type === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setType(key)}
                                    className="relative text-left p-6 border transition-all hover:opacity-90 active:scale-[0.98]"
                                    style={{ background: active ? `${color}10` : SURFACE, borderColor: active ? color : BORDER }}
                                >
                                    {active && <Notch color={color} />}
                                    <Icon className="w-7 h-7 mb-4" style={{ color }} />
                                    <p className="font-mono text-lg font-black text-tx-primary mb-1 tracking-wide">{title}</p>
                                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        disabled={!type}
                        onClick={() => setStep(2)}
                        className="self-start flex items-center gap-2 px-8 py-3 font-mono text-sm font-black uppercase tracking-widest transition-all disabled:opacity-30"
                        style={{ background: type ? BRAND : BORDER, color: '#070f12' }}
                    >
                        Devam Et <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Adım 2 — detay formu */}
            {step === 2 && selectedType && (
                <div className="relative border" style={{ background: SURFACE, borderColor: BORDER }}>
                    <span className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase pointer-events-none"
                          style={{ background: SURFACE, color: selectedType.color }}>
                        // {selectedType.key.toUpperCase()}_BİLDİRİMİ
                    </span>
                    <Notch color={selectedType.color} />
                    <div className="p-6 pt-8 flex flex-col gap-5">
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-2" style={{ color: selectedType.color }}>
                                Konu *
                            </label>
                            <input
                                value={subject} onChange={e => setSubject(e.target.value)}
                                placeholder="Kısaca özetle..." maxLength={200}
                                className="w-full border px-4 py-3 font-mono text-base" style={inputBase}
                            />
                            <p className="font-mono text-[10px] mt-1 text-right" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                                {subject.length}/200
                            </p>
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-2" style={{ color: selectedType.color }}>
                                Açıklama *
                            </label>
                            <textarea
                                value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Mümkün olduğunca detaylı anlat. Ne gördün, ne oldu, nerede?"
                                rows={6} className="w-full border px-4 py-3 font-mono text-sm resize-y"
                                style={{ ...inputBase, minHeight: 140 }}
                            />
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest block mb-2"
                                   style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                URL / Referans <span style={{ opacity: 0.5 }}>(opsiyonel)</span>
                            </label>
                            <input
                                value={urlRef} onChange={e => setUrlRef(e.target.value)}
                                placeholder="İlgili bir link var mı?" maxLength={500}
                                className="w-full border px-4 py-3 font-mono text-sm" style={inputBase}
                            />
                        </div>
                        {error && (
                            <p className="font-mono text-sm" style={{ color: '#ff7351' }}>
                                <span className="font-black">[ ERR ]</span> {error}
                            </p>
                        )}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => { setStep(1); setError(''); }}
                                className="font-mono text-xs px-4 py-2 border transition-opacity hover:opacity-70"
                                style={{ borderColor: BORDER, color: 'var(--color-text-muted)' }}
                            >
                                ← Geri
                            </button>
                            <button
                                disabled={submitting} onClick={handleSubmit}
                                className="flex items-center gap-2 font-mono text-sm font-black px-8 py-3 uppercase tracking-widest transition-all disabled:opacity-50"
                                style={{ background: selectedType.color, color: '#070f12' }}
                            >
                                {submitting ? 'Gönderiliyor...' : 'Gönder'}
                                {!submitting && <ChevronRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Başarı ekranı */}
            {step === 'done' && (
                <div className="relative border" style={{ background: SURFACE, borderColor: `${BRAND}40`, borderTop: `2px solid ${BRAND}` }}>
                    <Notch color={BRAND} />
                    <div className="p-8 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8" style={{ color: BRAND }} />
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: BRAND, opacity: 0.7 }}>
                                    // BİLDİRİM_ALINDI
                                </p>
                                <p className="font-mono text-2xl font-black text-tx-primary">#{reportId}</p>
                            </div>
                        </div>
                        <p className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Bildiriminiz alındı. Ekibimiz en kısa sürede inceleyecektir.
                            Yanıt verildiğinde mail adresinize bildirim gönderilecektir.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={reset} className="font-mono text-xs px-5 py-2.5 border transition-opacity hover:opacity-70"
                                    style={{ borderColor: BORDER, color: 'var(--color-text-muted)' }}>
                                Yeni Bildirim
                            </button>
                            <button onClick={() => navigate('/')} className="font-mono text-xs px-5 py-2.5 font-black transition-opacity hover:opacity-80"
                                    style={{ background: BRAND, color: '#070f12' }}>
                                Ana Sayfa →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
