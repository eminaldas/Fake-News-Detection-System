import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
    const [username, setUsername]     = useState('');
    const [password, setPassword]     = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');

    const { login } = useAuth();
    const navigate  = useNavigate();
    const location  = useLocation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(username, password, rememberMe);

        if (result.success) {
            const origin = location.state?.from?.pathname || '/';
            navigate(origin, { replace: true });
        } else {
            setError(result.error || 'Geçersiz kimlik bilgileri.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-app-surface rounded-3xl shadow-2xl border border-app-gray overflow-hidden flex flex-col md:flex-row h-[620px] transition-colors duration-300">

                {/* Sol — Marka */}
                <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-app-charcoal via-app-plum to-app-burgundy text-white p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-20" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <ShieldCheck className="h-10 w-10 text-white" />
                            <span className="text-2xl font-bold tracking-tight">FNDS <span className="opacity-50 mx-1">|</span> Portal</span>
                        </div>
                        <h1 className="text-4xl font-black mb-6 leading-tight">Safeguarding <br /> The Truth.</h1>
                        <p className="text-lg opacity-80 max-w-sm">
                            Sahte haberleri tespit eden yapay zeka destekli analiz platformuna hoş geldiniz.
                        </p>
                    </div>
                    <div className="relative z-10 bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-xl border border-white border-opacity-20">
                        <p className="text-sm font-medium opacity-90">
                            "Bilgi çağında doğrulamak en değerli beceridir."
                        </p>
                    </div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 border-4 border-white border-opacity-10 rounded-full" />
                    <div className="absolute -top-12 -right-12 w-48 h-48 border-4 border-white border-opacity-10 rounded-full" />
                </div>

                {/* Sağ — Form */}
                <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-app-bg relative">
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-8 right-8 text-sm font-medium text-app-charcoal opacity-60 hover:opacity-100 transition-opacity"
                    >
                        ← Analizöre dön
                    </button>

                    <div className="mb-10">
                        <h2 className="text-3xl font-extrabold text-app-charcoal mb-2">Tekrar Hoş Geldiniz</h2>
                        <p className="text-app-charcoal opacity-70">
                            Hesabınız yok mu?{' '}
                            <Link to="/register" className="text-app-burgundy font-semibold hover:underline">
                                Kayıt Olun
                            </Link>
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin} autoComplete="on">
                        {error && (
                            <div className="bg-app-burgundy bg-opacity-10 border border-app-burgundy border-opacity-20 p-3 rounded-lg flex items-center gap-2 text-app-burgundy text-sm font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="username" className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">
                                Kullanıcı Adı veya Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-app-charcoal opacity-40" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                    placeholder="kullanici_adi"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="current-password" className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">
                                Şifre
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-app-charcoal opacity-40" />
                                </div>
                                <input
                                    id="current-password"
                                    name="current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Beni Hatırla */}
                        <div className="flex items-center gap-2">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 accent-app-burgundy cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="text-sm text-app-charcoal opacity-70 cursor-pointer select-none">
                                Beni Hatırla (30 gün)
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full bg-app-charcoal hover:opacity-80 disabled:bg-app-gray text-white py-4 rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 mt-2 dark:border dark:border-app-gray"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Giriş Yap
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
