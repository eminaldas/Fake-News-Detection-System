import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Link2, FileText, ShieldCheck,
    Search, Cpu, Star, Zap, Award, Lock,
} from 'lucide-react';
import AuthService from '../../services/auth.service';
import AnalysisService from '../../services/analysis.service';
import axiosInstance from '../../api/axios';
import InsightsPanel from '../insights/InsightsPanel';
import HistoryModal from './HistoryModal';
import GamificationService from '../../services/gamification.service';
import BadgeShowcaseModal from '../../components/common/BadgeShowcaseModal';
import { TypeBadge, PredictionBadge } from '../../components/common/AnalysisBadges';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

const PREDICTION_BORDER = {
    FAKE:      '#ff7351',
    AUTHENTIC: '#3fff8b',
    UNCERTAIN: '#f59e0b',
};

const ProfileOverview = () => {
    const [history, setHistory]               = useState([]);
    const [historyPage, setHistoryPage]       = useState(1);
    const [historyTotal, setHistoryTotal]     = useState(0);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [stats, setStats]                   = useState(null);
    const [trust, setTrust]                   = useState(null);
    const [selectedItem, setSelectedItem]     = useState(null);
    const [fullReports, setFullReports]       = useState(new Set());
    const [showcase,       setShowcase]       = useState([]);
    const [xpStats,        setXpStats]        = useState(null);
    const [showBadgeModal, setShowBadgeModal] = useState(false);

    useEffect(() => {
        axiosInstance.get('/users/me/stats').then(r => setStats(r.data)).catch(() => {});
        GamificationService.getMyStats()
            .then(setXpStats)
            .catch(() => {});
        GamificationService.getMyBadges()
            .then(data => {
                const s = (data.earned || [])
                    .filter(b => b.is_showcased)
                    .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99));
                setShowcase(s);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        axiosInstance.get('/users/me/trust').then(r => setTrust(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        let cancelled = false;
        setHistoryLoading(true);
        AuthService.getHistory(historyPage, 10)
            .then(async data => {
                if (cancelled) return;
                setHistory(data.items);
                setHistoryTotal(data.total);

                const taskIds = data.items.map(i => i.task_id).filter(Boolean);
                const found   = new Set();
                await Promise.all(taskIds.map(async tid => {
                    try {
                        await AnalysisService.getFullReport(tid);
                        found.add(tid);
                    } catch {}
                }));
                if (!cancelled) setFullReports(found);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setHistoryLoading(false); });
        return () => { cancelled = true; };
    }, [historyPage]);

    const totalPages = Math.ceil(historyTotal / 10);

    const STAT_CARDS = [
        {
            label:  '// BU HAFTA',
            value:  stats?.week_analyzed ?? '—',
            sub:    'haber incelendi',
            color:  'var(--color-brand-primary)',
        },
        {
            label:  '// SAHTE TESPİT',
            value:  stats?.week_fake ?? '—',
            sub:    'bu hafta',
            color:  '#ff7351',
        },
        {
            label:  '// HİJYEN SKORU',
            value:  stats ? `${stats.hygiene_score}` : '—',
            sub:    '/ 100 puan',
            color:  '#f59e0b',
        },
        {
            label:  '// FORUM İTİBARI',
            value:  trust ? trust.display_label : '—',
            sub:    trust ? `${trust.score.toFixed(0)}/100 skor` : '—',
            color:  'var(--color-brand-primary)',
            stars:  trust?.stars,
        },
    ];

    return (
        <div className="space-y-5">

            {/* ── İstatistik kartları ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STAT_CARDS.map(({ label, value, sub, color, stars }) => (
                    <div
                        key={label}
                        className="relative border overflow-hidden"
                        style={S}
                    >
                        <Corner />
                        <div className="p-4">
                            <p
                                className="font-mono text-xs tracking-widest uppercase mb-3"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {label}
                            </p>
                            <p
                                className="font-mono text-3xl font-black leading-none mb-1"
                                style={{ color }}
                            >
                                {value}
                            </p>
                            {stars != null && (
                                <p className="font-mono text-sm mb-1" style={{ color }}>
                                    {'★'.repeat(Math.min(stars, 5))}
                                </p>
                            )}
                            <p
                                className="font-mono text-xs tracking-wide"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {sub}
                            </p>
                            {stars != null && trust && (
                                <div
                                    className="mt-3 h-[2px]"
                                    style={{ background: 'var(--color-terminal-border-raw)' }}
                                >
                                    <div
                                        className="h-full transition-all duration-700"
                                        style={{ width: `${Math.min(trust.score, 100)}%`, background: color }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* XP & Seviye */}
            {xpStats && (
                <div className="relative border mb-4 p-4" style={S}>
                    <Corner />
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest"
                              style={{ color: 'var(--color-brand-primary)' }}>
                        </span>
                        <span className="font-mono text-[10px]"
                              style={{ color: 'var(--color-text-muted)' }}>
                            {xpStats.total_xp} XP
                        </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden"
                         style={{ background: 'var(--color-terminal-border-raw)' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${xpStats.xp_progress_pct}%`, background: 'var(--color-brand-primary)' }} />
                    </div>
                    <p className="font-mono text-[10px] mt-1"
                       style={{ color: 'var(--color-text-muted)' }}>
                        Sonraki seviye: {xpStats.xp_to_next_level} XP kaldı
                    </p>
                </div>
            )}

            {/* Rozet Vitrini */}
            <div className="relative border mb-4" style={S}>
                <Corner />
                <div className="px-4 py-2 border-b flex items-center justify-between" style={BD}>
                    <span className="font-mono text-[10px] uppercase tracking-widest"
                          style={{ color: 'var(--color-brand-primary)' }}>// ROZET VİTRİNİ</span>
                    <button onClick={() => setShowBadgeModal(true)}
                            className="font-mono text-[9px] px-2 py-0.5 border transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-accent-blue)', borderColor: 'var(--color-accent-blue)' }}>
                        Düzenle
                    </button>
                </div>
                <div className="flex gap-3 px-4 py-3">
                    {[0, 1, 2].map(i => {
                        const badge = showcase[i];
                        if (!badge) return (
                            <div key={i}
                                 className="flex-1 h-16 border flex items-center justify-center"
                                 style={{ borderColor: 'var(--color-terminal-border-raw)', borderStyle: 'dashed' }}>
                                <span className="font-mono text-[10px]"
                                      style={{ color: 'var(--color-text-muted)' }}>boş</span>
                            </div>
                        );
                        return (
                            <div key={badge.key}
                                 className="flex-1 h-16 border flex flex-col items-center justify-center gap-1"
                                 style={{ borderColor: badge.color, background: `${badge.color}10` }}>
                                <span className="font-mono text-xs font-black" style={{ color: badge.color }}>
                                    {badge.name[0]}
                                </span>
                                <span className="font-mono text-[9px] text-center px-1 leading-tight"
                                      style={{ color: badge.color }}>{badge.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showBadgeModal && (
                <BadgeShowcaseModal
                    onClose={() => setShowBadgeModal(false)}
                    onSave={() => {
                        GamificationService.getMyBadges().then(data => {
                            const s = (data.earned || [])
                                .filter(b => b.is_showcased)
                                .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99));
                            setShowcase(s);
                        });
                    }}
                />
            )}

            {/* ── Insights ── */}
            <InsightsPanel />

            {/* ── Son Analizler ── */}
            <div className="relative border overflow-hidden" style={S}>
                <Corner />

                {/* Başlık */}
                <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
                    <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-brand-primary)' }}>
                    </span>
                    {historyTotal > 0 && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {historyTotal} kayıt
                        </span>
                    )}
                </div>

                {/* İçerik */}
                {historyLoading ? (
                    <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    </div>
                ) : (
                    <div>
                        {history.map((item, idx) => {
                            const borderColor  = PREDICTION_BORDER[item.prediction] ?? 'transparent';
                            const hasFullRep   = fullReports.has(item.task_id);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`flex items-center gap-3 px-4 py-3 border-l-2 cursor-pointer transition-colors ${idx < history.length - 1 ? 'border-b' : ''}`}
                                    style={{
                                        borderColor:     'var(--color-terminal-border-raw)',
                                        borderLeftColor: borderColor + '60',
                                    }}
                                    onMouseEnter={e => { if (item.prediction) e.currentTarget.style.borderLeftColor = borderColor; }}
                                    onMouseLeave={e => { if (item.prediction) e.currentTarget.style.borderLeftColor = borderColor + '60'; }}
                                >
                                    <TypeBadge type={item.analysis_type} />
                                    <p
                                        className="flex-1 text-sm font-mono truncate min-w-0"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {item.title ?? item.task_id ?? '—'}
                                    </p>
                                    {item.prediction && <PredictionBadge prediction={item.prediction} />}
                                    <p
                                        className="font-mono text-[11px] shrink-0"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                    </p>
                                    {/* Tam rapor göstergesi */}
                                    {item.task_id && (
                                        <span
                                            className="font-mono text-[10px] font-bold px-1.5 py-0.5 border shrink-0"
                                            style={hasFullRep
                                                ? { color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.3)' }
                                                : { color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)', opacity: 0.4 }
                                            }
                                        >
                                            {hasFullRep ? 'TAM RAPOR' : 'YOK'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Sayfalama */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t flex items-center justify-between" style={BD}>
                        <button
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            className="p-1 transition-opacity disabled:opacity-20"
                        >
                            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {historyPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                            disabled={historyPage === totalPages}
                            className="p-1 transition-opacity disabled:opacity-20"
                        >
                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2 border-t flex justify-between" style={BD}>
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    </span>
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>
                        v2.4
                    </span>
                </div>
            </div>

            {selectedItem && (
                <HistoryModal
                    item={selectedItem}
                    hasFullReport={fullReports.has(selectedItem.task_id)}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
};

export default ProfileOverview;
