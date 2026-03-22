import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useAnalysis } from "../hooks/useAnalysis";
import AnalysisForm from "../features/analysis/AnalysisForm";
import AnalysisResultCard from "../features/analysis/AnalysisResultCard";
import AnalysisResultSkeleton from "../features/analysis/AnalysisResultSkeleton";
import RecentHeadlines from "../components/features/analysis/RecentHeadlines";
import TwitterFeedCard from "../components/features/analysis/TwitterFeedCard";
import TwitterFeedSkeleton from "../components/features/analysis/TwitterFeedSkeleton";
import AnalysisDisclaimer from "../features/analysis/AnalysisDisclaimer";

const Home = () => {
  const { analyze, analyzeUrl, loading, result, error, isPolling } = useAnalysis();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const showAnalysisSkeleton = loading || isPolling;

  return (
    <div className="w-full min-h-[80vh] flex flex-col px-4 md:px-6">

      {/* ── Hero ── */}
      <div className="text-center mb-12 mt-2 animate-fade-up flex flex-col items-center gap-4">

        {/* Badge pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                        bg-surface dark:bg-es-surface
                        border border-brutal-border dark:border-es-primary/20
                        shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-es-primary animate-pulse-soft" />
          <span className="text-[10px] font-manrope font-black uppercase tracking-widest text-tx-secondary dark:text-es-primary">
            Yapay Zeka Destekli Doğrulama
          </span>
        </div>

        {/* Ana başlık */}
        <h1 className="text-5xl md:text-7xl font-manrope font-extrabold text-tx-primary dark:text-tx-primary tracking-tighter leading-[0.95]">
          Verify the{' '}
          <span className="italic text-brand dark:text-es-primary">Truth</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-base text-tx-secondary max-w-xl mx-auto leading-relaxed font-inter">
          Bilgi kirliliğinin ötesine geçin. Şüpheli haberi, iddiayı ya da metni
          aşağıya yapıştırın — sistem dilbilimsel sinyalleri değerlendirip
          bilgi tabanıyla karşılaştırarak gerçeklik analizi yapar.
        </p>
      </div>

      {/* ── 3 Kolon Layout ── */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6
                      w-full max-w-[1400px] mx-auto pb-8 items-start">

        {/* Sol: Günlük Trendler */}
        <div className="hidden lg:block lg:col-span-3 top-28">
          <RecentHeadlines />
        </div>

        {/* Orta: Analiz aracı */}
        <div className="col-span-1 lg:col-span-6 flex flex-col min-h-[600px]">

          {/* Gradient glow wrapper — dark modda emerald/mavi parlama */}
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl pointer-events-none opacity-20 dark:opacity-100
                            bg-gradient-to-r from-brand/8 via-brutal-border/20 to-brand/8 dark:from-es-primary/10 dark:via-es-secondary/8 dark:to-es-primary/10
                            blur-2xl" />
            <div className="relative">
              <AnalysisForm
                onAnalyze={analyze}
                onAnalyzeUrl={analyzeUrl}
                loading={loading}
                isPolling={isPolling}
                _error={error}
              />
            </div>
          </div>

          {/* Hata mesajı */}
          {error && (
            <div className="animate-fade-up mt-6 border-l-4 border-l-es-error
                            bg-es-error/5 dark:bg-es-error/8
                            p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-es-error shrink-0 mt-0.5" />
              <div>
                <h3 className="text-es-error font-manrope font-bold text-sm">Analiz Hatası</h3>
                <p className="text-es-error/80 text-xs mt-1 font-inter">{error}</p>
              </div>
            </div>
          )}

          {!loading && !isPolling && !result && <AnalysisDisclaimer />}

          <div className="mt-6 w-full">
            {showAnalysisSkeleton ? (
              <AnalysisResultSkeleton />
            ) : result ? (
              <AnalysisResultCard result={result} />
            ) : null}
          </div>
        </div>

        {/* Sağ: Twitter / Sosyal Akış */}
        <div className="hidden lg:block lg:col-span-3 sticky top-28 animate-fade-right">
          {initialLoading ? <TwitterFeedSkeleton /> : <TwitterFeedCard />}
        </div>
      </div>
    </div>
  );
};

export default Home;
