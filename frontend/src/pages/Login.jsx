import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/* ─── Input sarmalayıcısı ─────────────────────────────────────────── */
const InputWrap = ({ children }) => (
    <div
        className="relative flex items-center rounded-xl transition-all duration-200 bg-surface-solid"
        style={{ border: '1px solid var(--color-border)' }}
        onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--color-brand-primary)';
            e.currentTarget.style.boxShadow   = '0 0 0 1px var(--color-brand-primary)';
        }}
        onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow   = 'none';
        }}
    >
        {children}
    </div>
);

/* ─── Login ─────────────────────────────────────────────────────── */
const Login = () => {
    const [username, setUsername]         = useState('');
    const [password, setPassword]         = useState('');
    const [rememberMe, setRememberMe]     = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');

    const { login }      = useAuth();
    const { isDarkMode } = useTheme();
    const navigate       = useNavigate();
    const location       = useLocation();

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
        <div className="relative -mt-24 md:-mt-28 min-h-screen">

            {/* Büyük dekoratif arka plan yazısı */}
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
                <span className="font-manrope font-black uppercase tracking-tighter text-tx-primary"
                      style={{ fontSize:'clamp(80px,18vw,220px)', lineHeight:1, opacity: isDarkMode ? 0.022 : 0.04 }}>
                    HABER
                </span>
            </div>

            {/* Dikey bölücü çizgi */}
            <div className="absolute hidden md:block top-0 bottom-0 left-1/2 w-px pointer-events-none"
                 style={{
                     background: isDarkMode
                         ? 'linear-gradient(to bottom,transparent,rgba(63,255,139,0.08),rgba(63,255,139,0.12),rgba(63,255,139,0.08),transparent)'
                         : 'linear-gradient(to bottom,transparent,var(--color-border),var(--color-border),transparent)',
                 }} />

            {/* İki kolonlu grid */}
            <div className="relative z-10 min-h-screen grid md:grid-cols-2">

                {/* ── SOL: Form ── */}
                <div className="flex items-center justify-center px-6 md:px-16 py-32 md:py-0">
                    <div className="w-full max-w-md animate-fade-up">

                        {error && (
                            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl
                                            border border-es-error/30 bg-es-error/8 text-es-error
                                            text-sm font-inter animate-fade-up">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="p-8 md:p-9 rounded-xl bg-surface"
                             style={{
                                 backdropFilter: 'blur(28px)',
                                 WebkitBackdropFilter: 'blur(28px)',
                                 border: isDarkMode
                                     ? '1px solid rgba(63,255,139,0.13)'
                                     : '1px solid var(--color-border)',
                                 borderLeft: '4px solid var(--color-brand-primary)',
                                 boxShadow: isDarkMode
                                     ? '0 24px 64px rgba(0,0,0,0.6)'
                                     : '0 8px 32px rgba(0,0,0,0.07)',
                             }}>

                            <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] text-brand mb-6">
                                Kimlik Doğrulama
                            </p>

                            <form className="space-y-5" onSubmit={handleLogin} autoComplete="on">

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-tx-secondary">
                                        Kullanıcı Adı
                                    </label>
                                    <InputWrap>
                                        <User className="absolute left-4 w-4 h-4 text-muted pointer-events-none" />
                                        <input
                                            id="username" name="username" type="text"
                                            autoComplete="username"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder="kullanici_adi"
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0
                                                       py-3.5 pl-11 pr-4 text-sm text-tx-primary font-inter
                                                       placeholder:text-muted"
                                        />
                                    </InputWrap>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-tx-secondary">
                                        Şifre
                                    </label>
                                    <InputWrap>
                                        <Lock className="absolute left-4 w-4 h-4 text-muted pointer-events-none" />
                                        <input
                                            id="current-password" name="current-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0
                                                       py-3.5 pl-11 pr-11 text-sm text-tx-primary font-inter
                                                       placeholder:text-muted"
                                        />
                                        <button type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-4 text-muted hover:text-brand transition-colors">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </InputWrap>
                                </div>

                                {/* Beni Hatırla */}
                                <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group">
                                    <div className="relative shrink-0">
                                        <input type="checkbox" checked={rememberMe}
                                               onChange={e => setRememberMe(e.target.checked)}
                                               className="peer sr-only" />
                                        <div className="w-4 h-4 rounded flex items-center justify-center transition-all"
                                             style={{
                                                 border: '1px solid var(--color-border)',
                                                 background: rememberMe ? 'var(--color-brand-primary)' : 'var(--color-bg-surface-solid)',
                                                 borderColor: rememberMe ? 'var(--color-brand-primary)' : 'var(--color-border)',
                                             }}>
                                            {rememberMe && (
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12"
                                                     style={{ color: isDarkMode ? '#070f12' : '#ffffff' }}>
                                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                                                          strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm text-tx-secondary group-hover:text-tx-primary transition-colors font-inter">
                                        Beni Hatırla <span className="opacity-50">(30 gün)</span>
                                    </span>
                                </label>

                                <button
                                    type="submit" disabled={loading}
                                    className="group w-full mt-1 py-4 rounded-xl font-manrope font-black
                                               text-[11px] uppercase tracking-[0.2em]
                                               hover:opacity-90 disabled:opacity-50
                                               transition-all duration-200 flex items-center justify-center gap-2
                                               active:scale-[0.98]"
                                    style={{
                                        background: 'var(--color-brand-primary)',
                                        color: isDarkMode ? '#070f12' : '#ffffff',
                                        boxShadow: isDarkMode
                                            ? '0 10px 32px rgba(63,255,139,0.22)'
                                            : '0 8px 24px rgba(63,63,70,0.22)',
                                    }}
                                >
                                    {loading
                                        ? <Loader2 className="w-4 h-4 animate-spin"/>
                                        : <><span>Giriş Yap</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>
                                    }
                                </button>
                            </form>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-tx-secondary text-sm font-inter">
                                Hesabınız yok mu?{' '}
                                <Link to="/register" className="text-brand font-bold hover:underline underline-offset-4">
                                    Kayıt Olun
                                </Link>
                            </p>
                            <Link to="/" className="text-[11px] font-inter text-muted hover:text-brand transition-colors">
                                ← Ana Sayfa
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── SAĞ: Yazı / Marka ── */}
                <div className="hidden md:flex flex-col justify-center px-16 animate-fade-right">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full w-fit mb-6
                                     bg-brand/10 border border-brand/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-soft" />
                        <span className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] text-brand">
                            Yapay Zeka Destekli
                        </span>
                    </span>

                    <h1 className="font-manrope font-extrabold tracking-tighter leading-[0.92] text-tx-primary mb-6"
                        style={{ fontSize:'clamp(3rem,5.5vw,5.5rem)' }}>
                        Gerçeği<br />
                        <span className="text-brand italic">Keşfet.</span>
                    </h1>

                    <p className="text-tx-secondary text-lg leading-relaxed max-w-sm mb-10">
                        Bilgi kirliliğinin ötesine geçin. Şüpheli haberleri yapay zeka ile saniyeler içinde analiz edin.
                    </p>

                    <div className="space-y-3">
                        {[
                            { icon: <ShieldCheck className="w-4 h-4" />, text: 'BERT tabanlı Türkçe dil analizi' },
                            { icon: <ShieldCheck className="w-4 h-4" />, text: 'Anlık kaynak doğrulama' },
                            { icon: <ShieldCheck className="w-4 h-4" />, text: 'Analiz geçmişi ve istatistikler' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-brand shrink-0">{f.icon}</span>
                                <span className="text-tx-secondary text-sm font-inter">{f.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-5 rounded-xl bg-brand/5 border border-brand/10">
                        <p className="text-tx-secondary/80 text-sm font-inter italic leading-relaxed">
                            "Bilgi çağında doğrulamak en değerli beceridir."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
