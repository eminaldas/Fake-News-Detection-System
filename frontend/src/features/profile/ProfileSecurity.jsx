import React, { useState, useEffect, useRef } from 'react';
import { Lock, Monitor, Smartphone, AlertTriangle, Download, Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../../api/axios';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Block = ({ title, sub, children, footer }) => (
    <div className="relative border" style={S}>
        <span
            className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
        >
            {title}
        </span>
        <div className="px-5 pt-6 pb-5">
            {sub && (
                <p className="font-mono text-xs mb-5 opacity-70" style={{ color: 'var(--color-text-muted)' }}>
                    {sub}
                </p>
            )}
            {children}
        </div>
        {footer && (
            <div className="border-t px-5 py-2 flex items-center justify-between" style={BD}>
                {footer}
            </div>
        )}
    </div>
);

const TerminalInput = ({ placeholder, value, onChange, required, type = 'password' }) => {
    const [show, setShow] = useState(false);
    return (
        <div
            className="flex items-center gap-3 border px-4 py-3 transition-colors"
            style={BD}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-terminal-border-raw)'}
        >
            <Lock className="w-4 h-4 shrink-0 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
            <input
                type={show ? 'text' : type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                className="flex-1 bg-transparent font-mono text-sm outline-none"
                style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
            />
            {type === 'password' && (
                <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="shrink-0 opacity-30 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
};

const ProfileSecurity = () => {
    const [pwForm, setPwForm]       = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError]     = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const successTimerRef           = useRef(null);

    const [exportLoading, setExportLoading] = useState(false);
    const [exportError,   setExportError]   = useState('');

    const [sessions, setSessions]               = useState([]);
    const [anomalyDetected, setAnomalyDetected] = useState(false);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/users/me/sessions')
            .then(r => { setSessions(r.data.sessions); setAnomalyDetected(r.data.anomaly_detected); })
            .catch(() => {})
            .finally(() => setSessionsLoading(false));
    }, []);

    const handlePasswordChange = async e => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
        setPwLoading(true); setPwError('');
        try {
            await axiosInstance.patch('/users/me', {
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            setPwSuccess(true);
            setPwForm({ current_password: '', new_password: '', confirm: '' });
            successTimerRef.current = setTimeout(() => setPwSuccess(false), 3000);
        } catch (err) {
            setPwError(err.response?.data?.detail ?? 'Şifre güncellenemedi.');
        } finally {
            setPwLoading(false);
        }
    };

    useEffect(() => () => clearTimeout(successTimerRef.current), []);

    const handleExport = async () => {
        setExportLoading(true); setExportError('');
        try {
            const res  = await axiosInstance.get('/users/me/data-export');
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            try {
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `data-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
            } finally { URL.revokeObjectURL(url); }
        } catch {
            setExportError('Veriler indirilemedi.');
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* ── Şifre Değiştir ── */}
            <Block
                title="// passwd_change"
                sub="yeni şifren en az 8 karakter olmalı"
                footer={
                    <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                        // BCRYPT_HASH
                    </span>
                }
            >
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    <TerminalInput
                        placeholder="mevcut şifre"
                        value={pwForm.current_password}
                        onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                        required
                    />
                    <TerminalInput
                        placeholder="yeni şifre"
                        value={pwForm.new_password}
                        onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                        required
                    />
                    <TerminalInput
                        placeholder="yeni şifre tekrar"
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        required
                    />

                    {pwError && (
                        <div className="flex items-center gap-2 font-mono text-sm px-3 py-2 border" style={{ borderColor: '#ff735140', color: '#ff7351' }}>
                            <span className="font-black">[ ERR ]</span> {pwError}
                        </div>
                    )}
                    {pwSuccess && (
                        <div className="flex items-center gap-2 font-mono text-sm px-3 py-2 border" style={{ borderColor: 'rgba(16,185,129,0.3)', color: 'var(--color-brand-primary)' }}>
                            <span className="font-black">[ OK  ]</span> Şifren başarıyla güncellendi.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="w-full py-3 font-mono text-sm font-black tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        {pwLoading ? '// güncelleniyor...' : '[ GÜNCELLE → ]'}
                    </button>
                </form>
            </Block>

            {/* ── Aktif Oturumlar ── */}
            <Block
                title="// active_sessions"
                sub="hesabına bağlı cihaz ve tarayıcı oturumları"
                footer={
                    <>
                        <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                            // SESSION_LOG
                        </span>
                        <span className="font-mono text-[10px] opacity-60" style={{ color: 'var(--color-brand-primary)' }}>
                            {sessions.length} oturum
                        </span>
                    </>
                }
            >
                {/* Anomali uyarısı */}
                {anomalyDetected && (
                    <div
                        className="flex items-start gap-3 p-4 border mb-4"
                        style={{ borderColor: '#ff735160', background: 'rgba(255,115,81,0.06)' }}
                    >
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ff7351' }} />
                        <div>
                            <p className="font-mono text-sm font-bold mb-1" style={{ color: '#ff7351' }}>
                                [ ! ] ANOMALY_DETECTED
                            </p>
                            <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                Son 7 gün içinde alışılmadık bir konumdan giriş tespit edildi. Şifreni değiştirmeni öneririz.
                            </p>
                        </div>
                    </div>
                )}

                {sessionsLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 animate-pulse border" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-terminal-border-raw)' }} />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <span style={{ color: 'var(--color-brand-primary)' }}>{'>'}</span> giriş geçmişi bulunamadı
                    </p>
                ) : (
                    <div className="border" style={BD}>
                        {sessions.map((s, idx) => (
                            <div
                                key={s.created_at}
                                className={`flex items-center gap-4 px-4 py-3 border-l-2 ${idx < sessions.length - 1 ? 'border-b' : ''}`}
                                style={{
                                    borderColor: 'var(--color-terminal-border-raw)',
                                    borderLeftColor: s.is_current ? 'var(--color-brand-primary)' : 'transparent',
                                    background: s.is_current ? 'rgba(16,185,129,0.04)' : 'transparent',
                                }}
                            >
                                <div className="shrink-0">
                                    {s.is_current
                                        ? <Smartphone className="w-5 h-5" style={{ color: 'var(--color-brand-primary)' }} />
                                        : <Monitor    className="w-5 h-5 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                        {s.label}
                                    </p>
                                    <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                        {new Date(s.created_at).toLocaleString('tr-TR')}
                                    </p>
                                </div>
                                {s.is_current && (
                                    <span
                                        className="font-mono text-[11px] font-bold px-2 py-0.5 border shrink-0"
                                        style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.3)' }}
                                    >
                                        AKTİF
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Block>

            {/* ── Veri Dışa Aktarma ── */}
            <Block
                title="// data_export"
                sub="hesap bilgilerin, analiz geçmişin ve tercihlerini JSON olarak indirebilirsin"
                footer={
                    <span className="font-mono text-[10px] tracking-widest opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                        // GDPR_COMPLIANT
                    </span>
                }
            >
                {exportError && (
                    <div className="flex items-center gap-2 font-mono text-sm px-3 py-2 border mb-4" style={{ borderColor: '#ff735140', color: '#ff7351' }}>
                        <span className="font-black">[ ERR ]</span> {exportError}
                    </div>
                )}
                <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="flex items-center gap-3 px-5 py-3 border font-mono text-sm font-bold tracking-wider transition-all disabled:opacity-40 hover:opacity-80"
                    style={{
                        borderColor: 'var(--color-brand-primary)',
                        color: 'var(--color-brand-primary)',
                        background: 'rgba(16,185,129,0.06)',
                    }}
                >
                    <Download className="w-4 h-4" />
                    {exportLoading ? '// hazırlanıyor...' : '[ JSON → İNDİR ]'}
                </button>
            </Block>
        </div>
    );
};

export default ProfileSecurity;
