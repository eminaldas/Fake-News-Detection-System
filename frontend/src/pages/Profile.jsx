import React, { useState, useEffect } from 'react';
import { User, Clock, Shield, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/auth.service';

const Profile = () => {
    const { user, refreshUser } = useAuth();

    const [history, setHistory]             = useState([]);
    const [historyPage, setHistoryPage]     = useState(1);
    const [historyTotal, setHistoryTotal]   = useState(0);
    const [historyLoading, setHistoryLoading] = useState(true);

    const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError]   = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);

    useEffect(() => {
        setHistoryLoading(true);
        AuthService.getHistory(historyPage, 10)
            .then((data) => {
                setHistory(data.items);
                setHistoryTotal(data.total);
            })
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
    }, [historyPage]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPwError('');
        if (pwForm.new_password !== pwForm.confirm) {
            setPwError('Şifreler eşleşmiyor.');
            return;
        }
        setPwLoading(true);
        try {
            await AuthService.updateMe({
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            setPwSuccess(true);
            setPwForm({ current_password: '', new_password: '', confirm: '' });
            await refreshUser();
            setTimeout(() => setPwSuccess(false), 3000);
        } catch (err) {
            setPwError(err.message || 'Şifre değiştirilemedi.');
        } finally {
            setPwLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

            {/* Profil Başlık */}
            <div className="bg-app-surface rounded-2xl border border-app-gray p-6 flex items-center gap-5">
                <div className="w-16 h-16 bg-app-burgundy bg-opacity-10 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-app-burgundy" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-app-charcoal">{user.username}</h1>
                    <p className="text-app-charcoal opacity-60 text-sm">{user.email}</p>
                    <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                            ? 'bg-app-burgundy bg-opacity-10 text-app-burgundy'
                            : 'bg-app-charcoal bg-opacity-10 text-app-charcoal'
                    }`}>
                        {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </span>
                </div>
                <div className="ml-auto text-right text-xs text-app-charcoal opacity-50">
                    <p>Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}</p>
                    {user.last_login_at && (
                        <p>Son giriş: {new Date(user.last_login_at).toLocaleDateString('tr-TR')}</p>
                    )}
                </div>
            </div>

            {/* Analiz Geçmişi */}
            <div className="bg-app-surface rounded-2xl border border-app-gray p-6">
                <h2 className="text-lg font-bold text-app-charcoal mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Analiz Geçmişim ({historyTotal})
                </h2>

                {historyLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-app-charcoal opacity-40" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center text-app-charcoal opacity-40 py-8">Henüz analiz yapılmadı.</p>
                ) : (
                    <>
                        <div className="space-y-2">
                            {history.map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-app-bg">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        item.analysis_type === 'url'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        {item.analysis_type?.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-app-charcoal opacity-50 font-mono">{item.task_id?.slice(0, 8)}...</span>
                                    <span className="text-xs text-app-charcoal opacity-50">
                                        {new Date(item.created_at).toLocaleString('tr-TR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <button
                                disabled={historyPage === 1}
                                onClick={() => setHistoryPage((p) => p - 1)}
                                className="text-sm font-medium text-app-charcoal opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                            >
                                ← Önceki
                            </button>
                            <span className="text-xs text-app-charcoal opacity-40">
                                Sayfa {historyPage} / {Math.ceil(historyTotal / 10) || 1}
                            </span>
                            <button
                                disabled={historyPage * 10 >= historyTotal}
                                onClick={() => setHistoryPage((p) => p + 1)}
                                className="text-sm font-medium text-app-charcoal opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                            >
                                Sonraki →
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Şifre Değiştir */}
            <div className="bg-app-surface rounded-2xl border border-app-gray p-6">
                <h2 className="text-lg font-bold text-app-charcoal mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5" /> Şifre Değiştir
                </h2>
                <form className="space-y-4 max-w-md" onSubmit={handlePasswordChange} autoComplete="on">
                    {pwError && (
                        <div className="flex items-center gap-2 text-app-burgundy text-sm">
                            <AlertCircle className="w-4 h-4" /> {pwError}
                        </div>
                    )}
                    {pwSuccess && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" /> Şifre güncellendi.
                        </div>
                    )}
                    <input
                        id="current-password" name="current-password" type="password"
                        autoComplete="current-password"
                        placeholder="Mevcut şifre"
                        value={pwForm.current_password}
                        onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                        className="w-full px-4 py-3 bg-app-bg rounded-xl border border-app-gray focus:border-app-burgundy outline-none transition-all text-app-charcoal"
                        required
                    />
                    <input
                        id="new-password" name="new-password" type="password"
                        autoComplete="new-password"
                        placeholder="Yeni şifre (en az 8 karakter)"
                        value={pwForm.new_password}
                        onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                        className="w-full px-4 py-3 bg-app-bg rounded-xl border border-app-gray focus:border-app-burgundy outline-none transition-all text-app-charcoal"
                        required minLength={8}
                    />
                    <input
                        id="confirm-new-password" name="confirm-new-password" type="password"
                        autoComplete="new-password"
                        placeholder="Yeni şifre tekrar"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                        className="w-full px-4 py-3 bg-app-bg rounded-xl border border-app-gray focus:border-app-burgundy outline-none transition-all text-app-charcoal"
                        required
                    />
                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="flex items-center gap-2 bg-app-charcoal text-white px-6 py-3 rounded-xl font-bold hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                        {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        Şifreyi Güncelle
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Profile;
