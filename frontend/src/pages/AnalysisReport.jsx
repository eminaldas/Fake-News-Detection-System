import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Share2, ShieldCheck, ShieldX, Shield,
    Radar, Copy, CheckCheck,
} from 'lucide-react';
import { useReport } from '../hooks/useReport';
import FactChecksSection        from '../features/analysis/report/FactChecksSection';
import PropagandaSection        from '../features/analysis/report/PropagandaSection';
import SourceCredibilitySection from '../features/analysis/report/SourceCredibilitySection';
import LinguisticSection        from '../features/analysis/report/LinguisticSection';
import FeedbackSection          from '../features/analysis/report/FeedbackSection';
import ReportSkeleton           from '../features/analysis/report/ReportSkeleton';
import VerdictExplanationSection from '../features/analysis/report/VerdictExplanationSection';
import SourceBiasSection         from '../features/analysis/report/SourceBiasSection';

/* ── Tasarım sabitleri ── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

/* Verdict teması */
function getTheme(mlVerdict) {
    if (mlVerdict === 'AUTHENTIC') return { hex: '#3fff8b', Icon: ShieldCheck, label: 'GÜVENİLİR İÇERİK' };
    if (mlVerdict === 'FAKE')      return { hex: '#ff7351', Icon: ShieldX,    label: 'ŞÜPHELİ İÇERİK'  };
    return                                { hex: '#f59e0b', Icon: Shield,      label: 'BELİRSİZ'         };
}

/* Section wrapper — başlık border'ı keser */
function ReportBlock({ title, children }) {
    return (
        <div className="relative border" style={S}>
            <span
                className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
                style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
            >
                {title}
            </span>
            <div className="p-5 pt-6">
                {children}
            </div>
        </div>
    );
}

/* Higyen + Kesinlik metrikleri */
function MetricBar({ report, mlVerdict, confidence }) {
    const manipulation = report?.linguistic?.manipulation_density ?? null;
    if (manipulation === null && confidence === null) return null;

    const hygieneScore = manipulation !== null
        ? Math.round((1 - manipulation) * 100)
        : mlVerdict === 'AUTHENTIC'
            ? Math.round(confidence * 100)
            : Math.round((1 - confidence) * 100);
    const certScore  = confidence != null ? Math.round(confidence * 100) : null;
    const hColor     = hygieneScore >= 60 ? '#3fff8b' : hygieneScore >= 35 ? '#f59e0b' : '#ff7351';
    const hLabel     = hygieneScore >= 60 ? 'İyi seviye' : hygieneScore >= 35 ? 'Orta — dikkatli olun' : 'Kritik — yüksek manipülasyon';
    const SEGS       = 16;
    const filled     = Math.round((hygieneScore / 100) * SEGS);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Hijyen */}
            <div className="relative border md:col-span-2 p-5" style={S}>
                <p className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    // HİJYEN_SKORU
                </p>
                <div className="flex items-end gap-3 mb-3">
                    <span className="font-mono text-5xl font-black leading-none" style={{ color: hColor }}>{hygieneScore}</span>
                    <span className="font-mono text-sm mb-1" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>/ 100</span>
                </div>
                <div className="flex gap-[3px] mb-2">
                    {Array.from({ length: SEGS }).map((_, i) => (
                        <div key={i} className="h-2 flex-1"
                             style={{ background: i < filled ? hColor : 'var(--color-terminal-border-raw)',
                                      opacity: i < filled ? (0.35 + (i / SEGS) * 0.65) : 1 }} />
                    ))}
                </div>
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{hLabel}</p>
            </div>

            {/* Kesinlik */}
            {certScore !== null && (
                <div className="relative border flex flex-col items-center justify-center p-5 text-center" style={S}>
                    <p className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        // KESİNLİK
                    </p>
                    <Radar className="w-7 h-7 mb-2" style={{ color: 'var(--color-brand-primary)' }} />
                    <span className="font-mono text-4xl font-black" style={{ color: 'var(--color-brand-primary)' }}>%{certScore}</span>
                    <p className="font-mono text-[10px] mt-1 tracking-wide" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>güven skoru</p>
                </div>
            )}
        </div>
    );
}

export default function AnalysisReport() {
    const { taskId }  = useParams();
    const navigate    = useNavigate();
    const { report, confidence, mlVerdict, loading, error } = useReport(taskId);
    const [copied, setCopied] = React.useState(false);

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    const shortId = taskId?.slice(0, 8).toUpperCase();
    const theme   = getTheme(mlVerdict);

    return (
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-5">

            {/* ── Üst nav ── */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 font-mono text-sm transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    geri dön
                </button>
                <div className="flex items-center gap-3">
                    {shortId && (
                        <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-1 border" style={{ ...BD, color: 'var(--color-text-muted)', opacity: 0.6 }}>
                            RAPOR #{shortId}
                        </span>
                    )}
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 font-mono text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'kopyalandı' : 'paylaş'}
                    </button>
                </div>
            </div>

            {/* ── Başlık ── */}
            <div className="relative border overflow-hidden" style={{ ...S, borderColor: theme.hex + '40', borderTop: `2px solid ${theme.hex}` }}>
                {/* Köşe aksanları verdict renginde */}
                <div className="absolute top-0 left-0 w-5 h-[2px] pointer-events-none" style={{ background: theme.hex }} />
                <div className="absolute top-0 left-0 h-5 w-[2px] pointer-events-none" style={{ background: theme.hex }} />
                <div className="absolute bottom-0 right-0 w-5 h-[2px] pointer-events-none" style={{ background: theme.hex }} />
                <div className="absolute bottom-0 right-0 h-5 w-[2px] pointer-events-none" style={{ background: theme.hex }} />

                <div className="px-6 py-5 flex items-center gap-5" style={{ background: theme.hex + '08' }}>
                    <theme.Icon className="w-10 h-10 shrink-0" style={{ color: theme.hex }} />
                    <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: theme.hex, opacity: 0.8 }}>
                            // TAM_ANALİZ_RAPORU
                        </p>
                        <p className="font-mono text-xl font-black" style={{ color: theme.hex }}>
                            {theme.label}
                        </p>
                        <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                            Gemini AI · Google Search grounding
                            {report && ` · ${new Date(report.generated_at).toLocaleString('tr-TR')}`}
                        </p>
                    </div>
                    {mlVerdict && (
                        <div className="shrink-0 text-right hidden sm:block">
                            <Share2
                                className="w-4 h-4 cursor-pointer transition-opacity hover:opacity-60"
                                style={{ color: theme.hex, opacity: 0.4 }}
                                onClick={handleShare}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && <ReportSkeleton />}

            {/* ── Hata ── */}
            {!loading && error && (
                <div className="border px-5 py-4" style={{ borderColor: '#ff735150', background: 'rgba(255,115,81,0.06)' }}>
                    <p className="font-mono text-sm" style={{ color: '#ff7351' }}>
                        <span className="font-black">[ ERR ]</span> {error}
                    </p>
                </div>
            )}

            {!loading && !error && !report && <ReportSkeleton />}

            {/* ── Rapor içeriği ── */}
            {report && (
                <div className="flex flex-col gap-5">

                    {/* Metrik barlar */}
                    <MetricBar report={report} mlVerdict={mlVerdict} confidence={confidence} />

                    {/* ── Oylama (ÜST KISIM) ── */}
                    <FeedbackSection
                        taskId={taskId}
                        forumThreadId={report.forum_thread_id ?? null}
                    />

                    {/* Genel değerlendirme */}
                    {report.overall_assessment && (
                        <ReportBlock title="// GENEL_DEĞERLENDİRME">
                            <p className="font-mono text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                {report.overall_assessment}
                            </p>
                        </ReportBlock>
                    )}

                    {/* Karar gerekçesi */}
                    {report.verdict_explanation && (
                        <ReportBlock title="// KARAR_GEREKÇESİ">
                            <VerdictExplanationSection verdictExplanation={report.verdict_explanation} />
                        </ReportBlock>
                    )}

                    {/* Doğrulama bulguları */}
                    {report.fact_checks?.length > 0 && (
                        <ReportBlock title="// DOĞRULAMA_BULGULARI">
                            <FactChecksSection factChecks={report.fact_checks} />
                        </ReportBlock>
                    )}

                    {/* Propaganda */}
                    {report.propaganda_techniques && (
                        <ReportBlock title="// PROPAGANDA_ANALİZİ">
                            <PropagandaSection techniques={report.propaganda_techniques} />
                        </ReportBlock>
                    )}

                    {/* Kaynak bias */}
                    {report.source_analysis && (
                        <ReportBlock title="// KAYNAK_BIAS_ANALİZİ">
                            <SourceBiasSection sourceAnalysis={report.source_analysis} />
                        </ReportBlock>
                    )}

                    {/* Kaynak & dilbilim */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {report.source_credibility && (
                            <ReportBlock title="// KAYNAK_GÜVENİLİRLİĞİ">
                                <SourceCredibilitySection text={report.source_credibility} />
                            </ReportBlock>
                        )}
                        {report.linguistic && (
                            <ReportBlock title="// DİLBİLİM_ANALİZİ">
                                <LinguisticSection linguistic={report.linguistic} />
                            </ReportBlock>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between py-2">
                        <span className="font-mono text-[10px] tracking-widest opacity-30" style={{ color: 'var(--color-text-muted)' }}>
                            // {report.model} · {new Date(report.generated_at).toLocaleString('tr-TR')}
                        </span>
                        <span className="font-mono text-[10px] tracking-widest opacity-30" style={{ color: 'var(--color-brand-primary)' }}>
                            v2.4
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
