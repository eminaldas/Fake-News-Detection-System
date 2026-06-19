import React, { useState } from 'react';
import { Mail, ArrowRight, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../services/auth.service';

const ForgotPassword = () => {
    const [email,   setEmail]   = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error,   setError]   = useState('');
    const { isDarkMode } = useTheme();

    const maskEmail = (e) => {
        const [local, domain] = e.split('@');
        return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        setLoading(true);
        setError('');
        try {
            await AuthService.forgotPassword(email);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative -mt-32 md:-mt-36 min-h-screen flex items-center justify-center px-6">

            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
                <span
                    className="font-manrope font-black uppercase tracking-tighter"
                    style={{ fontSize: 'clamp(80px,18vw,220px)', lineHeight: 1, opacity: isDarkMode ? 0.022 : 0.04, color: 'var(--color-text-primary)' }}
                >
                    ŞİFRE
                </span>
            </div>

            <div className="relative z-10 w-full max-w-md animate-fade-up">

                <div className="relative overflow-hidden p-8 md:p-9"
                     style={{
                         background: 'var(--color-terminal-surface)',
                         border: '1px solid var(--color-terminal-border-raw)',
                         borderRight: '3px solid var(--color-brand-primary)',
                         boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                     }}>

                    <div className="absolute top-0 left-0 w-5 h-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />
                    <div className="absolute top-0 left-0 h-5 w-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />

                    {error && (
                        <div className="flex items-start gap-2.5 p-3 text-sm mb-4 animate-fade-up"
                             role="alert"
                             style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="text-xs">{error}</span>
                        </div>
                    )}

                    <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] mb-4"
                       style={{ color: 'var(--color-brand-primary)' }}>
                    </p>

                    {success ? (
                        <div className="flex flex-col items-center gap-4 py-6 animate-fade-up text-center">
                            <div className="w-14 h-14 flex items-center justify-center"
                                 style={{ border: '2px solid var(--color-brand-primary)', background: 'rgba(16,185,129,0.08)' }}>
                                <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--color-brand-primary)' }} />
                            </div>
                            <div>
                                <p className="font-manrope font-bold text-base mb-1"
                                   style={{ color: 'var(--color-text-primary)' }}>
                                    Email gönderildi!
                                </p>
                                <p className="font-mono text-xs leading-relaxed"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                    <span style={{ color: 'var(--color-brand-primary)' }}>{maskEmail(email)}</span>{' '}
                                    adresine şifre sıfırlama bağlantısı gönderdik.<br />
                                    Bağlantı <strong style={{ color: 'var(--color-text-secondary)' }}>15 dakika</strong> geçerlidir.
                                </p>
                            </div>
                            <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                Email gelmediyse spam klasörünü kontrol edin.
                            </p>
                            <button
                                type="button"
                                onClick={() => { setSuccess(false); setEmail(''); }}
                                className="font-mono text-xs underline transition-opacity hover:opacity-70"
                                style={{ color: 'var(--color-text-muted)' }}>
                                Farklı bir email ile dene
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="font-mono text-xs mb-6 leading-relaxed"
                               style={{ color: 'var(--color-text-muted)' }}>
                                Kayıtlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı göndereceğiz.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="forgot-email"
                                           className="block text-xs font-bold uppercase tracking-widest"
                                           style={{ color: 'var(--color-text-primary)' }}>
                                        E-posta Adresi
                                    </label>
                                    <div className="relative flex items-center transition-all duration-200"
                                         style={{ border: '1px solid var(--color-terminal-border-raw)', background: 'rgba(0,0,0,0.25)' }}>
                                        <Mail className="absolute left-4 w-4 h-4 pointer-events-none"
                                              style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="ornek@email.com"
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-4 text-sm"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group w-full mt-1 py-4 font-manrope font-black text-[11px] uppercase tracking-[0.2em]
                                               hover:opacity-90 disabled:opacity-50 transition-all duration-200
                                               flex items-center justify-center gap-2 active:scale-[0.98]"
                                    style={{
                                        background: 'var(--color-brand-primary)',
                                        color: '#070f12',
                                        boxShadow: '0 8px 28px rgba(16,185,129,0.25)',
                                    }}
                                >
                                    {loading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <><span>Bağlantı Gönder</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                                    }
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                    <Link to="/login"
                          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-brand-primary)' }}>
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Giriş Sayfasına Dön
                    </Link>
                    <Link to="/register"
                          className="text-[11px] transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                        Hesap Oluştur
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default ForgotPassword;
