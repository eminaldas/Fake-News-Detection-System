import React, { useState, useMemo } from 'react';
import { Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../services/auth.service';
import { PASSWORD_RULES } from '../utils/passwordRules';

const ResetPassword = () => {
    const [searchParams]                  = useSearchParams();
    const token                            = searchParams.get('token') || '';

    const [newPassword,  setNewPassword]  = useState('');
    const [confirm,      setConfirm]      = useState('');
    const [showNew,      setShowNew]      = useState(false);
    const [showConfirm,  setShowConfirm]  = useState(false);
    const [loading,      setLoading]      = useState(false);
    const [success,      setSuccess]      = useState(false);
    const [error,        setError]        = useState('');
    const [pwTouched,    setPwTouched]    = useState(false);

    const { isDarkMode } = useTheme();
    const navigate        = useNavigate();

    const ruleResults    = useMemo(() => PASSWORD_RULES.map(r => ({ ...r, passed: r.test(newPassword) })), [newPassword]);
    const allPassed      = ruleResults.every(r => r.passed);
    const passwordsMatch = confirm.length > 0 && newPassword === confirm;

    const invalidLink = !token;

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        setError('');
        if (!allPassed)              { setError('Şifre gereksinimlerini karşılamıyor.'); return; }
        if (newPassword !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
        setLoading(true);
        try {
            await AuthService.resetPassword(token, newPassword);
            setSuccess(true);
            setTimeout(() => navigate('/login', { replace: true }), 2500);
        } catch (err) {
            if (err.status === 400) {
                setError('Bu bağlantının süresi dolmuş veya geçersiz. Lütfen yeni bağlantı isteyin.');
            } else {
                setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
            }
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
                    SIFIRLA
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

                    <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] mb-4"
                       style={{ color: 'var(--color-brand-primary)' }}>
                    </p>

                    {invalidLink ? (
                        <div className="flex flex-col items-center gap-4 py-6 text-center animate-fade-up">
                            <AlertCircle className="w-10 h-10" style={{ color: '#ef4444' }} />
                            <div>
                                <p className="font-manrope font-bold text-base mb-1"
                                   style={{ color: 'var(--color-text-primary)' }}>
                                    Geçersiz Bağlantı
                                </p>
                                <p className="font-mono text-xs leading-relaxed"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                    Bu bağlantı geçersiz veya süresi dolmuş.
                                </p>
                            </div>
                            <Link to="/forgot-password"
                                  className="font-mono text-xs font-bold underline transition-opacity hover:opacity-80"
                                  style={{ color: 'var(--color-brand-primary)' }}>
                                Yeni bağlantı iste →
                            </Link>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center gap-4 py-6 animate-fade-up text-center">
                            <div className="w-14 h-14 flex items-center justify-center"
                                 style={{ border: '2px solid var(--color-brand-primary)', background: 'rgba(16,185,129,0.08)' }}>
                                <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--color-brand-primary)' }} />
                            </div>
                            <div>
                                <p className="font-manrope font-bold text-base mb-1"
                                   style={{ color: 'var(--color-text-primary)' }}>
                                    Şifreniz güncellendi!
                                </p>
                                <p className="font-mono text-xs"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                    Giriş sayfasına yönlendiriliyorsunuz…
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {error && (
                                <div className="flex items-start gap-2.5 p-3 animate-fade-up"
                                     role="alert"
                                     style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span className="text-xs">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="new-pw"
                                       className="block text-xs font-bold uppercase tracking-widest"
                                       style={{ color: 'var(--color-text-primary)' }}>
                                    Yeni Şifre
                                </label>
                                <div className="relative flex items-center transition-all duration-200"
                                     style={{ border: '1px solid var(--color-terminal-border-raw)', background: 'rgba(0,0,0,0.25)' }}>
                                    <Lock className="absolute left-4 w-4 h-4 pointer-events-none"
                                          style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                    <input
                                        id="new-pw"
                                        type={showNew ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        onFocus={() => setPwTouched(true)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-11 text-sm"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    />
                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                            aria-label={showNew ? 'Şifreyi gizle' : 'Şifreyi göster'}
                                            className="absolute right-4 transition-opacity hover:opacity-70"
                                            style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {pwTouched && (
                                    <div className="flex flex-col gap-1 pt-1 pl-1 animate-fade-up">
                                        {ruleResults.map(r => (
                                            <div key={r.id} className="flex items-center gap-1.5">
                                                {r.passed
                                                    ? <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                                    : <X     className="w-3 h-3 shrink-0" style={{ color: '#ef4444' }} />
                                                }
                                                <span className="text-[11px]"
                                                      style={{ color: r.passed ? 'var(--color-brand-primary)' : 'var(--color-text-primary)', opacity: r.passed ? 1 : 0.6 }}>
                                                    {r.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirm-pw"
                                       className="block text-xs font-bold uppercase tracking-widest"
                                       style={{ color: 'var(--color-text-primary)' }}>
                                    Şifre Tekrar
                                </label>
                                <div className="relative flex items-center transition-all duration-200"
                                     style={{
                                         border: `1px solid ${confirm.length > 0 ? (passwordsMatch ? 'var(--color-brand-primary)' : 'rgba(239,68,68,0.50)') : 'var(--color-terminal-border-raw)'}`,
                                         background: 'rgba(0,0,0,0.25)',
                                     }}>
                                    <Lock className="absolute left-4 w-4 h-4 pointer-events-none"
                                          style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                    <input
                                        id="confirm-pw"
                                        type={showConfirm ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-11 text-sm"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                                            aria-label={showConfirm ? 'Şifreyi gizle' : 'Şifreyi göster'}
                                            className="absolute right-4 transition-opacity hover:opacity-70"
                                            style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {confirm.length > 0 && !passwordsMatch && (
                                    <p className="text-[11px] pl-1 animate-fade-up" style={{ color: '#ef4444' }}>
                                        Şifreler eşleşmiyor
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !allPassed || !passwordsMatch}
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
                                    : <><span>Şifremi Güncelle</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                                }
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-5">
                    <Link to="/login"
                          className="text-sm transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                        ← Giriş Sayfasına Dön
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default ResetPassword;
