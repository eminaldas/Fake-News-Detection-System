import React, { useState, useEffect, useRef } from 'react';
import { Lock, Monitor, Smartphone, AlertTriangle } from 'lucide-react';
import axiosInstance from '../../api/axios';

const ProfileSecurity = () => {
    const [pwForm, setPwForm]       = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError]     = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const successTimerRef           = useRef(null);

    const [sessions, setSessions]               = useState([]);
    const [anomalyDetected, setAnomalyDetected] = useState(false);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/users/me/sessions')
            .then(r => {
                setSessions(r.data.sessions);
                setAnomalyDetected(r.data.anomaly_detected);
            })
            .catch(() => {})
            .finally(() => setSessionsLoading(false));
    }, []);

    const handlePasswordChange = async e => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm) {
            setPwError('Yeni şifreler eşleşmiyor.');
            return;
        }
        setPwLoading(true);
        setPwError('');
        try {
            await axiosInstance.patch('/users/me', {
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            setPwSuccess(true);
            setPwForm({ current_password: '', new_password: '', confirm: '' });
            successTimerRef.current = setTimeout(() => setPwSuccess(false), 3000);
        } catch (err) {
            setPwError(err.response?.data?.detail ?? 'Şifre güncellenemedi, lütfen tekrar dene.');
        } finally {
            setPwLoading(false);
        }
    };

    useEffect(() => () => clearTimeout(successTimerRef.current), []);

    const inputCls = 'w-full bg-transparent border-none outline-none ring-0 py-3 pl-10 pr-4 text-sm text-tx-primary placeholder:text-muted';
    const wrapCls  = 'relative flex items-center rounded-xl border transition-colors';

    return (
        <div className="space-y-5 max-w-lg">
            {/* Şifre Değiştir */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-muted" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Şifre Değiştir</p>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    {[
                        { key: 'current_password', placeholder: 'Mevcut şifre' },
                        { key: 'new_password',      placeholder: 'Yeni şifre' },
                        { key: 'confirm',           placeholder: 'Yeni şifre tekrar' },
                    ].map(({ key, placeholder }) => (
                        <div key={key} className={wrapCls} style={{ borderColor: 'var(--color-border)' }}>
                            <Lock className="absolute left-3 w-4 h-4 text-muted pointer-events-none" />
                            <input
                                type="password"
                                placeholder={placeholder}
                                value={pwForm[key]}
                                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                                required
                                className={inputCls}
                            />
                        </div>
                    ))}
                    {pwError   && <p className="text-xs text-red-400">{pwError}</p>}
                    {pwSuccess && <p className="text-xs" style={{ color: 'var(--color-brand-primary)' }}>Şifren güncellendi.</p>}
                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        {pwLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </button>
                </form>
            </div>

            {/* Anomali uyarısı */}
            {anomalyDetected && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-400">Hesabına tanımadık bir yerden giriş yapıldı</p>
                        <p className="text-xs text-muted mt-0.5">Son 7 gün içinde alışılmadık bir konumdan giriş tespit edildi. Şifreni değiştirmeni öneririz.</p>
                    </div>
                </div>
            )}

            {/* Oturum Geçmişi */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-4">
                    <Monitor className="w-4 h-4 text-muted" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Son Girişler</p>
                </div>
                {sessionsLoading ? (
                    <p className="text-sm text-muted">Yükleniyor...</p>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted">Giriş geçmişi bulunamadı.</p>
                ) : (
                    <div className="space-y-2">
                        {sessions.map((s, i) => (
                            <div
                                key={s.created_at}
                                className="flex items-center gap-3 p-3 rounded-lg"
                                style={{
                                    background: 'var(--color-base)',
                                    border: `1px solid ${s.is_current ? 'rgba(63,255,139,0.18)' : 'var(--color-border)'}`,
                                }}
                            >
                                {s.is_current
                                    ? <Smartphone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                    : <Monitor    className="w-4 h-4 text-muted flex-shrink-0" />}
                                <div className="flex-1">
                                    <p className="text-sm text-tx-primary">{s.label}</p>
                                    <p className="text-[10px] text-muted">
                                        {new Date(s.created_at).toLocaleString('tr-TR')}
                                    </p>
                                </div>
                                {s.is_current && (
                                    <span className="text-[10px]" style={{ color: 'var(--color-brand-primary)' }}>Aktif</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSecurity;
