import React, { useState, useMemo } from 'react';
import { Mail, User, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2,
         Eye, EyeOff, Check, X, BarChart2, Clock, Cpu } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/* ─── Şifre kuralları ─────────────────────────────────────────────── */
const PASSWORD_RULES = [
    { id:'length', label:'En az 8 karakter',  test: p => p.length >= 8 },
    { id:'letter', label:'En az 1 harf',       test: p => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(p) },
    { id:'digit',  label:'En az 1 rakam',      test: p => /\d/.test(p) },
];

/* ─── Input sarmalayıcısı ─────────────────────────────────────────── */
const InputWrap = ({ children, hasError, hasSuccess }) => {
    const borderColor = hasError
        ? 'var(--color-es-error)'
        : hasSuccess
            ? 'var(--color-es-primary)'
            : 'var(--color-border)';

    return (
        <div
            className="relative flex items-center rounded-xl transition-all duration-200 bg-surface-solid"
            style={{ border: `1px solid ${borderColor}` }}
            onFocus={e => {
                e.currentTarget.style.borderColor = hasError ? 'var(--color-es-error)' : 'var(--color-brand-primary)';
                e.currentTarget.style.boxShadow   = hasError
                    ? '0 0 0 1px var(--color-es-error)'
                    : '0 0 0 1px var(--color-brand-primary)';
            }}
            onBlur={e => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow   = 'none';
            }}
        >
            {children}
        </div>
    );
};

const INTEREST_OPTIONS = [
    { value: 'gündem',    label: '📰 Gündem' },
    { value: 'ekonomi',   label: '📈 Ekonomi' },
    { value: 'spor',      label: '⚽ Spor' },
    { value: 'sağlık',    label: '🏥 Sağlık' },
    { value: 'teknoloji', label: '💻 Teknoloji' },
    { value: 'kültür',    label: '🎭 Kültür' },
    { value: 'yaşam',     label: '🌱 Yaşam' },
];

/* ─── Register ───────────────────────────────────────────────────── */
const Register = () => {
    const [email, setEmail]               = useState('');
    const [username, setUsername]         = useState('');
    const [password, setPassword]         = useState('');
    const [confirm, setConfirm]           = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [success, setSuccess]           = useState(false);
    const [pwTouched, setPwTouched]       = useState(false);
    const [step, setStep]                 = useState(1);
    const [interests, setInterests]       = useState([]);
    const [marketingSource, setMarketingSource] = useState('');

    const { register }   = useAuth();
    const { isDarkMode } = useTheme();
    const navigate       = useNavigate();

    const ruleResults    = useMemo(() => PASSWORD_RULES.map(r => ({ ...r, passed:r.test(password) })), [password]);
    const allPassed      = ruleResults.every(r => r.passed);
    const passwordsMatch = confirm.length > 0 && password === confirm;

    const handleStep1 = (e) => {
        e.preventDefault();
        setError('');
        if (!allPassed)           { setError('Şifre gereksinimlerini karşılamıyor.'); return; }
        if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
        setStep(2);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await register(email, username, password, interests, marketingSource || null);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } else {
            setError(result.error || 'Kayıt sırasında bir hata oluştu.');
            setStep(1);
            setLoading(false);
        }
    };

    const toggleInterest = (val) => {
        setInterests(prev =>
            prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
        );
    };

    return (
        <div className="relative -mt-24 md:-mt-28 min-h-screen">

            {/* Büyük dekoratif arka plan yazısı */}
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
                <span className="font-manrope font-black uppercase tracking-tighter text-tx-primary"
                      style={{ fontSize:'clamp(80px,18vw,220px)', lineHeight:1, opacity: isDarkMode ? 0.022 : 0.04 }}>
                    KATIL
                </span>
            </div>

            {/* Dikey bölücü çizgi */}
            <div className="absolute hidden md:block top-0 bottom-0 left-1/2 w-px pointer-events-none"
                 style={{
                     background: isDarkMode
                         ? 'linear-gradient(to bottom,transparent,rgba(63,255,139,0.08),rgba(63,255,139,0.12),rgba(63,255,139,0.08),transparent)'
                         : 'linear-gradient(to bottom,transparent,var(--color-border),var(--color-border),transparent)',
                 }} />

            {/* İki kolonlu grid — sol yazı, sağ form */}
            <div className="relative z-10 min-h-screen grid md:grid-cols-2">

                {/* ── SOL: Yazı / Marka ── */}
                <div className="hidden md:flex flex-col justify-center px-16 animate-fade-left">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full w-fit mb-6
                                     bg-es-secondary/10 border border-es-secondary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-es-secondary animate-pulse-soft" />
                        <span className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] text-es-secondary">
                            Ücretsiz Kayıt
                        </span>
                    </span>

                    <h1 className="font-manrope font-extrabold tracking-tighter leading-[0.92] text-tx-primary mb-6"
                        style={{ fontSize:'clamp(3rem,5.5vw,5.5rem)' }}>
                        Ağa<br />
                        <span className="text-brand italic">Katıl.</span>
                    </h1>

                    <p className="text-tx-secondary text-lg leading-relaxed max-w-sm mb-10">
                        Hesap açın, günde 20 ücretsiz analiz yapın ve tüm analiz geçmişinize erişin.
                    </p>

                    <div className="space-y-3">
                        {[
                            { icon:<BarChart2 className="w-4 h-4"/>, title:'20 Günlük Analiz',  desc:'Her gün sıfırlanan ücretsiz analiz kotası' },
                            { icon:<Clock     className="w-4 h-4"/>, title:'Analiz Geçmişi',    desc:'Geçmiş analizlerinize istediğiniz zaman erişin' },
                            { icon:<Cpu       className="w-4 h-4"/>, title:'BERT Analizi',       desc:'Türkçe dilbilimsel sinyal değerlendirmesi' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-brand/5 border border-brand/10">
                                <span className="text-brand mt-0.5 shrink-0">{f.icon}</span>
                                <div>
                                    <p className="text-tx-primary text-sm font-manrope font-bold">{f.title}</p>
                                    <p className="text-muted text-xs font-inter mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── SAĞ: Form ── */}
                <div className="flex items-center justify-center px-6 md:px-16 py-32 md:py-0">
                    <div className="w-full max-w-md animate-fade-right">

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
                                 borderRight: '4px solid var(--color-brand-primary)',
                                 borderLeft: isDarkMode
                                     ? '1px solid rgba(63,255,139,0.13)'
                                     : '1px solid var(--color-border)',
                                 boxShadow: isDarkMode
                                     ? '0 24px 64px rgba(0,0,0,0.6)'
                                     : '0 8px 32px rgba(0,0,0,0.07)',
                             }}>

                            <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] text-brand mb-4">
                                Hesap Oluştur
                            </p>

                            <div className="flex gap-1.5 mb-6">
                                {[1, 2, 3].map(s => (
                                    <div
                                        key={s}
                                        className="flex-1 h-1 rounded-full transition-all duration-300"
                                        style={{
                                            background: s <= step
                                                ? 'var(--color-brand-primary)'
                                                : 'var(--color-border)',
                                            opacity: s <= step ? 1 : 0.3,
                                        }}
                                    />
                                ))}
                            </div>

                            {success ? (
                                <div className="flex flex-col items-center gap-4 py-8 animate-fade-up">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-brand/8 border border-brand/20">
                                        <CheckCircle2 className="w-8 h-8 text-brand" />
                                    </div>
                                    <p className="text-lg font-manrope font-bold text-tx-primary">Hesabınız oluşturuldu!</p>
                                    <p className="text-sm text-tx-secondary font-inter">Giriş sayfasına yönlendiriliyorsunuz…</p>
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={step === 1 ? handleStep1 : handleRegister} autoComplete="on">

                                {step === 1 && (<>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-tx-secondary">Email</label>
                                        <InputWrap>
                                            <Mail className="absolute left-4 w-4 h-4 text-muted pointer-events-none" />
                                            <input id="email" name="email" type="email" autoComplete="email"
                                                   value={email} onChange={e => setEmail(e.target.value)}
                                                   placeholder="ornek@email.com" required
                                                   className="w-full bg-transparent border-none outline-none ring-0
                                                              py-3.5 pl-11 pr-4 text-sm text-tx-primary font-inter placeholder:text-muted" />
                                        </InputWrap>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-tx-secondary">Kullanıcı Adı</label>
                                        <InputWrap>
                                            <User className="absolute left-4 w-4 h-4 text-muted pointer-events-none" />
                                            <input id="username" name="username" type="text" autoComplete="username"
                                                   value={username} onChange={e => setUsername(e.target.value)}
                                                   placeholder="kullanici_adi" required minLength={3} maxLength={50}
                                                   pattern="[a-zA-Z0-9_]+" title="Yalnızca harf, rakam ve _"
                                                   className="w-full bg-transparent border-none outline-none ring-0
                                                              py-3.5 pl-11 pr-4 text-sm text-tx-primary font-inter placeholder:text-muted" />
                                        </InputWrap>
                                        <p className="text-[10px] text-muted font-inter pl-1">3-50 karakter · harf, rakam, alt çizgi</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-tx-secondary">Şifre</label>
                                        <InputWrap>
                                            <Lock className="absolute left-4 w-4 h-4 text-muted pointer-events-none" />
                                            <input id="new-password" name="new-password"
                                                   type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                                                   value={password} onChange={e => setPassword(e.target.value)}
                                                   onFocus={() => setPwTouched(true)}
                                                   placeholder="••••••••" required minLength={8}
                                                   className="w-full bg-transparent border-none outline-none ring-0
                                                              py-3.5 pl-11 pr-11 text-sm text-tx-primary font-inter placeholder:text-muted" />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                    className="absolute right-4 text-muted hover:text-brand transition-colors">
                                                {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                            </button>
                                        </InputWrap>
                                        {pwTouched && (
                                            <div className="flex flex-col gap-1 pt-1 pl-1 animate-fade-up">
                                                {ruleResults.map(r => (
                                                    <div key={r.id} className="flex items-center gap-1.5">
                                                        {r.passed
                                                            ? <Check className="w-3 h-3 text-es-primary shrink-0"/>
                                                            : <X     className="w-3 h-3 text-es-error   shrink-0"/>}
                                                        <span className={`text-[11px] font-inter ${r.passed ? 'text-es-primary' : 'text-tx-secondary'}`}>
                                                            {r.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-tx-secondary">Şifre Tekrar</label>
                                        <InputWrap hasError={confirm.length > 0 && !passwordsMatch} hasSuccess={passwordsMatch}>
                                            <Lock className="absolute left-4 w-4 h-4 text-muted pointer-events-none" />
                                            <input id="confirm-password" name="confirm-password"
                                                   type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                                                   value={confirm} onChange={e => setConfirm(e.target.value)}
                                                   placeholder="••••••••" required
                                                   className="w-full bg-transparent border-none outline-none ring-0
                                                              py-3.5 pl-11 pr-11 text-sm text-tx-primary font-inter placeholder:text-muted" />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                    className="absolute right-4 text-muted hover:text-brand transition-colors">
                                                {showConfirm ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                            </button>
                                        </InputWrap>
                                        {confirm.length > 0 && !passwordsMatch && (
                                            <p className="text-[11px] text-es-error font-inter pl-1 animate-fade-up">Şifreler eşleşmiyor</p>
                                        )}
                                    </div>

                                    <button type="submit" disabled={loading}
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
                                            }}>
                                        {loading
                                            ? <Loader2 className="w-4 h-4 animate-spin"/>
                                            : <><span>Devam Et</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>}
                                    </button>
                                </>)}

                                {step === 2 && (
                                    <div className="space-y-4 animate-fade-up">
                                        <p className="text-sm text-tx-secondary text-center">
                                            İlgi alanlarını seç — öneriler buna göre kişiselleşir. Atlamak için direkt devam edebilirsin.
                                        </p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {INTEREST_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => toggleInterest(opt.value)}
                                                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                                                        interests.includes(opt.value)
                                                            ? 'bg-brand text-surface border-brand'
                                                            : 'border-brutal-border text-tx-secondary hover:border-brand'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setStep(1)}
                                                className="flex-1 py-2 rounded-xl border border-brutal-border text-tx-secondary text-sm hover:bg-base transition-colors">
                                                Geri
                                            </button>
                                            <button type="button" onClick={() => setStep(3)}
                                                className="flex-1 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                                                style={{ background: 'var(--color-brand-primary)', color: isDarkMode ? '#070f12' : '#ffffff' }}>
                                                Devam Et
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-4 animate-fade-up">
                                        <p className="text-sm text-tx-secondary text-center">
                                            Bizi nereden duydunuz? (isteğe bağlı)
                                        </p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {[
                                                'Sosyal Medya',
                                                'Arkadaş Tavsiyesi',
                                                'Arama Motoru',
                                                'Haber / Blog',
                                                'Diğer',
                                            ].map(opt => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() =>
                                                        setMarketingSource(prev => (prev === opt ? '' : opt))
                                                    }
                                                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                                                        marketingSource === opt
                                                            ? 'bg-brand text-surface border-brand'
                                                            : 'border-brutal-border text-tx-secondary hover:border-brand'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="flex-1 py-2 rounded-xl border border-brutal-border text-tx-secondary text-sm hover:bg-base transition-colors"
                                            >
                                                Geri
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                                style={{
                                                    background: 'var(--color-brand-primary)',
                                                    color: isDarkMode ? '#070f12' : '#ffffff',
                                                }}
                                            >
                                                {loading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                                ) : (
                                                    'Kaydı Tamamla'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                </form>
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-tx-secondary text-sm font-inter">
                                Hesabınız var mı?{' '}
                                <Link to="/login" className="text-brand font-bold hover:underline underline-offset-4">Giriş Yapın</Link>
                            </p>
                            <Link to="/" className="text-[11px] font-inter text-muted hover:text-brand transition-colors">← Ana Sayfa</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
