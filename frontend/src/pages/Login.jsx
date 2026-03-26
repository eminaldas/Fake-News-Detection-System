import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ─── Floating particles ─────────────────────────────────────────── */
const PARTICLES = [
    { left:'8%',  bottom:'15%', size:2, dur:'8s',  delay:'0s'   },
    { left:'18%', bottom:'35%', size:1, dur:'11s', delay:'2s'   },
    { left:'30%', bottom:'20%', size:2, dur:'9s',  delay:'1s'   },
    { left:'42%', bottom:'60%', size:1, dur:'13s', delay:'3.5s' },
    { left:'55%', bottom:'10%', size:2, dur:'7s',  delay:'0.5s' },
    { left:'65%', bottom:'45%', size:1, dur:'10s', delay:'4s'   },
    { left:'75%', bottom:'25%', size:2, dur:'12s', delay:'1.5s' },
    { left:'85%', bottom:'55%', size:1, dur:'9s',  delay:'2.5s' },
    { left:'92%', bottom:'30%', size:2, dur:'14s', delay:'0.8s' },
    { left:'22%', bottom:'70%', size:1, dur:'10s', delay:'6s'   },
    { left:'50%', bottom:'80%', size:2, dur:'8s',  delay:'3s'   },
    { left:'70%', bottom:'75%', size:1, dur:'11s', delay:'5s'   },
];

const AuthBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Zemin */}
        <div className="absolute inset-0 bg-[#070f12]" />

        {/* Grid */}
        <div className="absolute inset-0" style={{
            backgroundImage:
                'linear-gradient(rgba(65,73,77,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(65,73,77,0.09) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
        }} />

        {/* Işık topları — animate */}
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full animate-blob-1"
             style={{ background:'rgba(63,255,139,0.07)', filter:'blur(110px)' }} />
        <div className="absolute -bottom-32 right-1/4 w-[480px] h-[480px] rounded-full animate-blob-2"
             style={{ background:'rgba(84,224,253,0.055)', filter:'blur(100px)' }} />
        <div className="absolute top-1/3 right-0 w-[320px] h-[320px] rounded-full animate-blob-3"
             style={{ background:'rgba(30,233,182,0.04)', filter:'blur(80px)' }} />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px animate-scan"
             style={{ background:'linear-gradient(90deg,transparent,rgba(63,255,139,0.15),transparent)' }} />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
            <div key={i} className="absolute rounded-full"
                 style={{
                     left: p.left, bottom: p.bottom,
                     width: p.size, height: p.size,
                     background: '#3fff8b',
                     animation: `particleRise ${p.dur} ${p.delay} ease-in-out infinite`,
                 }} />
        ))}

        {/* Büyük arka plan yazısı */}
        <div className="absolute inset-0 flex items-center justify-center select-none">
            <span className="font-manrope font-black uppercase tracking-tighter select-none"
                  style={{ fontSize:'clamp(80px,18vw,220px)', lineHeight:1, opacity:0.022, color:'#f0f8fc' }}>
                HABER
            </span>
        </div>

        {/* Dikey ince çizgi — ortada bölücü */}
        <div className="absolute hidden md:block top-0 bottom-0 left-1/2 w-px"
             style={{ background:'linear-gradient(to bottom,transparent,rgba(63,255,139,0.08),rgba(63,255,139,0.12),rgba(63,255,139,0.08),transparent)' }} />
    </div>
);

/* ─── Input sarmalayıcısı ─────────────────────────────────────────── */
const InputWrap = ({ children }) => (
    <div
        className="relative flex items-center rounded-xl transition-all duration-200 border"
        style={{ borderColor:'rgba(65,73,77,0.45)', background:'rgba(7,15,18,0.6)' }}
        onFocus={e => { e.currentTarget.style.borderColor='#3fff8b'; e.currentTarget.style.boxShadow='0 0 18px rgba(63,255,139,0.14)'; }}
        onBlur ={e => { e.currentTarget.style.borderColor='rgba(65,73,77,0.45)'; e.currentTarget.style.boxShadow='none'; }}
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

    const { login } = useAuth();
    const navigate  = useNavigate();
    const location  = useLocation();

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
        <div className="relative -mt-24 md:-mt-28 min-h-screen overflow-hidden">
            <AuthBackground />

            {/* İki kolonlu grid */}
            <div className="relative z-10 min-h-screen grid md:grid-cols-2">

                {/* ── SOL: Form ── */}
                <div className="flex items-center justify-center px-6 md:px-16 py-32 md:py-0">
                    <div className="w-full max-w-md animate-fade-up">

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
                                 borderLeft:'4px solid #3fff8b',
                                 boxShadow:'0 24px 64px rgba(0,0,0,0.6)',
                             }}>

                            <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em]
                                          text-es-primary mb-6">
                                Kimlik Doğrulama
                            </p>

                            <form className="space-y-5" onSubmit={handleLogin} autoComplete="on">

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
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0
                                                       py-3.5 pl-11 pr-4 text-sm text-[#f0f8fc] font-inter
                                                       placeholder:text-[rgba(164,172,176,0.3)]"
                                        />
                                    </InputWrap>
                                </div>

                                {/* Şifre */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-manrope font-black uppercase tracking-[0.18em] text-[#a4acb0]">
                                        Şifre
                                    </label>
                                    <InputWrap>
                                        <Lock className="absolute left-4 w-4 h-4 text-[#a4acb0]/60 pointer-events-none" />
                                        <input
                                            id="current-password" name="current-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full bg-transparent border-none outline-none ring-0
                                                       py-3.5 pl-11 pr-11 text-sm text-[#f0f8fc] font-inter
                                                       placeholder:text-[rgba(164,172,176,0.3)]"
                                        />
                                        <button type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-4 text-[#a4acb0]/60 hover:text-es-primary transition-colors">
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
                                        <div className="w-4 h-4 rounded border border-[rgba(65,73,77,0.6)]
                                                        bg-[rgba(7,15,18,0.5)] transition-all
                                                        peer-checked:bg-es-primary peer-checked:border-es-primary
                                                        flex items-center justify-center">
                                            {rememberMe && (
                                                <svg className="w-2.5 h-2.5 text-[#070f12]" fill="none" viewBox="0 0 12 12">
                                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                                                          strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm text-[#a4acb0] group-hover:text-[#f0f8fc] transition-colors font-inter">
                                        Beni Hatırla <span className="opacity-50">(30 gün)</span>
                                    </span>
                                </label>

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
                                        : <><span>Giriş Yap</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>
                                    }
                                </button>
                            </form>
                        </div>

                        {/* Alt linkler */}
                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-[#a4acb0] text-sm font-inter">
                                Hesabınız yok mu?{' '}
                                <Link to="/register" className="text-es-primary font-bold hover:underline underline-offset-4">
                                    Kayıt Olun
                                </Link>
                            </p>
                            <Link to="/" className="text-[11px] font-inter text-[#a4acb0]/50 hover:text-es-primary transition-colors">
                                ← Ana Sayfa
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── SAĞ: Yazı / Marka ── */}
                <div className="hidden md:flex flex-col justify-center px-16 animate-fade-right">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full w-fit mb-6
                                     bg-es-primary/10 border border-es-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-es-primary animate-pulse-soft" />
                        <span className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] text-es-primary">
                            Yapay Zeka Destekli
                        </span>
                    </span>

                    <h1 className="font-manrope font-extrabold tracking-tighter leading-[0.92] text-[#f0f8fc] mb-6"
                        style={{ fontSize:'clamp(3rem,5.5vw,5.5rem)' }}>
                        Gerçeği<br />
                        <span className="text-es-primary italic">Keşfet.</span>
                    </h1>

                    <p className="text-[#a4acb0] text-lg leading-relaxed max-w-sm mb-10">
                        Bilgi kirliliğinin ötesine geçin. Şüpheli haberleri yapay zeka ile saniyeler içinde analiz edin.
                    </p>

                    {/* Feature list */}
                    <div className="space-y-3">
                        {[
                            { icon: <ShieldCheck className="w-4 h-4" />, text: 'BERT tabanlı Türkçe dil analizi' },
                            { icon: <ShieldCheck className="w-4 h-4" />, text: 'Anlık kaynak doğrulama' },
                            { icon: <ShieldCheck className="w-4 h-4" />, text: 'Analiz geçmişi ve istatistikler' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-es-primary">{f.icon}</span>
                                <span className="text-[#a4acb0] text-sm font-inter">{f.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Dekoratif quote */}
                    <div className="mt-12 p-5 rounded-xl"
                         style={{ background:'rgba(63,255,139,0.04)', border:'1px solid rgba(63,255,139,0.1)' }}>
                        <p className="text-[#a4acb0]/80 text-sm font-inter italic leading-relaxed">
                            "Bilgi çağında doğrulamak en değerli beceridir."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
