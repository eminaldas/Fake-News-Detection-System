import React, { useState, useMemo } from 'react';
import { Mail, User, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2,
         Eye, EyeOff, Check, X, BarChart2, Clock, Cpu } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ─── Şifre kuralları ─────────────────────────────────────────────── */
const PASSWORD_RULES = [
    { id:'length', label:'En az 8 karakter',  test: p => p.length >= 8 },
    { id:'letter', label:'En az 1 harf',       test: p => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(p) },
    { id:'digit',  label:'En az 1 rakam',      test: p => /\d/.test(p) },
];

/* ─── Floating particles ─────────────────────────────────────────── */
const PARTICLES = [
    { left:'5%',  bottom:'20%', size:2, dur:'9s',  delay:'0s'   },
    { left:'15%', bottom:'50%', size:1, dur:'12s', delay:'1s'   },
    { left:'28%', bottom:'30%', size:2, dur:'8s',  delay:'2.5s' },
    { left:'40%', bottom:'65%', size:1, dur:'14s', delay:'0.5s' },
    { left:'52%', bottom:'15%', size:2, dur:'10s', delay:'3s'   },
    { left:'63%', bottom:'42%', size:1, dur:'11s', delay:'4.5s' },
    { left:'74%', bottom:'28%', size:2, dur:'7s',  delay:'1.5s' },
    { left:'82%', bottom:'58%', size:1, dur:'13s', delay:'2s'   },
    { left:'90%', bottom:'35%', size:2, dur:'9s',  delay:'5s'   },
    { left:'20%', bottom:'75%', size:1, dur:'10s', delay:'3.5s' },
    { left:'48%', bottom:'82%', size:2, dur:'12s', delay:'0.8s' },
    { left:'68%', bottom:'72%', size:1, dur:'8s',  delay:'6s'   },
    { left:'35%', bottom:'88%', size:2, dur:'11s', delay:'2.2s' },
];

const AuthBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#070f12]" />
        <div className="absolute inset-0" style={{
            backgroundImage:
                'linear-gradient(rgba(65,73,77,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(65,73,77,0.09) 1px,transparent 1px)',
            backgroundSize:'40px 40px',
        }} />

        {/* Işık topları — register için simetrik yer değişimi */}
        <div className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full animate-blob-1"
             style={{ background:'rgba(63,255,139,0.065)', filter:'blur(110px)' }} />
        <div className="absolute -bottom-32 left-1/4 w-[480px] h-[480px] rounded-full animate-blob-2"
             style={{ background:'rgba(84,224,253,0.05)', filter:'blur(100px)' }} />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] rounded-full animate-blob-3"
             style={{ background:'rgba(30,233,182,0.04)', filter:'blur(80px)' }} />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px animate-scan"
             style={{ background:'linear-gradient(90deg,transparent,rgba(63,255,139,0.15),transparent)' }} />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
            <div key={i} className="absolute rounded-full"
                 style={{
                     left:p.left, bottom:p.bottom,
                     width:p.size, height:p.size,
                     background:'#3fff8b',
                     animation:`particleRise ${p.dur} ${p.delay} ease-in-out infinite`,
                 }} />
        ))}

        {/* Büyük arka plan yazısı */}
        <div className="absolute inset-0 flex items-center justify-center select-none">
            <span className="font-manrope font-black uppercase tracking-tighter select-none"
                  style={{ fontSize:'clamp(80px,18vw,220px)', lineHeight:1, opacity:0.022, color:'#f0f8fc' }}>
                KATIL
            </span>
        </div>

        {/* Dikey bölücü çizgi */}
        <div className="absolute hidden md:block top-0 bottom-0 left-1/2 w-px"
             style={{ background:'linear-gradient(to bottom,transparent,rgba(63,255,139,0.08),rgba(63,255,139,0.12),rgba(63,255,139,0.08),transparent)' }} />
    </div>
);

/* ─── Input sarmalayıcısı ─────────────────────────────────────────── */
const InputWrap = ({ children, hasError, hasSuccess }) => {
    const base = hasError
        ? 'rgba(255,115,81,0.55)'
        : hasSuccess
            ? 'rgba(63,255,139,0.55)'
            : 'rgba(65,73,77,0.45)';

    return (
        <div
            className="relative flex items-center rounded-xl transition-all duration-200 border"
            style={{ borderColor:base, background:'rgba(7,15,18,0.6)' }}
            onFocus={e => {
                e.currentTarget.style.borderColor = hasError ? 'rgba(255,115,81,0.9)' : '#3fff8b';
                e.currentTarget.style.boxShadow   = hasError
                    ? '0 0 18px rgba(255,115,81,0.12)'
                    : '0 0 18px rgba(63,255,139,0.14)';
            }}
            onBlur={e => {
                e.currentTarget.style.borderColor = base;
                e.currentTarget.style.boxShadow   = 'none';
            }}
        >
            {children}
        </div>
    );
};

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

    const { register } = useAuth();
    const navigate     = useNavigate();

    const ruleResults    = useMemo(() => PASSWORD_RULES.map(r => ({ ...r, passed:r.test(password) })), [password]);
    const allPassed      = ruleResults.every(r => r.passed);
    const passwordsMatch = confirm.length > 0 && password === confirm;

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (!allPassed)        { setError('Şifre gereksinimlerini karşılamıyor.'); return; }
        if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
        setLoading(true);
        const result = await register(email, username, password);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } else {
            setError(result.error || 'Kayıt sırasında bir hata oluştu.');
            setLoading(false);
        }
    };

    return (
        <div className="relative -mt-24 md:-mt-28 min-h-screen overflow-hidden">
            <AuthBackground />

            {/* İki kolonlu grid — Register: sol yazı, sağ form */}
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

                    <h1 className="font-manrope font-extrabold tracking-tighter leading-[0.92] text-[#f0f8fc] mb-6"
                        style={{ fontSize:'clamp(3rem,5.5vw,5.5rem)' }}>
                        Ağa<br />
                        <span className="text-es-primary italic">Katıl.</span>
                    </h1>

                    <p className="text-[#a4acb0] text-lg leading-relaxed max-w-sm mb-10">
                        Hesap açın, günde 20 ücretsiz analiz yapın ve tüm analiz geçmişinize erişin.
                    </p>

                    {/* Feature kartları */}
                    <div className="space-y-3">
                        {[
                            { icon:<BarChart2 className="w-4 h-4"/>, title:'20 Günlük Analiz',  desc:'Her gün sıfırlanan ücretsiz analiz kotası' },
                            { icon:<Clock     className="w-4 h-4"/>, title:'Analiz Geçmişi',    desc:'Geçmiş analizlerinize istediğiniz zaman erişin' },
                            { icon:<Cpu       className="w-4 h-4"/>, title:'BERT Analizi',       desc:'Türkçe dilbilimsel sinyal değerlendirmesi' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl"
                                 style={{ background:'rgba(63,255,139,0.03)', border:'1px solid rgba(63,255,139,0.08)' }}>
                                <span className="text-es-primary mt-0.5 shrink-0">{f.icon}</span>
                                <div>
                                    <p className="text-[#f0f8fc] text-sm font-manrope font-bold">{f.title}</p>
                                    <p className="text-[#a4acb0]/70 text-xs font-inter mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── SAĞ: Form ── */}
                <div className="flex items-center justify-center px-6 md:px-16 py-32 md:py-0">
                    <div className="w-full max-w-md animate-fade-right">

                        {/* Hata */}
                        {error && (
                            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl
                                            border border-es-error/30 bg-es-error/8 text-es-error
                                            text-sm font-inter animate-fade-up">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Kart */}
                        <div className="p-8 md:p-9 rounded-xl"
                             style={{
                                 background:'rgba(17,27,31,0.78)',
                                 backdropFilter:'blur(28px)',
                                 WebkitBackdropFilter:'blur(28px)',
                                 border:'1px solid rgba(63,255,139,0.13)',
                                 borderRight:'4px solid #3fff8b',
                                 borderLeft:'1px solid rgba(63,255,139,0.13)',
                                 boxShadow:'0 24px 64px rgba(0,0,0,0.6)',
                             }}>

                            <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em]
                                          text-es-primary mb-6">
                                Hesap Oluştur
                            </p>

                            {success ? (
                                <div className="flex flex-col items-center gap-4 py-8 animate-fade-up">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                         style={{ background:'rgba(63,255,139,0.08)', border:'1px solid rgba(63,255,139,0.2)' }}>
                                        <CheckCircle2 className="w-8 h-8 text-es-primary" />
                                    </div>
                                    <p className="text-lg font-manrope font-bold text-[#f0f8fc]">Hesabınız oluşturuldu!</p>
                                    <p className="text-sm text-[#a4acb0] font-inter">Giriş sayfasına yönlendiriliyorsunuz…</p>
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={handleRegister} autoComplete="on">

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-[#a4acb0]">
                                            Email
                                        </label>
                                        <InputWrap>
                                            <Mail className="absolute left-4 w-4 h-4 text-[#a4acb0]/60 pointer-events-none" />
                                            <input
                                                id="email" name="email" type="email"
                                                autoComplete="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="ornek@email.com"
                                                required
                                                className="w-full bg-transparent border-none outline-none ring-0
                                                           py-3.5 pl-11 pr-4 text-sm text-[#f0f8fc] font-inter
                                                           placeholder:text-[rgba(164,172,176,0.3)]"
                                            />
                                        </InputWrap>
                                    </div>

                                    {/* Kullanıcı Adı */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-[#a4acb0]">
                                            Kullanıcı Adı
                                        </label>
                                        <InputWrap>
                                            <User className="absolute left-4 w-4 h-4 text-[#a4acb0]/60 pointer-events-none" />
                                            <input
                                                id="username" name="username" type="text"
                                                autoComplete="username"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                                placeholder="kullanici_adi"
                                                required minLength={3} maxLength={50}
                                                pattern="[a-zA-Z0-9_]+"
                                                title="Yalnızca harf, rakam ve _"
                                                className="w-full bg-transparent border-none outline-none ring-0
                                                           py-3.5 pl-11 pr-4 text-sm text-[#f0f8fc] font-inter
                                                           placeholder:text-[rgba(164,172,176,0.3)]"
                                            />
                                        </InputWrap>
                                        <p className="text-[10px] text-[rgba(164,172,176,0.45)] font-inter pl-1">
                                            3-50 karakter · harf, rakam, alt çizgi
                                        </p>
                                    </div>

                                    {/* Şifre */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-[#a4acb0]">
                                            Şifre
                                        </label>
                                        <InputWrap>
                                            <Lock className="absolute left-4 w-4 h-4 text-[#a4acb0]/60 pointer-events-none" />
                                            <input
                                                id="new-password" name="new-password"
                                                type={showPassword ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                onFocus={() => setPwTouched(true)}
                                                placeholder="••••••••"
                                                required minLength={8}
                                                className="w-full bg-transparent border-none outline-none ring-0
                                                           py-3.5 pl-11 pr-11 text-sm text-[#f0f8fc] font-inter
                                                           placeholder:text-[rgba(164,172,176,0.3)]"
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                    className="absolute right-4 text-[#a4acb0]/60 hover:text-es-primary transition-colors">
                                                {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                            </button>
                                        </InputWrap>
                                        {pwTouched && (
                                            <div className="flex flex-col gap-1 pt-1 pl-1 animate-fade-up">
                                                {ruleResults.map(r => (
                                                    <div key={r.id} className="flex items-center gap-1.5">
                                                        {r.passed
                                                            ? <Check className="w-3 h-3 text-es-primary shrink-0"/>
                                                            : <X     className="w-3 h-3 text-es-error   shrink-0"/>
                                                        }
                                                        <span className={`text-[11px] font-inter transition-colors ${r.passed ? 'text-es-primary' : 'text-[#a4acb0]'}`}>
                                                            {r.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Şifre Tekrar */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-[#a4acb0]">
                                            Şifre Tekrar
                                        </label>
                                        <InputWrap
                                            hasError={confirm.length > 0 && !passwordsMatch}
                                            hasSuccess={passwordsMatch}
                                        >
                                            <Lock className="absolute left-4 w-4 h-4 text-[#a4acb0]/60 pointer-events-none" />
                                            <input
                                                id="confirm-password" name="confirm-password"
                                                type={showConfirm ? 'text' : 'password'}
                                                autoComplete="new-password"
                                                value={confirm}
                                                onChange={e => setConfirm(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="w-full bg-transparent border-none outline-none ring-0
                                                           py-3.5 pl-11 pr-11 text-sm text-[#f0f8fc] font-inter
                                                           placeholder:text-[rgba(164,172,176,0.3)]"
                                            />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                    className="absolute right-4 text-[#a4acb0]/60 hover:text-es-primary transition-colors">
                                                {showConfirm ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                            </button>
                                        </InputWrap>
                                        {confirm.length > 0 && !passwordsMatch && (
                                            <p className="text-[11px] text-es-error font-inter pl-1 animate-fade-up">
                                                Şifreler eşleşmiyor
                                            </p>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit" disabled={loading}
                                        className="group w-full mt-1 py-4 rounded-xl font-manrope font-black
                                                   text-[11px] uppercase tracking-[0.2em] text-[#070f12]
                                                   bg-es-primary hover:opacity-90 disabled:opacity-50
                                                   transition-all duration-200 flex items-center justify-center gap-2
                                                   active:scale-[0.98]"
                                        style={{ boxShadow:'0 10px 32px rgba(63,255,139,0.22)' }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 16px 40px rgba(63,255,139,0.32)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow='0 10px 32px rgba(63,255,139,0.22)'; e.currentTarget.style.transform=''; }}
                                    >
                                        {loading
                                            ? <Loader2 className="w-4 h-4 animate-spin"/>
                                            : <><span>Hesap Oluştur</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>
                                        }
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Alt linkler */}
                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-[#a4acb0] text-sm font-inter">
                                Hesabınız var mı?{' '}
                                <Link to="/login" className="text-es-primary font-bold hover:underline underline-offset-4">
                                    Giriş Yapın
                                </Link>
                            </p>
                            <Link to="/" className="text-[11px] font-inter text-[#a4acb0]/50 hover:text-es-primary transition-colors">
                                ← Ana Sayfa
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
