import React, { useRef, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useAnalysis } from "../hooks/useAnalysis";
import AnalysisForm from "../features/analysis/AnalysisForm";
import AnalysisResultCard from "../features/analysis/AnalysisResultCard";
import AnalysisResultSkeleton from "../features/analysis/AnalysisResultSkeleton";
import RecentHeadlines from "../components/features/analysis/RecentHeadlines";
import TwitterFeedCard from "../components/features/analysis/TwitterFeedCard";
import AnalysisDisclaimer from "../features/analysis/AnalysisDisclaimer";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [rateLimitReset, setRateLimitReset]       = useState(null);
  const [remaining, setRemaining]                 = useState(null);

  useEffect(() => {
      const handler = (e) => {
          setRateLimitExceeded(true);
          setRateLimitReset(e.detail.reset);
      };
      window.addEventListener('rate-limit-exceeded', handler);
      return () => window.removeEventListener('rate-limit-exceeded', handler);
  }, []);

  const { analyze, analyzeUrl, loading, result, error, isPolling } = useAnalysis();
  const showAnalysisSkeleton = loading || isPolling;
  const resultRef = useRef(null);

  // Analiz tamamlanınca sonuca smooth scroll
  useEffect(() => {
    if (!showAnalysisSkeleton && result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    }
  }, [result, showAnalysisSkeleton]);

  return (
    <div className="w-full min-h-[80vh] flex flex-col px-4 md:px-6">

      {/* Rate Limit Banner */}
      {rateLimitExceeded && (
          <div className="mb-4 p-4 rounded-xl bg-app-burgundy bg-opacity-10 border border-app-burgundy border-opacity-20 text-app-burgundy text-sm flex flex-col gap-2">
              <p className="font-bold">Günlük analiz limitinize ulaştınız.</p>
              {!isAuthenticated && (
                  <p>
                      <Link to="/register" className="underline font-semibold">Ücretsiz kayıt olarak</Link>{' '}
                      günde 20 analize erişebilirsiniz.
                  </p>
              )}
              <p className="text-xs opacity-70">Limit gece yarısı (UTC) sıfırlanır.</p>
          </div>
      )}

      {!isAuthenticated && remaining !== null && remaining <= 1 && !rateLimitExceeded && (
          <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs flex justify-between items-center">
              <span>
                  {remaining === 0
                      ? 'Tüm ücretsiz analizlerinizi kullandınız.'
                      : `${remaining} ücretsiz analiziniz kaldı.`}
              </span>
              <Link to="/register" className="font-bold underline">Kayıt Ol →</Link>
          </div>
      )}

      {/* ── Hero ── */}
      <div className="text-center mb-8 md:mb-12 mt-1 md:mt-2 flex flex-col items-center gap-3 md:gap-4">

        {/* Badge pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 rounded-full
                        bg-surface dark:bg-es-surface
                        border border-brutal-border dark:border-es-primary/20
                        shadow-sm animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-es-primary animate-pulse-soft shrink-0" />
          <span className="text-[9px] md:text-[10px] font-manrope font-black uppercase tracking-widest text-tx-secondary dark:text-es-primary">
            Yapay Zeka Destekli Doğrulama
          </span>
        </div>

        {/* Ana başlık */}
        <h1 style={{ animationDelay: '75ms' }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-manrope font-extrabold text-tx-primary tracking-tighter leading-[0.95] animate-fade-up">
          Verify the{' '}
          <span className="italic text-brand dark:text-es-primary">Truth</span>.
        </h1>

        {/* Subtitle */}
        <p style={{ animationDelay: '150ms', color: 'var(--color-text-secondary)' }}
           className="text-sm md:text-base max-w-sm md:max-w-xl mx-auto leading-relaxed font-inter px-2 md:px-0 animate-fade-up">
          Bilgi kirliliğinin ötesine geçin. Şüpheli haberi, iddiayı ya da metni
          aşağıya yapıştırın — sistem dilbilimsel sinyalleri değerlendirip
          bilgi tabanıyla karşılaştırarak gerçeklik analizi yapar.
        </p>
      </div>

      {/* ── 3 Kolon Layout ── */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6
                      w-full max-w-[1400px] mx-auto pb-8 items-start">

        {/* Sol: Günlük Trendler */}
        <div className="hidden lg:flex lg:col-span-3 flex-col animate-fade-left delay-200">
          <RecentHeadlines />
        </div>

        {/* Orta: Analiz aracı */}
        <div className="col-span-1 lg:col-span-6 flex flex-col min-h-[320px] md:min-h-[420px] lg:min-h-[500px] animate-fade-up delay-200">

          {/* Gradient glow wrapper */}
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl pointer-events-none opacity-10 dark:opacity-100
                            bg-gradient-to-r from-brand/8 via-brutal-border/20 to-brand/8
                            dark:from-es-primary/10 dark:via-es-secondary/8 dark:to-es-primary/10
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
            <div className="animate-fade-up mt-4 md:mt-6 border-l-4 border-l-es-error
                            bg-es-error/5 dark:bg-es-error/8
                            p-3 md:p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-es-error shrink-0 mt-0.5" />
              <div>
                <h3 className="text-es-error font-manrope font-bold text-sm">Analiz Hatası</h3>
                <p className="text-es-error/80 text-xs mt-1 font-inter">{error}</p>
              </div>
            </div>
          )}

          {/* Disclaimer — key ile re-animasyon */}
          {!loading && !isPolling && !result && (
            <AnalysisDisclaimer key="disclaimer" />
          )}

          {/* Sonuç alanı — key değişince animate-fade-up tetiklenir */}
          <div ref={resultRef} className="mt-4 md:mt-6 w-full">
            {showAnalysisSkeleton ? (
              <AnalysisResultSkeleton key="skeleton" />
            ) : result ? (
              <AnalysisResultCard
                key={`result-${result.task_id ?? result.prediction ?? Math.random()}`}
                result={result}
              />
            ) : null}
          </div>
        </div>

        {/* Sağ: Twitter / Sosyal Akış */}
        <div className="hidden lg:flex lg:col-span-3 flex-col animate-fade-right delay-300">
          <TwitterFeedCard />
        </div>
      </div>
    </div>
  );
};

export default Home;
