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
                className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{
                    background: 'var(--color-bg-surface)',
                    border: `1px solid ${hex30}`,
                    borderTop: `3px solid ${theme.hex}`,
                    boxShadow: `0 8px 40px rgba(${theme.glowRgb},0.15), 0 2px 8px rgba(0,0,0,0.3)`,
                    animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 flex items-start justify-between gap-3"
                     style={{ borderBottom: `1px solid ${hex15}` }}>
                    <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-2">
                            <theme.Icon className={`w-5 h-5 ${theme.textCls} shrink-0`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${theme.textCls}`}>
                                {theme.label}
                            </span>
                        </div>
                        <p className="text-base font-semibold leading-snug text-tx-primary">
                            {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-tx-secondary">
                            <BarChart2 className="w-3.5 h-3.5" />
                            {item.request_count}× analiz edildi
                            {item.source_domain && (
                                <span style={{ opacity: 0.6 }}>· {item.source_domain}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-tx-secondary/40 hover:text-tx-primary transition-colors shrink-0 mt-0.5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-tx-secondary/60 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analiz yükleniyor...
                        </div>
                    ) : !result ? (
                        <p className="text-sm text-tx-secondary/60 text-center py-6">
                            Analiz verisi bulunamadı.
                        </p>
                    ) : (
                        <>
                            {/* Güven Skoru */}
                            {pct != null && (
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 font-black text-lg"
                                        style={{ border: `3px solid ${theme.hex}`, color: theme.hex, background: hex15 }}
                                    >
                                        %{pct}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-tx-primary mb-2">Güven Skoru</p>
                                        <div className="h-2 w-full rounded-full bg-brutal-border/20 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: theme.hex }}
                                            />
                                        </div>
                                        <p className="text-xs text-tx-secondary mt-1.5" style={{ opacity: 0.7 }}>
                                            {pct >= 70
                                                ? 'Yüksek güvenle tespit edildi'
                                                : pct >= 50
                                                    ? 'Orta düzeyde güven'
                                                    : 'Düşük güven — ek doğrulama önerilir'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* NLP Sinyalleri */}
                            {topSignals.length > 0 && (
                                <div className="p-4" style={{ background: hex15, borderLeft: `3px solid ${hex30}` }}>
                                    <div className={`flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-widest ${theme.textCls}`}>
                                        <Brain className="w-3.5 h-3.5" />
                                        Tespit Edilen Sinyaller
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        {topSignals.map(key => (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="text-xs text-tx-secondary w-28 shrink-0">
                                                    {SIGNAL_LABELS[key]}
                                                </span>
                                                <div className="flex-1 h-2 rounded-full bg-brutal-border/20 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, Math.round((signals[key] || 0) * 100))}%`,
                                                            background: theme.hex,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-tx-secondary w-9 text-right shrink-0" style={{ opacity: 0.75 }}>
                                                    %{Math.round((signals[key] || 0) * 100)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gemini Değerlendirmesi */}
                            {aiComment?.gemini_verdict && (
                                <div className="p-4" style={{ background: 'var(--color-bg-surface-solid)', borderLeft: '3px solid var(--color-terminal-border-raw)' }}>
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <span className="text-xs font-bold uppercase tracking-widest text-tx-secondary">
                                            Gemini Değerlendirmesi
                                        </span>
                                        {aiComment.reason_type && (
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                                                style={{ background: `${theme.hex}1a`, color: theme.hex, border: `1px solid ${theme.hex}33` }}
                                            >
                                                {aiComment.reason_type}
                                            </span>
                                        )}
                                    </div>
                                    {aiComment.news_summary && (
                                        <p className="text-sm text-tx-secondary leading-relaxed mb-3">
                                            {aiComment.news_summary}
                                        </p>
                                    )}
                                    {aiComment.summary && aiComment.summary !== aiComment.news_summary && (
                                        <p className="text-sm text-tx-secondary leading-relaxed" style={{ opacity: 0.85 }}>
                                            {aiComment.summary}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && hasFullReport && (
                    <div className="px-6 pb-5 pt-1">
                        <button
                            onClick={() => navigate(`/analysis/report/${item.task_id}`)}
                            className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                            style={{ background: hex15, color: theme.hex, border: `1px solid ${hex30}` }}
                        >
                            <FileSearch className="w-4 h-4" />
                            Tam Raporu Gör →
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
