import React, { useState, useEffect, useRef } from 'react';
import {
    Clock, Shield, Lock, Loader2, CheckCircle2, AlertCircle,
    Link2, FileText, ShieldCheck, Search, Cpu, Star, Zap, Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../services/auth.service';

/* ─── Mock rozetler ───────────────────────────────────────────────── */
const BADGES = [
    { icon: <ShieldCheck className="w-6 h-6" />, name: 'Gerçek Avcı',     tier: 'Altın',       color: 'brand',        locked: false },
    { icon: <Search      className="w-6 h-6" />, name: 'Kaynak Dedektifi', tier: 'Gümüş',       color: 'es-secondary', locked: false },
    { icon: <Cpu         className="w-6 h-6" />, name: 'BERT Ustası',      tier: 'Bronz',       color: 'es-tertiary',  locked: false },
    { icon: <Zap         className="w-6 h-6" />, name: 'Örüntü Bulucu',    tier: 'Seviye 10',   color: 'muted',        locked: true  },
    { icon: <Award       className="w-6 h-6" />, name: 'Sinyal Uzmanı',    tier: '500+ Analiz', color: 'muted',        locked: true  },
    { icon: <Star        className="w-6 h-6" />, name: 'İlk Sentinel',     tier: 'Beta Kurucu', color: 'brand',        locked: false },
];

/* ─── Analiz tipi badge ───────────────────────────────────────────── */
const TypeBadge = ({ type }) =>
    type === 'url'
        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400">
              <Link2 className="w-3 h-3" /> URL
          </span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-400">
              <FileText className="w-3 h-3" /> METİN
          </span>;

/* ─── Prediction badge ────────────────────────────────────────────── */
const PredictionBadge = ({ prediction }) => {
    if (!prediction) return null;
    const map = {
        FAKE:      { label: 'Yanıltıcı',  cls: 'bg-red-500/15 text-red-400' },
        AUTHENTIC: { label: 'Güvenilir',  cls: 'bg-green-500/15 text-green-400' },
        UNCERTAIN: { label: 'Belirsiz',   cls: 'bg-amber-500/15 text-amber-400' },
    };
    const { label, cls } = map[prediction] ?? { label: prediction, cls: 'bg-zinc-500/15 text-zinc-400' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cls}`}>{label}</span>;
};

/* ─── Profile ─────────────────────────────────────────────────────── */
const Profile = () => {
    const { user, refreshUser } = useAuth();
    const { isDarkMode }        = useTheme();

    const [history, setHistory]               = useState([]);
    const [historyPage, setHistoryPage]       = useState(1);
    const [historyTotal, setHistoryTotal]     = useState(0);
    const [historyLoading, setHistoryLoading] = useState(true);

    const [pwForm, setPwForm]       = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError]     = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const successTimerRef           = useRef(null);

    /* Memory leak koruması: historyPage değiştiğinde önceki istek iptal edilir */
    useEffect(() => {
        let cancelled = false;
        setHistoryLoading(true);
        AuthService.getHistory(historyPage, 10)
            .then(data => {
                if (cancelled) return;
                setHistory(data.items);
                setHistoryTotal(data.total);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setHistoryLoading(false); });
        return () => { cancelled = true; };
    }, [historyPage]);

    /* Cleanup: unmount'ta timer iptal */
    useEffect(() => () => { clearTimeout(successTimerRef.current); }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPwError('');
        if (pwForm.new_password !== pwForm.confirm) { setPwError('Şifreler eşleşmiyor.'); return; }
        setPwLoading(true);
        try {
            await AuthService.updateMe({ current_password: pwForm.current_password, new_password: pwForm.new_password });
            setPwSuccess(true);
            setPwForm({ current_password: '', new_password: '', confirm: '' });
            await refreshUser();
            successTimerRef.current = setTimeout(() => setPwSuccess(false), 3000);
        } catch (err) {
            setPwError(err.message || 'Şifre değiştirilemedi.');
        } finally {
            setPwLoading(false);
        }
    };

    if (!user) return null;

    const initials   = user.username?.slice(0, 2).toUpperCase() || 'U';
    const quotaUsed  = Math.min((historyTotal / 20) * 100, 100);
    /* Analiz sayfasıyla aynı border — dark: rgba(63,255,139,0.2), light: rgba(24,24,27,0.18) */
    const cardBorder = { borderColor: isDarkMode ? 'rgba(63,255,139,0.2)' : 'rgba(24,24,27,0.18)' };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 animate-fade-up">

            {/* ══ HEADER ══════════════════════════════════════════════ */}
            <header className="relative mb-14 flex flex-col md:flex-row items-center md:items-end gap-8">

                {/* Avatar */}
                <div className="relative group shrink-0">
                    <div className="absolute -inset-2 rounded-full blur-xl transition duration-500 group-hover:opacity-80"
                         style={{ background: isDarkMode ? 'rgba(63,255,139,0.25)' : 'rgba(63,63,70,0.12)' }} />
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center overflow-hidden"
                         style={{
                             background: isDarkMode ? 'rgba(63,255,139,0.08)' : 'rgba(63,63,70,0.06)',
                             border: '3px solid var(--color-brand-primary)',
                             boxShadow: isDarkMode
                                 ? '0 0 28px rgba(63,255,139,0.35)'
                                 : '0 0 20px rgba(63,63,70,0.15)',
                         }}>
                        <span className="font-manrope font-black text-5xl"
                              style={{ color: 'var(--color-brand-primary)' }}>
                            {initials}
                        </span>
                    </div>
                    {/* Seviye chip */}
                    <div className="absolute bottom-1 right-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                         style={{
                             background: 'var(--color-brand-primary)',
                             color: isDarkMode ? '#070f12' : '#ffffff',
                         }}>
                        LVL 1
                    </div>
                </div>

                {/* Bilgi */}
                <div className="flex-1 text-center md:text-left space-y-2.5">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <h1 className="text-4xl md:text-5xl font-extrabold font-manrope tracking-tighter text-tx-primary">
                            {user.username}
                        </h1>
                        <span className="px-3.5 py-1 rounded-full text-sm font-bold tracking-tight border"
                              style={{
                                  background: isDarkMode ? 'rgba(63,255,139,0.08)' : 'rgba(63,63,70,0.07)',
                                  borderColor: isDarkMode ? 'rgba(63,255,139,0.25)' : 'rgba(63,63,70,0.2)',
                                  color: 'var(--color-brand-primary)',
                              }}>
                            {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                        </span>
                    </div>
                    <p className="text-tx-secondary text-base font-inter">{user.email}</p>
                    <p className="text-muted text-sm font-inter">
                        Üye: {new Date(user.created_at).toLocaleDateString('tr-TR', { year:'numeric', month:'long', day:'numeric' })}
                    </p>
                </div>
            </header>

            {/* ══ CONTENT GRID ════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ── SOL SIDEBAR ──────────────────────────────────── */}
                <aside className="lg:col-span-3 space-y-6">

                    {/* Hesap İstatistikleri */}
                    <div className="glass rounded-xl p-6 animate-fade-up" style={{ ...cardBorder, animationDelay: '0.05s' }}>
                        <h3 className="text-[10px] font-black text-brand uppercase tracking-widest mb-5">
                            Hesap İstatistikleri
                        </h3>
                        <div className="space-y-5">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-muted">Toplam Analiz</span>
                                    <span className="text-2xl font-manrope font-bold text-brand">{historyLoading ? '…' : historyTotal}</span>
                                </div>
                                <div className="w-full h-1 rounded-full overflow-hidden bg-surface-solid">
                                    <div className="h-full rounded-full transition-all duration-700"
                                         style={{
                                             width: `${quotaUsed}%`,
                                             background: 'var(--color-brand-primary)',
                                         }} />
                                </div>
                                <p className="text-[10px] text-muted">Günlük kota: {Math.min(historyTotal, 20)}/20</p>
                            </div>

                            <div className="flex justify-between items-center py-3"
                                 style={{ borderTop: '1px solid var(--color-border)' }}>
                                <span className="text-sm text-muted">Üye Tarihi</span>
                                <span className="text-sm font-bold text-tx-primary">
                                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                </span>
                            </div>
                            {user.last_login_at && (
                                <div className="flex justify-between items-center pb-1">
                                    <span className="text-sm text-muted">Son Giriş</span>
                                    <span className="text-sm font-bold text-tx-primary">
                                        {new Date(user.last_login_at).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rol & Durum */}
                    <div className="glass rounded-xl p-6 animate-fade-up" style={{ ...cardBorder, animationDelay: '0.1s' }}>
                        <h3 className="text-[10px] font-black text-brand uppercase tracking-widest mb-4">
                            Hesap Bilgileri
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Email</p>
                                <p className="text-sm text-tx-primary font-medium truncate">{user.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">Rol</p>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                                      style={{
                                          background: isDarkMode ? 'rgba(63,255,139,0.1)' : 'rgba(63,63,70,0.08)',
                                          color: 'var(--color-brand-primary)',
                                          border: '1px solid var(--color-brand-primary)',
                                          borderColor: isDarkMode ? 'rgba(63,255,139,0.25)' : 'rgba(63,63,70,0.2)',
                                      }}>
                                    {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── ANA İÇERİK ───────────────────────────────────── */}
                <section className="lg:col-span-9 space-y-8">

                    {/* Üst satır: 2 kolon */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Son Analizler */}
                        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.12s' }}>
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-lg font-manrope font-bold text-tx-primary">Son Analizler</h3>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                                    {historyTotal} toplam
                                </span>
                            </div>

                            {historyLoading ? (
                                <div className="glass rounded-xl p-8 flex justify-center" style={cardBorder}>
                                    <Loader2 className="w-5 h-5 animate-spin text-muted" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="glass rounded-xl p-8 text-center" style={cardBorder}>
                                    <Clock className="w-8 h-8 text-muted opacity-40 mx-auto mb-2" />
                                    <p className="text-muted text-sm">Henüz analiz yapılmadı.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.slice(0, 5).map(item => (
                                        <div key={item.id}
                                             className="glass rounded-xl p-4 transition-all duration-300"
                                             style={{ ...cardBorder }}
                                             onMouseEnter={e => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(63,255,139,0.45)' : 'rgba(24,24,27,0.35)'}
                                             onMouseLeave={e => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(63,255,139,0.2)' : 'rgba(24,24,27,0.18)'}>

                                            {/* Üst satır: tip + karar + tarih */}
                                            <div className="flex justify-between items-start mb-2">
                                                <TypeBadge type={item.analysis_type} />
                                                <div className="flex items-center gap-2">
                                                    <PredictionBadge prediction={item.prediction} />
                                                    <span className="text-[10px] text-muted uppercase">
                                                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Başlık */}
                                            {item.title && (
                                                <div className="text-xs font-medium text-tx-secondary line-clamp-1 mb-2">
                                                    {item.analysis_type === 'url' && item.source_url
                                                        ? <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                                                             className="hover:text-tx-primary transition-colors">{item.title}</a>
                                                        : item.title
                                                    }
                                                </div>
                                            )}

                                            {/* AI Özeti */}
                                            {item.ai_comment?.summary && (
                                                <p className="text-[11px] text-tx-secondary leading-relaxed line-clamp-2 mb-2">
                                                    {item.ai_comment.summary}
                                                </p>
                                            )}

                                            {/* Alt satır: güven skoru + reason_type */}
                                            {(item.confidence != null || item.ai_comment?.reason_type) && (
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {item.confidence != null && (
                                                        <span className="text-[10px] text-muted">
                                                            Güven: <span className="font-bold text-tx-secondary">
                                                                %{Math.round(item.confidence * 100)}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {item.ai_comment?.reason_type && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-500/10 text-muted uppercase tracking-wide">
                                                            {item.ai_comment.reason_type}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {historyTotal > 5 && (
                                        <div className="flex justify-between items-center pt-2">
                                            <button
                                                disabled={historyPage === 1}
                                                onClick={() => setHistoryPage(p => p - 1)}
                                                className="text-xs font-medium text-tx-secondary hover:text-tx-primary disabled:opacity-30 transition-colors">
                                                ← Önceki
                                            </button>
                                            <span className="text-xs text-muted">
                                                {historyPage} / {Math.ceil(historyTotal / 10) || 1}
                                            </span>
                                            <button
                                                disabled={historyPage * 10 >= historyTotal}
                                                onClick={() => setHistoryPage(p => p + 1)}
                                                className="text-xs font-medium text-tx-secondary hover:text-tx-primary disabled:opacity-30 transition-colors">
                                                Sonraki →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Güvenlik — Şifre Değiştir */}
                        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.18s' }}>
                            <h3 className="px-1 text-lg font-manrope font-bold text-tx-primary">Güvenlik</h3>
                            <div className="glass rounded-xl p-6" style={cardBorder}>
                                <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-4">
                                    Şifre Değiştir
                                </p>

                                <form className="space-y-3" onSubmit={handlePasswordChange} autoComplete="on">
                                    {pwError && (
                                        <div className="flex items-center gap-2 text-es-error text-xs p-3 rounded-xl bg-es-error/8 border border-es-error/20">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {pwError}
                                        </div>
                                    )}
                                    {pwSuccess && (
                                        <div className="flex items-center gap-2 text-authentic-text text-xs p-3 rounded-xl bg-authentic-bg border border-authentic-border">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Şifre güncellendi.
                                        </div>
                                    )}

                                    {[
                                        { id:'current-password', key:'current_password', label:'Mevcut şifre',           ac:'current-password' },
                                        { id:'new-password',     key:'new_password',     label:'Yeni şifre (≥ 8 char)', ac:'new-password', min:8 },
                                        { id:'confirm-pw',       key:'confirm',          label:'Yeni şifre tekrar',     ac:'new-password' },
                                    ].map(f => (
                                        <div key={f.id} className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">{f.label}</label>
                                            <input
                                                id={f.id} name={f.id} type="password" autoComplete={f.ac}
                                                placeholder="••••••••"
                                                value={pwForm[f.key]}
                                                onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full px-3.5 py-2.5 bg-surface-solid rounded-lg text-tx-primary text-sm
                                                           placeholder:text-muted outline-none transition-all font-inter"
                                                style={{ border: '1px solid var(--color-border)' }}
                                                onFocus={e => { e.target.style.borderColor = 'var(--color-brand-primary)'; }}
                                                onBlur={e  => { e.target.style.borderColor = 'var(--color-border)'; }}
                                                required minLength={f.min}
                                            />
                                        </div>
                                    ))}

                                    <button
                                        type="submit" disabled={pwLoading}
                                        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                                                   font-manrope font-bold text-xs uppercase tracking-wider
                                                   transition-all duration-200 disabled:opacity-40 hover:opacity-85 active:scale-[0.98]"
                                        style={{
                                            background: 'var(--color-brand-primary)',
                                            color: isDarkMode ? '#070f12' : '#ffffff',
                                            boxShadow: isDarkMode ? '0 6px 20px rgba(63,255,139,0.18)' : '0 4px 14px rgba(63,63,70,0.22)',
                                        }}>
                                        {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                        Şifreyi Güncelle
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Rozetler */}
                    <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.24s' }}>
                        <h3 className="px-1 text-lg font-manrope font-bold text-tx-primary">Rozetler</h3>
                        <div className="glass rounded-2xl p-6 md:p-8" style={cardBorder}>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 md:gap-8">
                                {BADGES.map((b, i) => (
                                    <div key={i}
                                         className={`flex flex-col items-center text-center space-y-2.5 group
                                                     ${b.locked ? 'opacity-35 grayscale cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform
                                                        ${!b.locked ? 'group-hover:scale-110 group-hover:rotate-3' : ''}`}
                                             style={{
                                                 background: b.locked
                                                     ? 'var(--color-bg-surface-solid)'
                                                     : isDarkMode
                                                         ? `rgba(var(--badge-rgb-${b.color}), 0.12)`
                                                         : 'rgba(63,63,70,0.07)',
                                                 border: `1px solid ${b.locked ? 'var(--color-border)' : 'var(--color-brand-primary)'}`,
                                                 borderColor: b.locked ? 'var(--color-border)' : isDarkMode ? 'rgba(63,255,139,0.35)' : 'rgba(63,63,70,0.25)',
                                             }}>
                                            <span style={{ color: b.locked ? 'var(--color-text-muted)' : 'var(--color-brand-primary)' }}>
                                                {b.icon}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-bold text-tx-primary leading-tight">{b.name}</p>
                                            <p className="text-[9px] text-muted uppercase tracking-tighter">{b.tier}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </section>
            </div>
        </div>
    );
};

export default Profile;
