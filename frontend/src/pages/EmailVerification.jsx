import React, { useEffect, useRef, useState } from 'react';
import { Mail, RefreshCw, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';

export default function EmailVerification() {
    const { user, refreshUser } = useAuth();
    const navigate              = useNavigate();
    const [searchParams]        = useSearchParams();
    const token                 = searchParams.get('token');

    const [status,     setStatus]     = useState('waiting'); // waiting | verified | error
    const [resending,  setResending]  = useState(false);
    const [resent,     setResent]     = useState(false);
    const [devToken,   setDevToken]   = useState(null);
    const intervalRef = useRef(null);

    /* Token URL'den geldiyse otomatik doğrula */
    useEffect(() => {
        if (!token) return;
        axiosInstance.post('/auth/verify-email', { token })
            .then(() => {
                setStatus('verified');
                setTimeout(() => navigate('/onboarding', { replace: true }), 1800);
            })
            .catch(() => setStatus('error'));
    }, [token, navigate]);

    /* Zaten doğrulanmışsa direkt onboarding'e */
    useEffect(() => {
        if (user?.is_email_verified) {
            navigate('/onboarding', { replace: true });
        }
    }, [user, navigate]);

    /* Her 4 saniyede /auth/me poll et */
    useEffect(() => {
        if (status !== 'waiting') return;
        intervalRef.current = setInterval(async () => {
            try {
                await refreshUser();
            } catch { /* sessiz */ }
        }, 4000);
        return () => clearInterval(intervalRef.current);
    }, [status, refreshUser]);

    const handleResend = async () => {
        setResending(true);
        try {
            const data = await axiosInstance.post('/auth/send-verification').then(r => r.data);
            if (data.token) setDevToken(data.token); // dev mode
            setResent(true);
            setTimeout(() => setResent(false), 4000);
        } catch { /* sessiz */ }
        finally { setResending(false); }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] px-4">
            <div
                className="w-full max-w-md relative overflow-hidden animate-fade-up"
                style={{
                    background: 'var(--color-terminal-surface)',
                    border: '1px solid var(--color-terminal-border-raw)',
                    borderTop: '3px solid var(--color-brand-primary)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.50)',
                }}
            >
                {/* Köşe aksan */}
                <div className="absolute bottom-0 right-0 w-6 h-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.4 }} />
                <div className="absolute bottom-0 right-0 h-6 w-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.4 }} />

                <div className="p-10 flex flex-col items-center text-center gap-6">

                    {status === 'verified' ? (
                        <>
                            <div
                                className="w-20 h-20 flex items-center justify-center"
                                style={{ border: '2px solid var(--color-brand-primary)', background: 'rgba(16,185,129,0.08)' }}
                            >
                                <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-brand-primary)' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-manrope font-extrabold mb-2"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    E-posta Doğrulandı!
                                </h2>
                                <p className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                                    Hesabınız aktif. Onboarding'e yönlendiriliyorsunuz…
                                </p>
                            </div>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <div
                                className="w-20 h-20 flex items-center justify-center"
                                style={{ border: '2px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.06)' }}
                            >
                                <Mail className="w-10 h-10" style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-manrope font-extrabold mb-2"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    Bağlantı Geçersiz
                                </h2>
                                <p className="text-sm mb-5" style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                                    Doğrulama bağlantısı süresi dolmuş veya hatalı.
                                </p>
                                <button onClick={handleResend} disabled={resending}
                                    className="px-6 py-3 font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                                    {resending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yeni Bağlantı Gönder'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Animasyonlu zarf */}
                            <div className="relative">
                                <div
                                    className="w-24 h-24 flex items-center justify-center"
                                    style={{
                                        border: '2px solid var(--color-brand-primary)',
                                        background: 'rgba(16,185,129,0.06)',
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}
                                >
                                    <Mail className="w-12 h-12" style={{ color: 'var(--color-brand-primary)' }} />
                                </div>
                                {/* Orbit noktaları */}
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full"
                                        style={{
                                            background: 'var(--color-brand-primary)',
                                            opacity: 0.6,
                                            top: '50%',
                                            left: '50%',
                                            transform: `rotate(${i * 120}deg) translateX(44px)`,
                                            animation: `spin 3s linear infinite`,
                                            animationDelay: `${i * -1}s`,
                                        }}
                                    />
                                ))}
                            </div>

                            <div>
                                <h2 className="text-2xl font-manrope font-extrabold mb-2"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    E-postanızı Doğrulayın
                                </h2>
                                <p className="text-base mb-1" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
                                    Doğrulama bağlantısı şu adrese gönderildi:
                                </p>
                                <p className="text-base font-bold" style={{ color: 'var(--color-brand-primary)' }}>
                                    {user?.email ?? '—'}
                                </p>
                            </div>

                            <p className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                Bağlantıya tıkladıktan sonra bu sayfa otomatik yönlendirilecek.
                            </p>

                            {/* Dev mode token */}
                            {devToken && (
                                <a
                                    href={`/verify-email?token=${devToken}`}
                                    className="text-xs font-bold underline transition-opacity hover:opacity-70"
                                    style={{ color: 'var(--color-brand-primary)' }}
                                >
                                    [DEV] Doğrulama bağlantısı →
                                </a>
                            )}

                            {resent && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-brand-primary)' }}>
                                    <CheckCircle className="w-4 h-4" /> E-posta tekrar gönderildi
                                </div>
                            )}

                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
                                style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}
                            >
                                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                                Tekrar gönder
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
