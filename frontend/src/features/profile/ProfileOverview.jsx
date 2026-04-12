import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Link2, FileText, ShieldCheck,
         Search, Cpu, Star, Zap, Award } from 'lucide-react';
import AuthService from '../../services/auth.service';
import axiosInstance from '../../api/axios';
import InsightsPanel from '../insights/InsightsPanel';

const BADGES = [
    { icon: <ShieldCheck className="w-5 h-5" />, name: 'Gerçek Avcı',     locked: false },
    { icon: <Search      className="w-5 h-5" />, name: 'Kaynak Dedektifi', locked: false },
    { icon: <Cpu         className="w-5 h-5" />, name: 'BERT Ustası',      locked: false },
    { icon: <Zap         className="w-5 h-5" />, name: 'Örüntü Bulucu',    locked: true  },
    { icon: <Award       className="w-5 h-5" />, name: 'Sinyal Uzmanı',    locked: true  },
    { icon: <Star        className="w-5 h-5" />, name: 'İlk Sentinel',     locked: false },
];

const TypeBadge = ({ type }) =>
    type === 'url'
        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400"><Link2 className="w-3 h-3" />URL</span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-400"><FileText className="w-3 h-3" />METİN</span>;

const PredictionBadge = ({ prediction }) => {
    if (!prediction) return null;
    const map = {
        FAKE:      { label: 'Yanıltıcı', cls: 'bg-red-500/15 text-red-400' },
        AUTHENTIC: { label: 'Güvenilir', cls: 'bg-green-500/15 text-green-400' },
        UNCERTAIN: { label: 'Belirsiz',  cls: 'bg-amber-500/15 text-amber-400' },
    };
    const { label, cls } = map[prediction] ?? { label: prediction, cls: 'bg-zinc-500/15 text-zinc-400' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cls}`}>{label}</span>;
};

const ProfileOverview = () => {
    const [history, setHistory]               = useState([]);
    const [historyPage, setHistoryPage]       = useState(1);
    const [historyTotal, setHistoryTotal]     = useState(0);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [stats, setStats]                   = useState(null);
    const [trust, setTrust]                   = useState(null);

    useEffect(() => {
        axiosInstance.get('/users/me/stats')
            .then(r => setStats(r.data))
            .catch(() => {});
    }, []);

    useEffect(() => {
        axiosInstance.get('/users/me/trust')
            .then(r => setTrust(r.data))
            .catch(() => {});
    }, []);

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

    const totalPages = Math.ceil(historyTotal / 10);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Bu Hafta Analiz',  value: stats?.week_analyzed ?? '—', sub: 'haber incelendi' },
                    { label: 'Yanıltıcı Tespit', value: stats?.week_fake ?? '—',     sub: 'bu hafta',       danger: true },
                    { label: 'Haber Hijyeni',    value: stats ? `${stats.hygiene_score}` : '—', sub: '/ 100 puan', gold: true },
                ].map(({ label, value, sub, danger, gold }) => (
                    <div key={label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-2xl font-black ${danger ? 'text-red-400' : gold ? 'text-yellow-400' : 'text-tx-primary'}`}>{value}</p>
                        <p className="text-[10px] text-muted mt-0.5">{sub}</p>
                    </div>
                ))}
                <div className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Forum İtibarı</p>
                    <p className="text-2xl font-black text-tx-primary">{trust ? trust.display_label : '—'}</p>
                    {trust && (
                        <p className="text-sm text-brand mt-0.5">{'★'.repeat(trust?.stars || 0)}</p>
                    )}
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${trust?.score || 0}%`, background: 'var(--color-brand)' }}
                        />
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">Skor: {trust?.score?.toFixed(0) || 0}/100</p>
                </div>
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-3">Rozetler</p>
                <div className="flex flex-wrap gap-2">
                    {BADGES.map(b => (
                        <div
                            key={b.name}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] ${b.locked ? 'opacity-40' : ''}`}
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-base)' }}
                        >
                            <span style={{ color: 'var(--color-brand-primary)' }}>{b.icon}</span>
                            <span className="text-tx-secondary">{b.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <InsightsPanel />

            <div className="rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Son Analizler</p>
                    {historyTotal > 0 && <p className="text-[10px] text-muted">{historyTotal} toplam</p>}
                </div>
                {historyLoading ? (
                    <div className="p-8 text-center text-muted text-sm">Yükleniyor...</div>
                ) : history.length === 0 ? (
                    <div className="p-8 text-center text-muted text-sm">Henüz analiz yapılmamış.</div>
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {history.map(item => (
                            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                                <TypeBadge type={item.analysis_type} />
                                <p className="flex-1 text-xs text-tx-secondary truncate">{item.title ?? item.task_id ?? '—'}</p>
                                {item.prediction && <PredictionBadge prediction={item.prediction} />}
                                <p className="text-[10px] text-muted flex-shrink-0">
                                    {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="p-3 flex items-center justify-center gap-2">
                        <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="p-1 rounded disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4 text-muted" />
                        </button>
                        <span className="text-[11px] text-muted">{historyPage} / {totalPages}</span>
                        <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages} className="p-1 rounded disabled:opacity-30">
                            <ChevronRight className="w-4 h-4 text-muted" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileOverview;
