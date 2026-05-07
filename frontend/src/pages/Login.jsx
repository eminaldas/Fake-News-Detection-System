import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const InputWrap = ({ children }) => {
    const ref = React.useRef(null);
    return (
        <div
            ref={ref}
            className="relative flex items-center transition-all duration-200"
            style={{
                border: '1px solid var(--color-terminal-border-raw)',
                background: 'rgba(0,0,0,0.25)',
            }}
            onFocusCapture={() => {
                if (ref.current) {
                    ref.current.style.borderColor = 'var(--color-brand-primary)';
                    ref.current.style.boxShadow   = '0 0 0 1px var(--color-brand-primary)';
                }
            }}
            onBlurCapture={() => {
                if (ref.current) {
                    ref.current.style.borderColor = 'var(--color-terminal-border-raw)';
                    ref.current.style.boxShadow   = 'none';
                }
            }}
        >
            {children}
        </div>
    );
};

const Login = () => {
    const [username,     setUsername]     = useState('');
    const [password,     setPassword]     = useState('');
    const [rememberMe,   setRememberMe]   = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState('');

    const { login, googleLogin } = useAuth();
    const { isDarkMode }         = useTheme();
    const navigate               = useNavigate();
    const location               = useLocation();

    const handleGoogleLogin = useGoogleLogin({
        flow: 'implicit',
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            const result = await googleLogin(tokenResponse.access_token);
            if (result.success) {
                const dest = result.needsOnboarding ? '/onboarding' : (location.state?.from?.pathname || '/');
                navigate(dest, { replace: true });
            } else {
                setError(result.error || 'Google ile giriş başarısız.');
                setLoading(false);
            }
        },
        onError: () => setError('Google ile giriş başarısız.'),
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const result = await login(username, password, rememberMe);
        if (result.success) {
            navigate(location.state?.from?.pathname || '/', { replace: true });
        } else {
            setError(result.error || 'Geçersiz kimlik bilgileri.');
            setLoading(false);
        }
    };

    return (
        <div className="relative -mt-32 md:-mt-36 min-h-screen">

            {/* Büyük dekoratif arka plan yazısı */}
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
                <span
                    className="font-manrope font-black uppercase tracking-tighter"
                    style={{ fontSize: 'clamp(80px,18vw,220px)', lineHeight: 1, opacity: isDarkMode ? 0.022 : 0.04, color: 'var(--color-text-primary)' }}
                >
                    HABER
                </span>
            </div>

            {/* Dikey bölücü çizgi */}
            <div
                className="absolute hidden md:block top-0 bottom-0 left-1/2 w-px pointer-events-none"
                style={{
                    background: 'linear-gradient(to bottom,transparent,rgba(16,185,129,0.12),rgba(16,185,129,0.20),rgba(16,185,129,0.12),transparent)',
                }}
            />

            {/* Grid */}
            <div className="relative z-10 min-h-screen grid md:grid-cols-2">

                {/* ── SOL: Form ── */}
                <div className="flex items-center justify-center px-6 md:px-16 py-32 md:py-0">
                    <div className="w-full max-w-md animate-fade-up">

                        {error && (
                            <div
                                className="mb-5 flex items-start gap-2.5 p-3.5 text-sm animate-fade-up"
                                style={{
                                    border: '1px solid rgba(239,68,68,0.35)',
                                    background: 'rgba(239,68,68,0.08)',
                                    color: '#ef4444',
                                }}
                            >
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span style={{ fontFamily: 'inherit' }}>{error}</span>
                            </div>
                        )}

                        {/* Kart */}
                        <div
                            className="p-8 md:p-9 relative overflow-hidden"
                            style={{
                                background: 'var(--color-terminal-surface)',
                                border: '1px solid var(--color-terminal-border-raw)',
                                borderLeft: '3px solid var(--color-brand-primary)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                            }}
                        >
                            {/* Köşe aksanları */}
                            <div className="absolute top-0 right-0 w-5 h-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />
                            <div className="absolute top-0 right-0 h-5 w-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />

                            <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] mb-6"
                               style={{ color: 'var(--color-brand-primary)' }}>
                                // Kimlik Doğrulama
                            </p>

                            <form className="space-y-5" onSubmit={handleLogin} autoComplete="on">

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest"
                                           style={{ color: 'var(--color-text-primary)' }}>
                                        Kullanıcı Adı
                                    </label>
                                    <InputWrap>
                                        <User className="absolute left-4 w-4 h-4 pointer-events-none"
                                              style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                        <input
                                            id="username" name="username" type="text"
                                            autoComplete="username"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder="kullanici_adi"
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0
                                                       py-3.5 pl-11 pr-4 text-sm"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                    </InputWrap>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest"
                                           style={{ color: 'var(--color-text-primary)' }}>
                                        Şifre
                                    </label>
                                    <InputWrap>
                                        <Lock className="absolute left-4 w-4 h-4 pointer-events-none"
                                              style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                        <input
                                            id="current-password" name="current-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0
                                                       py-3.5 pl-11 pr-11 text-sm"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-4 transition-opacity hover:opacity-70"
                                            style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </InputWrap>
                                </div>

                                {/* Beni Hatırla */}
                                <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group">
                                    <div
                                        className="w-4 h-4 flex items-center justify-center transition-all shrink-0"
                                        style={{
                                            border: '1px solid var(--color-terminal-border-raw)',
                                            background: rememberMe ? 'var(--color-brand-primary)' : 'transparent',
                                            borderColor: rememberMe ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                        }}
                                    >
                                        {rememberMe && (
                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12" style={{ color: '#070f12' }}>
                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                                                      strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                        <input
                                            type="checkbox" checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            className="sr-only"
                                        />
                                    </div>
                                    <span className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
                                        Beni Hatırla <span style={{ opacity: 0.5 }}>(30 gün)</span>
                                    </span>
                                </label>

                                <button
                                    type="submit" disabled={loading}
                                    className="w-full mt-1 py-4 font-manrope font-black text-[11px] uppercase tracking-[0.2em]
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
                                        : <><span>Giriş Yap</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                                    }
                                </button>
                            </form>

                            {/* Ayraç */}
                            <div className="flex items-center gap-3 mt-5">
                                <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
                                <span className="text-xs" style={{ color: 'var(--color-text-primary)', opacity: 0.4 }}>ya da</span>
                                <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
                            </div>

                            {/* Google butonu */}
                            <button
                                type="button"
                                onClick={() => handleGoogleLogin()}
                                disabled={loading}
                                className="w-full mt-3 py-3.5 flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--color-terminal-border-raw)',
                                    color: 'var(--color-text-primary)',
                                }}
                            >
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span className="text-sm font-semibold">Google ile Giriş Yap</span>
                            </button>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
                                Hesabınız yok mu?{' '}
                                <Link to="/register" className="font-bold hover:underline underline-offset-4"
                                      style={{ color: 'var(--color-brand-primary)' }}>
                                    Kayıt Olun
                                </Link>
                            </p>
                            <Link to="/" className="text-[11px] transition-opacity hover:opacity-70"
                                  style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                ← Ana Sayfa
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── SAĞ: Marka / Bilgi ── */}
                <div className="hidden md:flex flex-col justify-center px-16 animate-fade-right">

                    <div className="flex items-center gap-2 mb-6">
                        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                        <span className="text-[10px] font-manrope font-black uppercase tracking-[0.22em]"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            Yapay Zeka Destekli
                        </span>
                    </div>

                    <h1
                        className="font-manrope font-extrabold tracking-tighter leading-[0.92] mb-6"
                        style={{ fontSize: 'clamp(3rem,5.5vw,5.5rem)', color: 'var(--color-text-primary)' }}
                    >
                        Gerçeği<br />
                        <span style={{ color: 'var(--color-brand-primary)' }} className="italic">Keşfet.</span>
                    </h1>

                    <p className="text-base leading-relaxed max-w-sm mb-10"
                       style={{ color: 'var(--color-text-primary)', opacity: 0.65 }}>
                        Bilgi kirliliğinin ötesine geçin. Şüpheli haberleri yapay zeka ile saniyeler içinde analiz edin.
                    </p>

                    <div className="space-y-3">
                        {[
                            'BERT tabanlı Türkçe dil analizi',
                            'Anlık kaynak doğrulama',
                            'Analiz geçmişi ve istatistikler',
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <span className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>{f}</span>
                            </div>
                        ))}
                    </div>

                    <div
                        className="mt-10 p-5 relative overflow-hidden"
                        style={{
                            background: 'rgba(16,185,129,0.05)',
                            border: '1px solid rgba(16,185,129,0.15)',
                            borderLeft: '3px solid var(--color-brand-primary)',
                        }}
                    >
                        <p className="text-sm leading-relaxed italic"
                           style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                            "Bilgi çağında doğrulamak en değerli beceridir."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
