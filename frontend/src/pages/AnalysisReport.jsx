import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, ShieldCheck, Radar } from 'lucide-react';
import { useReport } from '../hooks/useReport';
import FactChecksSection        from '../features/analysis/report/FactChecksSection';
import PropagandaSection        from '../features/analysis/report/PropagandaSection';
import SourceCredibilitySection from '../features/analysis/report/SourceCredibilitySection';
import LinguisticSection        from '../features/analysis/report/LinguisticSection';
import FeedbackSection          from '../features/analysis/report/FeedbackSection';
import ReportSkeleton           from '../features/analysis/report/ReportSkeleton';

function HygieneBar({ report, mlVerdict, confidence }) {
    const manipulation = report?.linguistic?.manipulation_density ?? null;
    if (manipulation === null && confidence === null) return null;

    const hygieneScore = manipulation !== null
        ? Math.round((1 - manipulation) * 100)
        : mlVerdict === 'AUTHENTIC' ? Math.round(confidence * 100) : Math.round((1 - confidence) * 100);

    const certScore = confidence != null ? Math.round(confidence * 100) : null;

    const hygieneColor = hygieneScore >= 60 ? '#3fff8b' : hygieneScore >= 35 ? '#f59e0b' : '#ff7351';
    const hygieneLabel = hygieneScore >= 60 ? 'İyi seviye' : hygieneScore >= 35 ? 'Orta seviye — dikkatli olun' : 'Kritik seviye — yüksek manipülasyon tespit edildi';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Haber Hijyeni */}
            <div className="md:col-span-2 rounded-2xl p-6 bg-surface-container-high/30 border border-brutal-border/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-tx-secondary" />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-tx-secondary">Haber Hijyeni Puanı</span>
                    </div>
                </div>
                <div className="flex items-end gap-2 mb-3">
                    <span className="font-manrope text-6xl font-black leading-none" style={{ color: hygieneColor }}>{hygieneScore}</span>
                    <span className="text-tx-secondary/50 text-sm pb-1">/ 100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-brutal-border/30 overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width: `${hygieneScore}%`, background: hygieneColor }} />
                </div>
                <p className="text-[11px] text-tx-secondary/70">{hygieneLabel}</p>
            </div>

            {/* Analiz Kesinliği */}
            {certScore !== null && (
                <div className="rounded-2xl p-6 bg-surface-container-high/30 border border-brutal-border/20 flex flex-col items-center justify-center text-center">
                    <Radar className="w-8 h-8 text-primary mb-3" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-tx-secondary block mb-1">Analiz Kesinliği</span>
                    <span className="font-manrope text-4xl font-black text-primary">%{certScore}</span>
                </div>
            )}
        </div>
    );
}

export default function AnalysisReport() {
    const { taskId } = useParams();
    const { report, confidence, mlVerdict, loading, error } = useReport(taskId);

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
    };

    const shortId = taskId?.slice(0, 8).toUpperCase();

    return (
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-12 flex flex-col gap-8">

            {/* Nav */}
            <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-sm text-tx-secondary hover:text-tx-primary transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Geri Dön
                </Link>
                <div className="flex items-center gap-3">
                    {shortId && (
                        <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-tx-secondary/50 border border-brutal-border/30 px-3 py-1.5 rounded-full">
                            Rapor #{shortId}
                        </span>
                    )}
                    <button onClick={handleShare} className="flex items-center gap-2 text-sm text-tx-secondary hover:text-tx-primary transition-colors font-medium">
                        <Share2 className="w-4 h-4" />
                        Paylaş
                    </button>
                </div>
            </div>

            {/* Başlık */}
            <div>
                <h1 className="text-3xl md:text-4xl font-manrope font-extrabold text-tx-primary tracking-tight mb-1">
                    Tam Analiz Raporu
                </h1>
                <p className="text-tx-secondary/60 text-sm">
                    Gemini AI · Google Search grounding ile doğrulama
                </p>
            </div>

            {/* Loading */}
            {loading && <ReportSkeleton />}

            {/* Hata */}
            {!loading && error && (
                <div className="rounded-2xl border border-es-error/30 bg-es-error/10 p-6 text-center">
                    <p className="text-es-error text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Rapor bekleniyor */}
            {!loading && !error && !report && <ReportSkeleton />}

            {/* Rapor hazır */}
            {report && (
                <div className="flex flex-col gap-8">

                    {/* Metrik barlar */}
                    <HygieneBar report={report} mlVerdict={mlVerdict} confidence={confidence} />

                    {/* Genel değerlendirme */}
                    {report.overall_assessment && (
                        <div className="rounded-2xl p-6 bg-surface-container-high/30 border border-brutal-border/20">
                            <h2 className="font-manrope font-bold text-base text-tx-primary mb-3 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-tx-secondary" />
                                Genel Değerlendirme
                            </h2>
                            <p className="text-tx-primary/90 text-sm leading-relaxed">{report.overall_assessment}</p>
                        </div>
                    )}

                    {/* Doğrulama bulguları */}
                    <FactChecksSection factChecks={report.fact_checks} />

                    {/* Propaganda */}
                    <PropagandaSection techniques={report.propaganda_techniques} />

                    {/* Alt panel: kaynak + dilbilim */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SourceCredibilitySection text={report.source_credibility} />
                        <LinguisticSection linguistic={report.linguistic} />
                    </div>

                    <FeedbackSection taskId={taskId} />

                    <p className="text-tx-secondary/30 text-[10px] text-center pb-4">
                        {new Date(report.generated_at).toLocaleString('tr-TR')} · {report.model}
                    </p>
                </div>
            )}
        </div>
    );
}
