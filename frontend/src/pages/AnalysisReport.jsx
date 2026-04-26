import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useReport } from '../hooks/useReport';
import ClaimsSection      from '../features/analysis/report/ClaimsSection';
import PropagandaSection  from '../features/analysis/report/PropagandaSection';
import EntitySection      from '../features/analysis/report/EntitySection';
import SourceSection      from '../features/analysis/report/SourceSection';
import TimeContextSection from '../features/analysis/report/TimeContextSection';
import LinguisticSection  from '../features/analysis/report/LinguisticSection';
import ReportSkeleton     from '../features/analysis/report/ReportSkeleton';

export default function AnalysisReport() {
    const { taskId } = useParams();
    const { report, loading, error } = useReport(taskId);

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
            {/* Navigasyon */}
            <div className="flex items-center justify-between mb-6">
                <Link to="/" className="flex items-center gap-2 text-sm text-tx-secondary hover:text-tx-primary transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Analize Dön
                </Link>
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-sm text-tx-secondary hover:text-tx-primary transition-colors font-medium"
                >
                    <Share2 className="w-4 h-4" />
                    Paylaş
                </button>
            </div>

            {/* Başlık */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-manrope font-extrabold text-tx-primary tracking-tight">
                    Tam Analiz Raporu
                </h1>
                <p className="text-tx-secondary text-sm mt-1">
                    Gemini AI · Google Search grounding ile doğrulama
                </p>
            </div>

            {/* İçerik */}
            {loading && <ReportSkeleton />}

            {!loading && error && (
                <div className="rounded-xl border border-es-error/30 bg-es-error/10 p-6 text-center">
                    <p className="text-es-error text-sm font-medium">{error}</p>
                </div>
            )}

            {!loading && !error && !report && (
                <ReportSkeleton />
            )}

            {report && (
                <div className="space-y-8">
                    <ClaimsSection      claims={report.claims} />
                    <PropagandaSection  techniques={report.propaganda_techniques} />
                    <EntitySection      entities={report.entities} />
                    <SourceSection      sourceProfile={report.source_profile} />
                    <TimeContextSection timeContext={report.time_context} />
                    <LinguisticSection  linguistic={report.linguistic} />

                    <p className="text-tx-secondary/40 text-[10px] text-center pb-4">
                        Rapor oluşturuldu: {new Date(report.generated_at).toLocaleString('tr-TR')}
                        {' · '}{report.model}
                    </p>
                </div>
            )}
        </div>
    );
}
