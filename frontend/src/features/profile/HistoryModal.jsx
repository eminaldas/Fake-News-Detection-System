import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldX, ShieldCheck, Shield, Loader2, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnalysisService from '../../services/analysis.service';

const SIGNAL_LABELS = {
    clickbait_score:   'Clickbait',
    exclamation_ratio: 'Ünlem Yoğunluğu',
    uppercase_ratio:   'Büyük Harf',
    hedge_ratio:       'Belirsiz Kaynak',
    question_density:  'Soru Yoğunluğu',
    number_density:    'Sayısal Veri',
};
const SIGNAL_KEYS = Object.keys(SIGNAL_LABELS);
const SEGS = 10;

function getTheme(prediction) {
    if (prediction === 'FAKE')
        return { hex: '#ff7351', Icon: ShieldX,     label: 'Şüpheli İçerik' };
    if (prediction === 'AUTHENTIC')
        return { hex: '#3fff8b', Icon: ShieldCheck, label: 'Güvenilir İçerik' };
    return     { hex: '#f59e0b', Icon: Shield,      label: 'Belirsiz' };
}

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

export default function HistoryModal({ item, hasFullReport, onClose }) {
    const navigate = useNavigate();
    const [result,  setResult]  = useState(null);
    const [loading, setLoading] = useState(!!item.task_id);

    useEffect(() => {
        if (!item.task_id) { setLoading(false); return; }
        AnalysisService.checkStatus(item.task_id)
            .then(d => setResult(d?.result ?? null))
            .catch(() => setResult(null))
            .finally(() => setLoading(false));
    }, [item.task_id]);

    const prediction = result?.prediction ?? item.prediction;
    const confidence = result?.confidence ?? null;
    const signals    = result?.signals    ?? null;
    const aiComment  = result?.ai_comment ?? null;
    const pct        = confidence != null ? Math.round(confidence * 100) : null;
    const theme      = getTheme(prediction);

    const topSignals = signals
        ? SIGNAL_KEYS
            .filter(k => (signals[k] ?? 0) > 0.03)
            .sort((a, b) => (signals[b] ?? 0) - (signals[a] ?? 0))
            .slice(0, 5)
        : [];

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl flex flex-col border overflow-hidden animate-fade-up"
                style={{
                    background:   'var(--color-terminal-surface)',
                    borderColor:  theme.hex + '60',
                    borderTop:    `2px solid ${theme.hex}`,
                    maxHeight:    '88vh',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Köşe aksanları */}
                <div className="absolute top-0 left-0 w-5 h-[2px] pointer-events-none" style={{ background: theme.hex }} />
                <div className="absolute top-0 left-0 h-5 w-[2px] pointer-events-none" style={{ background: theme.hex }} />
                <div className="absolute bottom-0 right-0 w-5 h-[2px] pointer-events-none" style={{ background: theme.hex }} />
                <div className="absolute bottom-0 right-0 h-5 w-[2px] pointer-events-none" style={{ background: theme.hex }} />

                {/* ── Header ── */}
                <div className="px-6 py-4 border-b flex items-start justify-between gap-4 shrink-0" style={BD}>
                    <div className="min-w-0">
                        <p
                            className="font-mono text-[10px] tracking-widest uppercase mb-2"
                            style={{ color: theme.hex }}
                        >
                            // KISA_ANALİZ
                        </p>
                        <p
                            className="font-mono text-sm leading-snug"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {item.title ?? item.task_id ?? '—'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 mt-0.5 opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* Verdict + Confidence */}
                    <div
                        className="px-6 py-5 border-b flex items-center gap-5"
                        style={{ background: theme.hex + '0D', borderColor: theme.hex + '25' }}
                    >
                        <theme.Icon className="w-10 h-10 shrink-0" style={{ color: theme.hex }} />
                        <div className="flex-1 min-w-0">
                            <p
                                className="font-mono text-2xl font-black mb-1"
                                style={{ color: theme.hex }}
                            >
                                {theme.label}
                            </p>
                            {pct != null && (
                                <>
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <div
                                            className="flex-1 h-[4px]"
                                            style={{ background: 'var(--color-terminal-border-raw)' }}
                                        >
                                            <div
                                                className="h-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: theme.hex }}
                                            />
                                        </div>
                                        <span
                                            className="font-mono text-sm font-black shrink-0"
                                            style={{ color: theme.hex }}
                                        >
                                            %{pct}
                                        </span>
                                    </div>
                                    <p
                                        className="font-mono text-xs"
                                        style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}
                                    >
                                        güven skoru
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-12">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.hex }} />
                            <span className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                // analiz yükleniyor...
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* NLP Sinyalleri */}
                            {topSignals.length > 0 && (
                                <div className="px-6 py-5 border-b" style={BD}>
                                    <p
                                        className="font-mono text-[11px] tracking-widest uppercase mb-4"
                                        style={{ color: theme.hex }}
                                    >
                                        // NLP_SIGNALS
                                    </p>
                                    <div className="space-y-3">
                                        {topSignals.map(key => {
                                            const val    = signals[key] ?? 0;
                                            const filled = Math.round(val * SEGS);
                                            return (
                                                <div key={key} className="flex items-center gap-4">
                                                    <span
                                                        className="font-mono text-xs w-36 shrink-0"
                                                        style={{ color: 'var(--color-text-secondary)' }}
                                                    >
                                                        {SIGNAL_LABELS[key]}
                                                    </span>
                                                    <div className="flex gap-[3px] flex-1">
                                                        {Array.from({ length: SEGS }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="h-3.5 flex-1"
                                                                style={{
                                                                    background: i < filled
                                                                        ? theme.hex
                                                                        : 'var(--color-terminal-border-raw)',
                                                                    opacity: i < filled
                                                                        ? (0.4 + (i / SEGS) * 0.6)
                                                                        : 1,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span
                                                        className="font-mono text-xs w-8 text-right shrink-0 font-bold"
                                                        style={{ color: theme.hex }}
                                                    >
                                                        {Math.round(val * 100)}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Gemini Değerlendirmesi */}
                            {aiComment?.gemini_verdict && (
                                <div className="px-6 py-5 border-b" style={BD}>
                                    <p
                                        className="font-mono text-[11px] tracking-widest uppercase mb-3"
                                        style={{ color: 'var(--color-brand-primary)' }}
                                    >
                                        // GEMINI_EVAL
                                    </p>
                                    <p
                                        className="font-mono text-sm leading-relaxed"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        {aiComment.summary || aiComment.gemini_verdict}
                                    </p>
                                </div>
                            )}

                            {/* Analiz yoksa mesaj */}
                            {!result && !loading && (
                                <div className="px-6 py-8 text-center">
                                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                        <span style={{ color: theme.hex }}>{'>'}</span>
                                        {' '}detaylı analiz verisi bulunamadı
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3 border-t flex items-center justify-between shrink-0" style={BD}>
                    <span
                        className="font-mono text-[10px] tracking-widest opacity-40"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        // {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </span>

                    {hasFullReport ? (
                        <button
                            onClick={() => navigate(`/analysis/report/${item.task_id}`)}
                            className="flex items-center gap-2 px-4 py-2 border font-mono text-sm font-bold tracking-wider transition-all hover:opacity-80"
                            style={{
                                borderColor: theme.hex + '50',
                                color:       theme.hex,
                                background:  theme.hex + '0D',
                            }}
                        >
                            <FileSearch className="w-4 h-4" />
                            [ TAM RAPOR → ]
                        </button>
                    ) : (
                        <span
                            className="font-mono text-[10px] tracking-widest opacity-30"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            // derin rapor yok
                        </span>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
