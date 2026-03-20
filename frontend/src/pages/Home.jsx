import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useAnalysis } from "../hooks/useAnalysis";
import AnalysisForm from "../features/analysis/AnalysisForm";
import AnalysisResultCard from "../features/analysis/AnalysisResultCard";
import AnalysisResultSkeleton from "../features/analysis/AnalysisResultSkeleton";
import RecentHeadlines from "../components/features/analysis/RecentHeadlines";
import RecentHeadlinesSkeleton from "../components/features/analysis/RecentHeadlinesSkeleton";
import TwitterFeedCard from "../components/features/analysis/TwitterFeedCard";
import TwitterFeedSkeleton from "../components/features/analysis/TwitterFeedSkeleton";
import AnalysisDisclaimer from "../features/analysis/AnalysisDisclaimer";

const Home = () => {
  const { analyze, analyzeUrl, loading, result, error, isPolling } = useAnalysis();
  const [initialLoading, setInitialLoading] = useState(true);

  // Yan kolonlardaki mock veriler için yüklenme animasyonunu simüle et
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const showAnalysisSkeleton = loading || isPolling;

  return (
    <div className="w-full min-h-[80vh] flex flex-col">

      {/* ── Başlık ── */}
      <div className="text-center mb-8 mt-2 animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-outfit font-extrabold text-[#363934] dark:text-[#f0f0f2] mb-3 tracking-tight">
          Verify the{' '}
          <span className="text-[#059669] dark:text-[#34d399]">Truth</span>
        </h1>
        <p className="text-base md:text-lg text-tx-primary dark:text-tx-primary opacity-90 max-w-2xl mx-auto font-medium">
          Paste any news article, claim, or text below. Our AI evaluates
          linguistic signals and compares them against the verified knowledge
          base to detect fabrication.
        </p>
      </div>

      {/* ── 3 Kolon Layout ── */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[1400px] mx-auto pb-8 items-start">

        {/* Sol: Son Başlıklar — sticky, sayfayla scroll etmez */}
        <div className="hidden lg:block lg:col-span-3 sticky top-28">
          {initialLoading ? <RecentHeadlinesSkeleton /> : <RecentHeadlines />}
        </div>

        {/* Orta: Analiz aracı */}
        <div className="col-span-1 lg:col-span-6 flex flex-col min-h-[600px]">
          <AnalysisForm
            onAnalyze={analyze}
            onAnalyzeUrl={analyzeUrl}
            loading={loading}
            isPolling={isPolling}
            _error={error}
          />

          {error && (
            <div className="animate-fade-up mt-6 border-l-4 border-l-[#bc6c25] dark:border-l-[#f97316] bg-[#e9ddd0]/60 dark:bg-[#1a1210] p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-[#bc6c25] dark:text-[#fb923c] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[#bc6c25] dark:text-[#fb923c] font-bold">Analysis Error</h3>
                <p className="text-[#bc6c25] dark:text-[#fb923c] opacity-90 text-sm mt-1">{error}</p>
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

        {/* Sağ: Twitter Feed — sticky, sayfayla scroll etmez */}
        <div className="hidden lg:block lg:col-span-3 sticky top-28 animate-fade-right">
          {initialLoading ? <TwitterFeedSkeleton /> : <TwitterFeedCard />}
        </div>
      </div>
    </div>
  );
};

export default Home;
