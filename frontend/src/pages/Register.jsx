import React, { useState } from 'react';
import { ShieldCheck, Mail, User, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
    const [email, setEmail]         = useState('');
    const [username, setUsername]   = useState('');
    const [password, setPassword]   = useState('');
    const [confirm, setConfirm]     = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [success, setSuccess]     = useState(false);

    const { register } = useAuth();
    const navigate     = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        setLoading(true);
        const result = await register(email, username, password);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } else {
            setError(result.error || 'Kayıt sırasında bir hata oluştu.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-app-surface rounded-3xl shadow-2xl border border-app-gray overflow-hidden flex flex-col md:flex-row transition-colors duration-300" style={{ minHeight: '680px' }}>

                {/* Sol — Marka */}
                <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-app-charcoal via-app-plum to-app-burgundy text-white p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-20" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <ShieldCheck className="h-10 w-10 text-white" />
                            <span className="text-2xl font-bold tracking-tight">FNDS <span className="opacity-50 mx-1">|</span> Kayıt</span>
                        </div>
                        <h1 className="text-4xl font-black mb-6 leading-tight">Gerçeği <br /> Birlikte <br /> Buluyoruz.</h1>
                        <ul className="space-y-3 text-sm opacity-80">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Günde 20 ücretsiz analiz</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Analiz geçmişinizi görüntüleyin</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Yapay zeka destekli doğrulama</li>
                        </ul>
                    </div>
                    <div className="relative z-10 bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-xl border border-white border-opacity-20">
                        <p className="text-sm font-medium opacity-90">Ücretsiz, reklamsız ve tamamen açık kaynak.</p>
                    </div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 border-4 border-white border-opacity-10 rounded-full" />
                </div>

                {/* Sağ — Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-app-bg relative overflow-y-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-8 right-8 text-sm font-medium text-app-charcoal opacity-60 hover:opacity-100 transition-opacity"
                    >
                        ← Analizöre dön
                    </button>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-app-charcoal mb-2">Hesap Oluştur</h2>
                        <p className="text-app-charcoal opacity-70">
                            Zaten hesabınız var mı?{' '}
                            <Link to="/login" className="text-app-burgundy font-semibold hover:underline">Giriş Yapın</Link>
                        </p>
                    </div>

                    {success ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                            <p className="text-lg font-semibold text-app-charcoal">Hesabınız oluşturuldu!</p>
                            <p className="text-sm text-app-charcoal opacity-60">Giriş sayfasına yönlendiriliyorsunuz...</p>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleRegister} autoComplete="on">
                            {error && (
                                <div className="bg-app-burgundy bg-opacity-10 border border-app-burgundy border-opacity-20 p-3 rounded-lg flex items-center gap-2 text-app-burgundy text-sm font-medium">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label htmlFor="email" className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-app-charcoal opacity-40" />
                                    </div>
                                    <input
                                        id="email" name="email" type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                        placeholder="ornek@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="username" className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">Kullanıcı Adı</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-app-charcoal opacity-40" />
                                    </div>
                                    <input
                                        id="username" name="username" type="text"
                                        autoComplete="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                        placeholder="kullanici_adi (3-50 karakter)"
                                        required minLength={3} maxLength={50}
                                        pattern="[a-zA-Z0-9_]+"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="new-password" className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">Şifre</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-app-charcoal opacity-40" />
                                    </div>
                                    <input
                                        id="new-password" name="new-password" type="password"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                        placeholder="En az 8 karakter, 1 rakam, 1 harf"
                                        required minLength={8}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="confirm-password" className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">Şifre Tekrar</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-app-charcoal opacity-40" />
                                    </div>
                                    <input
                                        id="confirm-password" name="confirm-password" type="password"
                                        autoComplete="new-password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full bg-app-charcoal hover:opacity-80 disabled:bg-app-gray text-white py-4 rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 mt-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        Hesap Oluştur
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
