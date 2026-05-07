import React, { useState, useMemo } from 'react';
import { Mail, User, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2,
         Eye, EyeOff, Check, X, BarChart2, Clock, Cpu } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const PASSWORD_RULES = [
    { id: 'length', label: 'En az 8 karakter',  test: p => p.length >= 8 },
    { id: 'letter', label: 'En az 1 harf',       test: p => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(p) },
    { id: 'digit',  label: 'En az 1 rakam',      test: p => /\d/.test(p) },
];

const INTEREST_OPTIONS = [
    { value: 'gündem',    label: '📰 Gündem' },
    { value: 'ekonomi',   label: '📈 Ekonomi' },
    { value: 'spor',      label: '⚽ Spor' },
    { value: 'sağlık',    label: '🏥 Sağlık' },
    { value: 'teknoloji', label: '💻 Teknoloji' },
    { value: 'kültür',    label: '🎭 Kültür' },
    { value: 'yaşam',     label: '🌱 Yaşam' },
];

const InputWrap = ({ children, hasError, hasSuccess }) => {
    const ref = React.useRef(null);
    const neutral = hasError
        ? 'rgba(239,68,68,0.50)'
        : hasSuccess
            ? 'var(--color-brand-primary)'
            : 'var(--color-terminal-border-raw)';

    return (
        <div
            ref={ref}
            className="relative flex items-center transition-all duration-200"
            style={{ border: `1px solid ${neutral}`, background: 'rgba(0,0,0,0.25)' }}
            onFocusCapture={() => {
                if (ref.current) {
                    ref.current.style.borderColor = hasError ? 'rgba(239,68,68,0.70)' : 'var(--color-brand-primary)';
                    ref.current.style.boxShadow   = hasError ? '0 0 0 1px rgba(239,68,68,0.35)' : '0 0 0 1px var(--color-brand-primary)';
                }
            }}
            onBlurCapture={() => {
                if (ref.current) {
                    ref.current.style.borderColor = neutral;
                    ref.current.style.boxShadow   = 'none';
                }
            }}
        >
            {children}
        </div>
    );
};

const Register = () => {
    const [email,           setEmail]           = useState('');
    const [username,        setUsername]        = useState('');
    const [password,        setPassword]        = useState('');
    const [confirm,         setConfirm]         = useState('');
    const [showPassword,    setShowPassword]    = useState(false);
    const [showConfirm,     setShowConfirm]     = useState(false);
    const [loading,         setLoading]         = useState(false);
    const [error,           setError]           = useState('');
    const [success,         setSuccess]         = useState(false);
    const [pwTouched,       setPwTouched]       = useState(false);
    const [step,            setStep]            = useState(1);
    const [interests,       setInterests]       = useState([]);       // artık kullanılmıyor (onboarding'e taşındı)
    const [marketingSource, setMarketingSource] = useState('');       // artık kullanılmıyor

    const { register, googleLogin } = useAuth();
    const { isDarkMode }            = useTheme();
    const navigate                  = useNavigate();

    const ruleResults    = useMemo(() => PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) })), [password]);
    const allPassed      = ruleResults.every(r => r.passed);
    const passwordsMatch = confirm.length > 0 && password === confirm;

    const handleGoogleRegister = useGoogleLogin({
        flow: 'implicit',
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            const result = await googleLogin(tokenResponse.access_token);
            if (result.success) {
                navigate(result.needsOnboarding ? '/onboarding' : '/', { replace: true });
            } else {
                setError(result.error || 'Google ile kayıt başarısız.');
                setLoading(false);
            }
        },
        onError: () => setError('Google ile kayıt başarısız.'),
    });

    const handleStep1 = (e) => {
        e.preventDefault();
        setError('');
        if (!allPassed)           { setError('Şifre gereksinimlerini karşılamıyor.'); return; }
        if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
        handleRegister(e);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await register(email, username, password);
        if (result.success) {
            if (result.needsVerification) {
                navigate('/email-verification', { replace: true });
            } else {
                navigate('/onboarding', { replace: true });
            }
        } else {
            setError(result.error || 'Kayıt sırasında bir hata oluştu.');
            setStep(1);
            setLoading(false);
        }
    };

    const toggleInterest = (val) =>
        setInterests(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

    return (
        <div className="relative -mt-32 md:-mt-36 min-h-screen">

            {/* Büyük dekoratif arka plan yazısı */}
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
                <span
                    className="font-manrope font-black uppercase tracking-tighter"
                    style={{ fontSize: 'clamp(80px,18vw,220px)', lineHeight: 1, opacity: isDarkMode ? 0.022 : 0.04, color: 'var(--color-text-primary)' }}
                >
                    KATIL
                </span>
            </div>

            {/* Dikey bölücü çizgi */}
            <div
                className="absolute hidden md:block top-0 bottom-0 left-1/2 w-px pointer-events-none"
                style={{
                    background: 'linear-gradient(to bottom,transparent,rgba(16,185,129,0.12),rgba(16,185,129,0.20),rgba(16,185,129,0.12),transparent)',
                }}
            />

            <div className="relative z-10 min-h-screen grid md:grid-cols-2">

                {/* ── SOL: Marka / Bilgi ── */}
                <div className="hidden md:flex flex-col justify-center px-16 animate-fade-left">

                    <div className="flex items-center gap-2 mb-6">
                        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                        <span className="text-[10px] font-manrope font-black uppercase tracking-[0.22em]"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            Ücretsiz Kayıt
                        </span>
                    </div>

                    <h1
                        className="font-manrope font-extrabold tracking-tighter leading-[0.92] mb-6"
                        style={{ fontSize: 'clamp(3rem,5.5vw,5.5rem)', color: 'var(--color-text-primary)' }}
                    >
                        Ağa<br />
                        <span style={{ color: 'var(--color-brand-primary)' }} className="italic">Katıl.</span>
                    </h1>

                    <p className="text-base leading-relaxed max-w-sm mb-10"
                       style={{ color: 'var(--color-text-primary)', opacity: 0.65 }}>
                        Hesap açın, günde 20 ücretsiz analiz yapın ve tüm analiz geçmişinize erişin.
                    </p>

                    <div className="space-y-3">
                        {[
                            { icon: <BarChart2 className="w-4 h-4" />, title: '20 Günlük Analiz',  desc: 'Her gün sıfırlanan ücretsiz analiz kotası' },
                            { icon: <Clock     className="w-4 h-4" />, title: 'Analiz Geçmişi',    desc: 'Geçmiş analizlerinize istediğiniz zaman erişin' },
                            { icon: <Cpu       className="w-4 h-4" />, title: 'BERT Analizi',       desc: 'Türkçe dilbilimsel sinyal değerlendirmesi' },
                        ].map((f, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-3.5 relative overflow-hidden"
                                style={{
                                    background: 'rgba(16,185,129,0.05)',
                                    border: '1px solid rgba(16,185,129,0.12)',
                                    borderLeft: '2px solid var(--color-brand-primary)',
                                }}
                            >
                                <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }}>{f.icon}</span>
                                <div>
                                    <p className="text-sm font-manrope font-bold" style={{ color: 'var(--color-text-primary)' }}>{f.title}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-primary)', opacity: 0.55 }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── SAĞ: Form ── */}
                <div className="flex items-center justify-center px-6 md:px-16 py-32 md:py-0">
                    <div className="w-full max-w-md animate-fade-right">

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
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Kart */}
                        <div
                            className="p-8 md:p-9 relative overflow-hidden"
                            style={{
                                background: 'var(--color-terminal-surface)',
                                border: '1px solid var(--color-terminal-border-raw)',
                                borderRight: '3px solid var(--color-brand-primary)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                            }}
                        >
                            {/* Köşe aksanları */}
                            <div className="absolute top-0 left-0 w-5 h-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />
                            <div className="absolute top-0 left-0 h-5 w-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />

                            <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] mb-4"
                               style={{ color: 'var(--color-brand-primary)' }}>
                                // Hesap Oluştur
                            </p>


                            {success ? (
                                <div className="flex flex-col items-center gap-4 py-8 animate-fade-up">
                                    <div
                                        className="w-16 h-16 flex items-center justify-center"
                                        style={{
                                            border: '2px solid var(--color-brand-primary)',
                                            background: 'rgba(16,185,129,0.08)',
                                        }}
                                    >
                                        <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--color-brand-primary)' }} />
                                    </div>
                                    <p className="text-lg font-manrope font-bold"
                                       style={{ color: 'var(--color-text-primary)' }}>Hesabınız oluşturuldu!</p>
                                    <p className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                                        Giriş sayfasına yönlendiriliyorsunuz…
                                    </p>
                                </div>
                            ) : (
                                <form
                                    className="space-y-4"
                                    onSubmit={step === 1 ? handleStep1 : handleRegister}
                                    autoComplete="on"
                                >

                                {step === 1 && (<>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest"
                                               style={{ color: 'var(--color-text-primary)' }}>Email</label>
                                        <InputWrap>
                                            <Mail className="absolute left-4 w-4 h-4 pointer-events-none"
                                                  style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                            <input id="email" name="email" type="email" autoComplete="email"
                                                   value={email} onChange={e => setEmail(e.target.value)}
                                                   placeholder="ornek@email.com" required
                                                   className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-4 text-sm"
                                                   style={{ color: 'var(--color-text-primary)' }} />
                                        </InputWrap>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest"
                                               style={{ color: 'var(--color-text-primary)' }}>Kullanıcı Adı</label>
                                        <InputWrap>
                                            <User className="absolute left-4 w-4 h-4 pointer-events-none"
                                                  style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                            <input id="username" name="username" type="text" autoComplete="username"
                                                   value={username} onChange={e => setUsername(e.target.value)}
                                                   placeholder="kullanici_adi" required minLength={3} maxLength={50}
                                                   pattern="[a-zA-Z0-9_]+" title="Yalnızca harf, rakam ve _"
                                                   className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-4 text-sm"
                                                   style={{ color: 'var(--color-text-primary)' }} />
                                        </InputWrap>
                                        <p className="text-[11px] pl-1" style={{ color: 'var(--color-text-primary)', opacity: 0.45 }}>
                                            3-50 karakter · harf, rakam, alt çizgi
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest"
                                               style={{ color: 'var(--color-text-primary)' }}>Şifre</label>
                                        <InputWrap>
                                            <Lock className="absolute left-4 w-4 h-4 pointer-events-none"
                                                  style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                            <input id="new-password" name="new-password"
                                                   type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                                                   value={password} onChange={e => setPassword(e.target.value)}
                                                   onFocus={() => setPwTouched(true)}
                                                   placeholder="••••••••" required minLength={8}
                                                   className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-11 text-sm"
                                                   style={{ color: 'var(--color-text-primary)' }} />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                    className="absolute right-4 transition-opacity hover:opacity-70"
                                                    style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </InputWrap>
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
                                        <label className="block text-xs font-bold uppercase tracking-widest"
                                               style={{ color: 'var(--color-text-primary)' }}>Şifre Tekrar</label>
                                        <InputWrap hasError={confirm.length > 0 && !passwordsMatch} hasSuccess={passwordsMatch}>
                                            <Lock className="absolute left-4 w-4 h-4 pointer-events-none"
                                                  style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }} />
                                            <input id="confirm-password" name="confirm-password"
                                                   type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                                                   value={confirm} onChange={e => setConfirm(e.target.value)}
                                                   placeholder="••••••••" required
                                                   className="w-full bg-transparent border-none outline-none ring-0 py-3.5 pl-11 pr-11 text-sm"
                                                   style={{ color: 'var(--color-text-primary)' }} />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                    className="absolute right-4 transition-opacity hover:opacity-70"
                                                    style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </InputWrap>
                                        {confirm.length > 0 && !passwordsMatch && (
                                            <p className="text-[11px] pl-1 animate-fade-up" style={{ color: '#ef4444' }}>
                                                Şifreler eşleşmiyor
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit" disabled={loading}
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
                                            : <><span>Hesap Oluştur</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                                        }
                                    </button>

                                    {/* Ayraç */}
                                    <div className="flex items-center gap-3 mt-5">
                                        <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
                                        <span className="text-xs" style={{ color: 'var(--color-text-primary)', opacity: 0.4 }}>ya da</span>
                                        <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleGoogleRegister()}
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
                                        <span className="text-sm font-semibold">Google ile Kayıt Ol</span>
                                    </button>
                                </>)}

                                </form>
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-sm" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
                                Hesabınız var mı?{' '}
                                <Link to="/login" className="font-bold hover:underline underline-offset-4"
                                      style={{ color: 'var(--color-brand-primary)' }}>Giriş Yapın</Link>
                            </p>
                            <Link to="/" className="text-[11px] transition-opacity hover:opacity-70"
                                  style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>← Ana Sayfa</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
