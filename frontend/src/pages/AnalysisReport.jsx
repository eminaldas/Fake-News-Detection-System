import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Radar, Copy, CheckCheck,
    FileText, Scale, Search, FlaskConical, Hash, History, Megaphone, Network, BookOpen, Type,
} from 'lucide-react';
import { useReport } from '../hooks/useReport';
import FactChecksSection        from '../features/analysis/report/FactChecksSection';
import PropagandaSection        from '../features/analysis/report/PropagandaSection';
import SourceCredibilitySection from '../features/analysis/report/SourceCredibilitySection';
import LinguisticSection        from '../features/analysis/report/LinguisticSection';
import FeedbackSection          from '../features/analysis/report/FeedbackSection';
import VerdictExplanationSection from '../features/analysis/report/VerdictExplanationSection';
import SourceBiasSection         from '../features/analysis/report/SourceBiasSection';
import VerdictHeader             from '../features/analysis/report/VerdictHeader';
import CredibilityScore          from '../features/analysis/report/CredibilityScore';
import DecisiveFactors           from '../features/analysis/report/DecisiveFactors';
import DomainContextSection      from '../features/analysis/report/DomainContextSection';
import NumericClaimsSection      from '../features/analysis/report/NumericClaimsSection';
import PrecedentCasesSection     from '../features/analysis/report/PrecedentCasesSection';
import ReportProgress            from '../features/analysis/report/ReportProgress';
import SectionHeading           from '../features/analysis/report/SectionHeading';

/* ── Tasarım sabitleri ── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

/* Section wrapper — ikonlu SectionHeading ile */
function ReportBlock({ title, icon, subtitle, children }) {
    return (
        <div className="relative border" style={S}>
            <div className="p-5">
                <SectionHeading icon={icon} title={title} subtitle={subtitle} />
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

            {/* ── Haber başlığı ── */}
                    {(report?.title || mlVerdict) && (
                        <p className="text-sm" style={{ color: 'var(--color-text-muted-accent)' }}>
                            {report?.title
                                ? <><span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{report.title}</span> haberinin tam raporu</>
                                : 'Tam analiz raporu'}
                        </p>
                    )}

            {/* ── Başlık ── */}
            <VerdictHeader verdict={report?.verdict} mlVerdict={mlVerdict} report={report} />

            {/* ── Loading ── */}
            {loading && !report && !error && <ReportProgress taskId={taskId} />}

            {/* ── Hata ── */}
            {!loading && error && (
                <div className="border px-5 py-4" style={{ borderColor: '#ff735150', background: 'rgba(255,115,81,0.06)' }}>
                    <p className="font-mono text-sm" style={{ color: '#ff7351' }}>
                        <span className="font-black">[ ERR ]</span> {error}
                    </p>
                </div>
            )}

            {!loading && !error && !report && <ReportProgress taskId={taskId} />}

            {/* ── Rapor içeriği ── */}
            {report && (
                <div className="flex flex-col gap-5">

                    {/* Skor — v3 çok boyutlu, yoksa legacy metrik */}
                    {report.credibility_score
                        ? <CredibilityScore credibilityScore={report.credibility_score} />
                        : <MetricBar report={report} mlVerdict={mlVerdict} confidence={confidence} />}

                    {/* Kararı belirleyen faktörler (v3) */}
                    {report.decisive_factors?.length > 0 && (
                        <ReportBlock title="Kararı Belirleyen Faktörler" icon={Scale}>
                            <DecisiveFactors factors={report.decisive_factors} />
                        </ReportBlock>
                    )}

                    {/* Genel değerlendirme */}
                    {report.overall_assessment && (
                        <ReportBlock title="Genel Değerlendirme" icon={FileText}>
                            <p className="font-mono text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                {report.overall_assessment}
                            </p>
                        </ReportBlock>
                    )}

                    {/* Karar gerekçesi — yalnızca legacy (v3'te DecisiveFactors var) */}
                    {!report.decisive_factors?.length && report.verdict_explanation && (
                        <ReportBlock title="Karar Gerekçesi" icon={Scale}>
                            <VerdictExplanationSection verdictExplanation={report.verdict_explanation} />
                        </ReportBlock>
                    )}

                    {/* Doğrulama bulguları */}
                    {report.fact_checks?.length > 0 && (
                        <ReportBlock title="Doğrulama Bulguları" icon={Search} subtitle="Haberdeki iddiaların kaynaklı tek tek doğrulaması">
                            <FactChecksSection factChecks={report.fact_checks} />
                        </ReportBlock>
                    )}

                    {/* Alana özel bağlam (v3) */}
                    {report.domain_context && (
                        <ReportBlock title="Alana Özel Bağlam" icon={FlaskConical}>
                            <DomainContextSection text={report.domain_context} />
                        </ReportBlock>
                    )}

                    {/* Sayısal iddialar (v3) */}
                    {report.numeric_claims?.length > 0 && (
                        <ReportBlock title="Sayısal İddialar" icon={Hash}>
                            <NumericClaimsSection claims={report.numeric_claims} />
                        </ReportBlock>
                    )}

                    {/* Emsal vakalar (v3) */}
                    {report.precedent_cases?.length > 0 && (
                        <ReportBlock title="Emsal Vakalar" icon={History}>
                            <PrecedentCasesSection cases={report.precedent_cases} />
                        </ReportBlock>
                    )}

                    {/* Propaganda */}
                    {report.propaganda_techniques?.length > 0 && (
                        <ReportBlock title="Propaganda Analizi" icon={Megaphone}>
                            <PropagandaSection techniques={report.propaganda_techniques} />
                        </ReportBlock>
                    )}

                    {/* Kaynak bias */}
                    {report.source_analysis?.sources_found?.length > 0 && (
                        <ReportBlock title="Kaynak Yanlılığı" icon={Network}>
                            <SourceBiasSection sourceAnalysis={report.source_analysis} />
                        </ReportBlock>
                    )}

                    {/* Kaynak & dilbilim */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {report.source_credibility && (
                            <ReportBlock title="Kaynak Güvenilirliği" icon={BookOpen}>
                                <SourceCredibilitySection text={report.source_credibility} />
                            </ReportBlock>
                        )}
                        {report.linguistic && (
                            <ReportBlock title="Dilbilimsel Analiz" icon={Type}>
                                <LinguisticSection linguistic={report.linguistic} />
                            </ReportBlock>
                        )}
                    </div>

                    {/* ── Oylama (ALT KISIM) ── */}
                    <FeedbackSection
                        taskId={taskId}
                        forumThreadId={report.forum_thread_id ?? null}
                    />

                    {/* Footer */}
                    <div className="flex items-center justify-between py-2">
                        <span className="font-mono text-[10px] tracking-widest opacity-30" style={{ color: 'var(--color-text-muted)' }}>
                            // {report.model} · {new Date(report.generated_at).toLocaleString('tr-TR')}
                        </span>
                        <span className="font-mono text-[10px] tracking-widest opacity-30" style={{ color: 'var(--color-brand-primary)' }}>
                            v3.0
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
}
