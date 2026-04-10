import React, { useState, useEffect, useRef } from 'react';
import InsightsPanel from '../features/insights/InsightsPanel';
import {
    Clock, Shield, Lock, Loader2, CheckCircle2, AlertCircle,
    Link2, FileText, ShieldCheck, Search, Cpu, Star, Zap, Award,
    ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../services/auth.service';
import axiosInstance from '../api/axios';

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

    const [quota, setQuota] = useState(null);

    const [notifPrefs, setNotifPrefs] = useState({ high_risk_alert: true, email_digest: false });

    const [feedPrefs, setFeedPrefs] = useState({ blocked_sources: [], hidden_categories: [] });
    const [newSource, setNewSource] = useState('');
    const [prefMsg,   setPrefMsg]   = useState('');

    const [feedbackSent, setFeedbackSent] = useState({});

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

    useEffect(() => {
        AuthService.getQuota()
            .then(setQuota)
            .catch(() => {});
    }, []);

    useEffect(() => {
        axiosInstance.get('/notifications/prefs')
            .then(r => setNotifPrefs(r.data))
            .catch(() => {});
    }, []);

    useEffect(() => {
        axiosInstance.get('/users/me/feed-preferences')
            .then(r => setFeedPrefs(r.data))
            .catch(() => {});
    }, []);

    /* Cleanup: unmount'ta timer iptal */
    useEffect(() => () => { clearTimeout(successTimerRef.current); }, []);

    const addBlockedSource = async () => {
        const domain = newSource.trim().toLowerCase();
        if (!domain) return;
        const res = await axiosInstance.patch('/users/me/feed-preferences', { add_blocked_source: domain }).catch(() => null);
        if (res) { setFeedPrefs(res.data); setNewSource(''); }
    };

    const removeBlockedSource = async (domain) => {
        const res = await axiosInstance.patch('/users/me/feed-preferences', { remove_blocked_source: domain }).catch(() => null);
        if (res) setFeedPrefs(res.data);
    };

    const resetProfile = async () => {
        if (!window.confirm('Öneri profilin sıfırlanacak. Emin misin?')) return;
        await axiosInstance.delete('/users/me/preference-profile').catch(() => {});
        setFeedPrefs({ blocked_sources: [], hidden_categories: [] });
        setPrefMsg('Profil sıfırlandı.');
        setTimeout(() => setPrefMsg(''), 3000);
    };

    const downloadExport = async () => {
        const res = await axiosInstance.get('/users/me/data-export').catch(() => null);
        if (!res) return;
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'fnds-data-export.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const updateNotifPref = async (key, value) => {
        setNotifPrefs(prev => ({ ...prev, [key]: value }));
        await axiosInstance.patch('/notifications/prefs', { [key]: value }).catch(() => {});
    };

    const handleFeedback = async (task_id, submitted_label) => {
        try {
            await axiosInstance.post('/analysis/feedback', { task_id, submitted_label });
            setFeedbackSent(prev => ({ ...prev, [task_id]: true }));
        } catch (err) {
            const errStatus = err?.response?.status;
            if (errStatus === 409) {
                setFeedbackSent(prev => ({ ...prev, [task_id]: true }));
            }
            // 422 (yüksek güven) — sessizce yoksay
        }
    };

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
    const quotaUsed  = quota ? Math.min((quota.used / quota.limit) * 100, 100) : 0;
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
                                <p className="text-[10px] text-muted">Günlük kota: {quota ? `${quota.used}/${quota.limit}` : '…'}</p>
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
                            <p className="text-[10px] text-muted px-1 -mt-2 mb-1">
                                Sonuçları doğrulayıp bildirirsen modeli geliştirmemize yardımcı olursun.
                            </p>

                            {historyLoading ? (
                                <div className="glass rounded-xl p-8 flex justify-center" style={cardBorder}>
                                    <Loader2 className="w-5 h-5 animate-spin text-muted" />
                                </div>
                            ) : (() => {
                                const visible = history.filter(i => i.ai_comment?.summary);
                                if (visible.length === 0) return (
                                    <div className="glass rounded-xl p-8 text-center" style={cardBorder}>
                                        <Clock className="w-8 h-8 text-muted opacity-40 mx-auto mb-2" />
                                        <p className="text-muted text-sm">
                                            {history.length === 0 ? 'Henüz analiz yapılmadı.' : 'AI yorumu tamamlanmış analiz bulunamadı.'}
                                        </p>
                                    </div>
                                );
                                return (
                                    <div className="space-y-3">
                                        {visible.map(item => {
                                            const pred = item.prediction;
                                            const predColor = pred === 'FAKE'
                                                ? { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', bar: '#ef4444' }
                                                : pred === 'AUTHENTIC'
                                                    ? { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', bar: '#22c55e' }
                                                    : { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', bar: '#f59e0b' };
                                            return (
                                                <div key={item.id}
                                                     className="glass rounded-xl overflow-hidden transition-all duration-300"
                                                     style={{ ...cardBorder }}
                                                     onMouseEnter={e => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(63,255,139,0.45)' : 'rgba(24,24,27,0.35)'}
                                                     onMouseLeave={e => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(63,255,139,0.2)' : 'rgba(24,24,27,0.18)'}>

                                                    {/* Üst renkli şerit */}
                                                    <div className="h-0.5 w-full" style={{ background: predColor.bar }} />

                                                    <div className="p-4 space-y-3">
                                                        {/* Üst satır: tip + karar + tarih */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <TypeBadge type={item.analysis_type} />
                                                                <PredictionBadge prediction={item.prediction} />
                                                                {item.ai_comment?.reason_type && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-500/10 text-muted uppercase tracking-wide">
                                                                        {item.ai_comment.reason_type}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-muted shrink-0">
                                                                {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>

                                                        {/* Başlık + kaynak linki */}
                                                        {item.title && (
                                                            <div className="flex items-start gap-2">
                                                                <p className="text-sm font-semibold text-tx-primary line-clamp-2 flex-1 leading-snug">
                                                                    {item.title}
                                                                </p>
                                                                {item.source_url && (
                                                                    <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                                                                       className="shrink-0 mt-0.5 text-muted hover:text-brand transition-colors"
                                                                       title="Kaynağa git">
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* AI Özeti */}
                                                        <p className="text-[11px] text-tx-secondary leading-relaxed line-clamp-3"
                                                           style={{ borderLeft: `2px solid ${predColor.bar}`, paddingLeft: '8px' }}>
                                                            {item.ai_comment.summary}
                                                        </p>

                                                        {/* Alt satır: güven */}
                                                        {item.confidence != null && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1 rounded-full overflow-hidden"
                                                                     style={{ background: 'var(--color-bg-surface-solid)' }}>
                                                                    <div className="h-full rounded-full transition-all"
                                                                         style={{ width: `${Math.round(item.confidence * 100)}%`, background: predColor.bar }} />
                                                                </div>
                                                                <span className="text-[10px] text-muted shrink-0">
                                                                    %{Math.round(item.confidence * 100)} güven
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Feedback paneli */}
                                                        {item.task_id && (
                                                            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px' }}>
                                                                {feedbackSent[item.task_id] ? (
                                                                    <p className="text-[10px] text-brand font-medium text-center">✓ Bildirildi</p>
                                                                ) : item.confidence != null && item.confidence >= 0.80 ? (
                                                                    <p className="text-[10px] text-muted text-center"
                                                                       title="Bu sonuç için geri bildirim alınmıyor">
                                                                        Yüksek güvenli — geri bildirim alınmıyor
                                                                    </p>
                                                                ) : (
                                                                    <div className="flex gap-2 justify-center">
                                                                        <button
                                                                            onClick={() => handleFeedback(item.task_id, 'AUTHENTIC')}
                                                                            className="text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors"
                                                                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                                                                            ✓ Aslında gerçek
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleFeedback(item.task_id, 'FAKE')}
                                                                            className="text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors"
                                                                            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                                            ✗ Aslında sahte
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {historyTotal > 10 && (
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
                                );
                            })()}
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

                {/* ── Kişisel İstatistikler ── */}
                <section className="mt-8">
                    <InsightsPanel />
                </section>

                {/* ── Bildirim Tercihleri ── */}
                <section className="mt-8">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-tx-secondary mb-4">
                        🔔 Bildirim Tercihleri
                    </h2>
                    <div className="space-y-3">
                        {[
                            { key: 'high_risk_alert', label: 'Sahte haber uyarısı', desc: 'İlgi alanlarında yüksek riskli haber artışında bildir' },
                            { key: 'email_digest',    label: 'Haftalık email özeti', desc: 'Her Pazartesi kişisel haftalık özetini gönder' },
                        ].map(({ key, label, desc }) => (
                            <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-base border border-brutal-border">
                                <div>
                                    <p className="text-sm font-bold text-tx-primary">{label}</p>
                                    <p className="text-xs text-tx-secondary mt-0.5">{desc}</p>
                                </div>
                                <button
                                    onClick={() => updateNotifPref(key, !notifPrefs[key])}
                                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none
                                        ${notifPrefs[key] ? 'bg-brand' : 'bg-brutal-border'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                                        ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Feed Kontrolü ── */}
                <section className="mt-8">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-tx-secondary mb-4">
                        ⚙️ Feed Kontrolü
                    </h2>

                    {/* Kaynak Engelleme */}
                    <div className="p-4 rounded-xl bg-base border border-brutal-border mb-3">
                        <p className="text-sm font-bold text-tx-primary mb-3">Engellenen Kaynaklar</p>
                        <div className="flex gap-2 mb-3">
                            <input
                                value={newSource}
                                onChange={e => setNewSource(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addBlockedSource()}
                                placeholder="ornek.com"
                                className="flex-1 text-xs px-3 py-2 rounded-lg bg-surface border border-brutal-border text-tx-primary placeholder:text-tx-secondary/50 outline-none focus:border-brand"
                            />
                            <button onClick={addBlockedSource}
                                    className="px-3 py-2 rounded-lg bg-brand text-white text-xs font-bold hover:opacity-80 transition-opacity">
                                Ekle
                            </button>
                        </div>
                        {feedPrefs.blocked_sources.length === 0 && (
                            <p className="text-[10px] text-tx-secondary opacity-50">Engellenen kaynak yok</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {feedPrefs.blocked_sources.map(domain => (
                                <span key={domain}
                                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-fake-bg border border-fake-border text-[10px] text-fake-text font-bold">
                                    {domain}
                                    <button onClick={() => removeBlockedSource(domain)}
                                            className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sıfırla + Export */}
                    <div className="flex gap-3">
                        <button onClick={resetProfile}
                                className="flex-1 py-2.5 rounded-xl border border-brutal-border text-xs font-bold text-tx-secondary hover:border-fake-border hover:text-fake-text transition-colors">
                            🔄 Profili Sıfırla
                        </button>
                        <button onClick={downloadExport}
                                className="flex-1 py-2.5 rounded-xl border border-brutal-border text-xs font-bold text-tx-secondary hover:border-brand hover:text-brand transition-colors">
                            📥 Verilerimi İndir
                        </button>
                    </div>
                    {prefMsg && <p className="text-xs text-authentic-text mt-2 text-center">{prefMsg}</p>}
                </section>

            </div>
        </div>
    );
};

export default Profile;
