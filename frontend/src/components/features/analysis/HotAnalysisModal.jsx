import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldX, ShieldCheck, Shield, Brain, FileSearch, Loader2, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AnalysisService from '../../../services/analysis.service';

const SIGNAL_LABELS = {
    clickbait_score:    'Clickbait',
    exclamation_ratio:  'Ünlem',
    uppercase_ratio:    'Büyük Harf',
    hedge_ratio:        'Belirsiz Kaynak',
    question_density:   'Soru Yoğunluğu',
    number_density:     'Sayısal Veri',
};

const POSITIVE_SIGNALS = Object.keys(SIGNAL_LABELS);

function getTheme(prediction) {
    if (prediction === 'FAKE')      return { hex: '#ff7351', glowRgb: '255,115,81', Icon: ShieldX,     label: 'Şüpheli İçerik',   textCls: 'text-es-error' };
    if (prediction === 'AUTHENTIC') return { hex: '#3fff8b', glowRgb: '63,255,139',  Icon: ShieldCheck, label: 'Güvenilir İçerik', textCls: 'text-es-primary' };
    return                                 { hex: '#f59e0b', glowRgb: '245,158,11',  Icon: Shield,      label: 'Belirsiz',         textCls: 'text-amber-500' };
}

export default function HotAnalysisModal({ item, onClose }) {
    const navigate            = useNavigate();
    const { isAuthenticated } = useAuth();

    const [analysisData,  setAnalysisData]  = useState(null);
    const [hasFullReport, setHasFullReport] = useState(false);
    const [loading,       setLoading]       = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statusRes = await AnalysisService.checkStatus(item.task_id);
                setAnalysisData(statusRes);

                if (isAuthenticated) {
                    try {
                        await AnalysisService.getFullReport(item.task_id);
                        setHasFullReport(true);
                    } catch {
                        setHasFullReport(false);
                    }
                }
            } catch {
                setAnalysisData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [item.task_id, isAuthenticated]);

    const result     = analysisData?.result;
    const prediction = result?.prediction || item.status;
    const confidence = result?.confidence ?? item.confidence;
    const signals    = result?.signals || null;
    const aiComment  = result?.ai_comment || null;

    const theme   = getTheme(prediction);
    const pct     = confidence != null ? Math.round(confidence * 100) : null;
    const hex15   = `${theme.hex}26`;
    const hex30   = `${theme.hex}4d`;

    const topSignals = signals
        ? POSITIVE_SIGNALS
            .filter(k => (signals[k] || 0) > 0.05)
            .sort((a, b) => (signals[b] || 0) - (signals[a] || 0))
            .slice(0, 3)
        : [];

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
                style={{
                    background: 'var(--color-bg-surface-solid)',
                    border: `1px solid ${hex30}`,
                    borderTop: `3px solid ${theme.hex}`,
                    boxShadow: `0 8px 40px rgba(${theme.glowRgb},0.15), 0 2px 8px rgba(0,0,0,0.3)`,
                    animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3"
                     style={{ borderBottom: `1px solid ${hex15}` }}>
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                            <theme.Icon className={`w-4 h-4 ${theme.textCls} shrink-0`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textCls}`}>
                                {theme.label}
                            </span>
                        </div>
                        <p className="text-[13px] font-semibold leading-snug text-tx-primary line-clamp-3">
                            {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-tx-secondary">
                            <BarChart2 className="w-3 h-3" />
                            {item.request_count}× analiz edildi
                            {item.source_domain && (
                                <span className="text-brutal-border/60">· {item.source_domain}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-tx-secondary/40 hover:text-tx-primary transition-colors shrink-0 mt-0.5"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex flex-col gap-4">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-tx-secondary/60 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analiz yükleniyor...
                        </div>
                    ) : !result ? (
                        <p className="text-xs text-tx-secondary/60 text-center py-4">
                            Analiz verisi bulunamadı.
                        </p>
                    ) : (
                        <>
                            {/* Confidence */}
                            {pct != null && (
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 font-black text-base"
                                        style={{ border: `3px solid ${theme.hex}`, color: theme.hex, background: hex15 }}
                                    >
                                        %{pct}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-tx-primary mb-1.5">Güven Skoru</p>
                                        <div className="h-1.5 w-full rounded-full bg-brutal-border/20 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: theme.hex }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NLP Sinyalleri */}
                            {topSignals.length > 0 && (
                                <div className="rounded-xl p-3.5" style={{ background: hex15, borderLeft: `3px solid ${hex30}` }}>
                                    <div className={`flex items-center gap-1.5 mb-2.5 text-[10px] font-bold uppercase tracking-widest ${theme.textCls}`}>
                                        <Brain className="w-3 h-3" />
                                        NLP Sinyalleri
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {topSignals.map(key => (
                                            <div key={key} className="flex items-center gap-2">
                                                <span className="text-[10px] text-tx-secondary w-24 shrink-0">
                                                    {SIGNAL_LABELS[key]}
                                                </span>
                                                <div className="flex-1 h-1.5 rounded-full bg-brutal-border/20 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, Math.round((signals[key] || 0) * 100))}%`,
                                                            background: theme.hex,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-[9px] text-tx-secondary/60 w-8 text-right shrink-0">
                                                    {Math.round((signals[key] || 0) * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gemini AI özeti */}
                            {aiComment?.gemini_verdict && (
                                <div className="rounded-xl p-3.5" style={{ background: 'var(--color-bg-surface-solid)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-tx-secondary mb-1.5">
                                        Gemini Değerlendirmesi
                                    </div>
                                    <p className="text-[11px] text-tx-secondary leading-relaxed line-clamp-3 italic">
                                        {aiComment.summary || aiComment.gemini_verdict}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && hasFullReport && (
                    <div className="px-5 pb-4 pt-1">
                        <button
                            onClick={() => navigate(`/analysis/report/${item.task_id}`)}
                            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                            style={{ background: hex15, color: theme.hex, border: `1px solid ${hex30}` }}
                        >
                            <FileSearch className="w-3.5 h-3.5" />
                            Tam Raporu Gör →
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
