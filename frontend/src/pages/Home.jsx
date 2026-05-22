import React, { useRef, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useAnalysis } from "../hooks/useAnalysis";
import { useImageAnalysis } from '../hooks/useImageAnalysis';
import AnalysisForm from "../features/analysis/AnalysisForm";
import ImageResultCard from '../features/analysis/ImageResultCard';
import AnalysisResultCard from "../features/analysis/AnalysisResultCard";
import AnalysisResultSkeleton from "../features/analysis/AnalysisResultSkeleton";
import RecentHeadlines from "../components/features/analysis/RecentHeadlines";
import AnalysisDisclaimer from "../features/analysis/AnalysisDisclaimer";
import HotAnalysesCard from "../components/features/analysis/HotAnalysesCard";
import SimilarNewsSection from "../features/analysis/SimilarNewsSection";
import PopularNewsSection from "../features/analysis/PopularNewsSection";
import PlatformStatsSection from "../features/analysis/PlatformStatsSection";
import ForumTrendBand from "../components/features/gundem/ForumTrendBand";
import { useForumTrends } from "../hooks/useForumTrends";

/* ── Kelime HUD çerçevesi ── */
function WordHUD({ color, exiting }) {
  const sides = [
    'top-0 left-0 h-[2px] w-[11px]', 'top-0 left-0 w-[2px] h-[11px]',
    'top-0 right-0 h-[2px] w-[11px]', 'top-0 right-0 w-[2px] h-[11px]',
    'bottom-0 left-0 h-[2px] w-[11px]', 'bottom-0 left-0 w-[2px] h-[11px]',
    'bottom-0 right-0 h-[2px] w-[11px]', 'bottom-0 right-0 w-[2px] h-[11px]',
  ];
  return (
    <span
      className="absolute pointer-events-none"
      style={{
        inset: '-5px -10px',
        animation: exiting
          ? 'wordHudExit 0.32s cubic-bezier(0.6,0,0.8,1) forwards'
          : 'wordHudEnter 0.30s cubic-bezier(0.1,0.9,0.2,1) both',
      }}
    >
      {sides.map((cls, i) => (
        <span key={i} className={`absolute block ${cls}`} style={{ background: color }} />
      ))}
    </span>
  );
}

/* ── Hero Subtitle ── */
function HeroSubtitle() {
  const [phase, setPhase] = React.useState('idle');
  const [dDyn,  setDDyn]  = React.useState({});
  const [yDyn,  setYDyn]  = React.useState({});
  const [aDyn,  setADyn]  = React.useState({ opacity: 0 });

  /* "Ne?" ile aynı stil: skewX + chromatic aberration + opacity titremesi */
  const glitchIn = React.useCallback((setDyn, finalStyle, dur = 420) => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p   = Math.min((ts - start) / dur, 1);
      const env = Math.sin(p * Math.PI);
      const rx  = (Math.random() - 0.5) * 18 * env;
      const sk  = (Math.random() - 0.5) * 6  * env;
      setDyn({
        transform:  `skewX(${sk}deg) translateX(${rx * 0.3}px)`,
        textShadow: `${rx}px 0 0 rgba(255,50,50,0.78), ${-rx}px 0 0 rgba(0,220,255,0.72)`,
        opacity:    0.60 + Math.random() * 0.40,
        color:      finalStyle.color,
      });
      if (p < 1) requestAnimationFrame(step);
      else setDyn(finalStyle);
    };
    requestAnimationFrame(step);
  }, []);

  /* Glitch + eş zamanlı opacity sıfıra inen çıkış */
  const glitchOut = React.useCallback((setDyn, dur = 850, onDone) => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p   = Math.min((ts - start) / dur, 1);
      const env = Math.sin(p * Math.PI * 0.85);
      const rx  = (Math.random() - 0.5) * 18 * env;
      const sk  = (Math.random() - 0.5) * 6  * env;
      setDyn({
        transform:  `skewX(${sk}deg) translateX(${rx * 0.3}px)`,
        textShadow: `${rx}px 0 0 rgba(255,50,50,0.78), ${-rx}px 0 0 rgba(0,220,255,0.72)`,
        opacity:    Math.max(0, (1 - p) * (0.65 + Math.random() * 0.35)),
      });
      if (p < 1) requestAnimationFrame(step);
      else { setDyn({ opacity: 0 }); onDone?.(); }
    };
    requestAnimationFrame(step);
  }, []);

  React.useEffect(() => {
    let dead = false;
    const T = [];

    const cycle = () => {
      if (dead) return;

      // 1. doğru hedefle + glitch → yeşil
      T.push(setTimeout(() => {
        if (dead) return;
        setPhase('dogru');
        T.push(setTimeout(() => {
          if (!dead) glitchIn(setDDyn, { color: '#10b981', opacity: 1 });
        }, 360));
      }, 500));
      T.push(setTimeout(() => { if (!dead) setPhase('dogru-out'); }, 1380));
      T.push(setTimeout(() => { if (!dead) setPhase('mid'); },       1720));

      // 2. yanlış hedefle + glitch → kırmızı
      T.push(setTimeout(() => {
        if (dead) return;
        setPhase('yanlis');
        T.push(setTimeout(() => {
          if (!dead) glitchIn(setYDyn, { color: '#ef4444', opacity: 1 });
        }, 360));
      }, 2250));
      T.push(setTimeout(() => { if (!dead) setPhase('yanlis-out'); }, 3200));
      T.push(setTimeout(() => { if (!dead) setPhase('mid2'); },       3550));

      // 3. "hemen analiz et" hedefle → glitch ile belir
      T.push(setTimeout(() => {
        if (dead) return;
        setPhase('analize');
        T.push(setTimeout(() => {
          if (!dead) glitchIn(setADyn, { opacity: 1, color: 'var(--color-text-primary)' });
        }, 340));
      }, 4050));
      // 4. 5-6 saniye bekle, ardından glitch ile yok ol → SONRA hedef küçülüp gider
      T.push(setTimeout(() => {
        if (!dead) glitchOut(setADyn, 850, () => {
          if (!dead) {
            setPhase('analize-out');
            T.push(setTimeout(() => {
              if (!dead) {
                setPhase('idle');
                setDDyn({}); setYDyn({}); setADyn({ opacity: 0 });
                T.push(setTimeout(cycle, 700));
              }
            }, 380));
          }
        });
      }, 11200));
    };

    cycle();
    return () => { dead = true; T.forEach(clearTimeout); };
  }, [glitchIn, glitchOut]);

  const W    = { fontFamily: "'Public Sans', system-ui, sans-serif", fontStyle: 'italic', fontWeight: 800 };
  const showD = phase === 'dogru'   || phase === 'dogru-out';
  const showY = phase === 'yanlis'  || phase === 'yanlis-out';
  const showA = phase === 'analize' || phase === 'analize-out';

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: '150ms', marginTop: '16px' }}>
      <p style={{ fontFamily: "'Public Sans', system-ui, sans-serif", color: 'var(--color-text-primary)', fontSize: '1.1rem', lineHeight: 1.8 }}>
        {'ne '}
        <span className="relative inline-block">
          {showD && <WordHUD color="rgba(16,185,129,0.82)" exiting={phase === 'dogru-out'} />}
          <span style={{ ...W, ...dDyn }}>{' doğru '}</span>
        </span>
        {' ne '}
        <span className="relative inline-block">
          {showY && <WordHUD color="rgba(239,68,68,0.82)" exiting={phase === 'yanlis-out'} />}
          <span style={{ ...W, ...yDyn }}>{' yanlış '}</span>
        </span>
        {' bilmiyor musun?'}
      </p>
      <p style={{ fontFamily: "'Public Sans', system-ui, sans-serif", fontSize: '1.1rem' }}>
        <span className="relative inline-block">
          {showA && <WordHUD color="rgba(16,185,129,0.82)" exiting={phase === 'analize-out'} />}
          <span style={{ fontWeight: 700, ...aDyn }}>hemen analiz et.</span>
        </span>
      </p>
    </div>
  );
}

/* ── HUD Target Frame ── */
const NC = 'rgba(16,185,129,0.88)';
const HUD_VARIANTS = [
  { anim: 'hudVar1 2.4s linear both', origin: 'top center',    dur: 2400 },
  { anim: 'hudVar2 2.4s linear both', origin: 'center center', dur: 2400 },
  { anim: 'hudVar3 2.4s linear both', origin: 'center center', dur: 2400 },
  { anim: 'hudVar4 2.4s linear both', origin: 'center center', dur: 2400 },
  { anim: 'hudVar5 2.8s linear both', origin: 'center center', dur: 2800 },
];

function HeroFrame() {
  const [fs, setFs] = React.useState({ key: 0, idx: -1 });
  const timerRef   = React.useRef(null);

  React.useEffect(() => {
    const schedule = (delay) => {
      timerRef.current = setTimeout(() => {
        const idx = Math.floor(Math.random() * HUD_VARIANTS.length);
        setFs(s => ({ key: s.key + 1, idx }));
        schedule(HUD_VARIANTS[idx].dur + 900 + Math.random() * 1400);
      }, delay);
    };
    schedule(1600);
    return () => clearTimeout(timerRef.current);
  }, []);

  const entrance = fs.idx === -1;
  const v        = entrance ? null : HUD_VARIANTS[fs.idx];

  return (
    <div
      key={fs.key}
      className="absolute inset-0 pointer-events-none"
      style={{
        background:      'rgba(16,185,129,0.07)',
        animation:       entrance ? 'heroFrameEnter 1.1s cubic-bezier(0.22,1,0.36,1) both' : v.anim,
        transformOrigin: entrance ? 'center center' : v.origin,
      }}
    >
      <div className="absolute top-0 left-0  h-[3px] w-[22px]" style={{ background: NC }} />
      <div className="absolute top-0 left-0  w-[3px] h-[22px]" style={{ background: NC }} />
      <div className="absolute top-0 right-0 h-[3px] w-[22px]" style={{ background: NC }} />
      <div className="absolute top-0 right-0 w-[3px] h-[22px]" style={{ background: NC }} />
      <div className="absolute bottom-0 left-0  h-[3px] w-[22px]" style={{ background: NC }} />
      <div className="absolute bottom-0 left-0  w-[3px] h-[22px]" style={{ background: NC }} />
      <div className="absolute bottom-0 right-0 h-[3px] w-[22px]" style={{ background: NC }} />
      <div className="absolute bottom-0 right-0 w-[3px] h-[22px]" style={{ background: NC }} />
    </div>
  );
}

/* ── Glitch Hero ── */
function GlitchNe() {
  const [dynStyle, setDynStyle] = React.useState({});
  const [scanning, setScanning] = React.useState(false);
  const raf = React.useRef(null);
  const tid = React.useRef(null);

  React.useEffect(() => {
    function doGlitch() {
      const dur = 350 + Math.random() * 250;
      const t0  = performance.now();
      setScanning(true);

      function frame(ts) {
        const p   = Math.min((ts - t0) / dur, 1);
        const env = Math.sin(p * Math.PI);          // 0→peak→0
        const rx  = (Math.random() - 0.5) * 16 * env;
        const sk  = (Math.random() - 0.5) * 5  * env;
        setDynStyle({
          transform:  `skewX(${sk}deg) translateX(${rx * 0.35}px)`,
          textShadow: `${rx}px 0 0 rgba(255,50,50,.8), ${-rx}px 0 0 rgba(0,220,255,.8)`,
          opacity:    0.65 + Math.random() * 0.35,
        });
        if (p < 1) {
          raf.current = requestAnimationFrame(frame);
        } else {
          setScanning(false);
          setDynStyle({});
          tid.current = setTimeout(doGlitch, 4000 + Math.random() * 5000);
        }
      }
      raf.current = requestAnimationFrame(frame);
    }

    tid.current = setTimeout(doGlitch, 2000 + Math.random() * 2000);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(tid.current); };
  }, []);

  return (
    <span className="font-pacifico inline-block relative" style={{ color: 'var(--color-text-primary)', ...dynStyle }}>
      Ne?
      {scanning && (
        <span className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 3px)',
        }} />
      )}
    </span>
  );
}

const RATE_LIMIT_KEY = 'rl_exceeded';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [rateLimitExceeded, setRateLimitExceeded] = useState(
    () => sessionStorage.getItem(RATE_LIMIT_KEY) === '1'
  );
  const [remaining] = useState(null);
  const { threads: trendThreads, loading: trendLoading } = useForumTrends();

  useEffect(() => {
      const handler = () => {
          sessionStorage.setItem(RATE_LIMIT_KEY, '1');
          setRateLimitExceeded(true);
      };
      window.addEventListener('rate-limit-exceeded', handler);
      return () => window.removeEventListener('rate-limit-exceeded', handler);
  }, []);

  const { analyze, analyzeUrl, loading, result, error, isPolling, analysisStage } = useAnalysis();
  const {
    loading: imgLoading,
    isPolling: imgPolling,
    result: imgResult,
    exifFlags,
    error: imgError,
    submitImage,
  } = useImageAnalysis();
  const [imagePreview, setImagePreview] = useState(null);
  const showAnalysisSkeleton = loading || isPolling;
  const resultRef = useRef(null);

  const handleAnalyzeImage = (file) => {
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    submitImage(file);
  };

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

      {/* Rate Limit Banner — analiz sürerken gösterme */}
      {rateLimitExceeded && !loading && !isPolling && (
          <div className="mb-4 px-4 py-3 flex items-center justify-between gap-4 animate-fade-up"
               style={{
                   background: 'var(--color-terminal-surface)',
                   border: '1px solid var(--color-terminal-border-raw)',
                   borderLeft: '3px solid var(--color-brand-primary)',
               }}>
              <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-brand-primary)' }}>⚡</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-primary)', opacity: 0.75 }}>
                      {isAuthenticated
                          ? 'Günlük analiz limitinize ulaştınız. Gece yarısı sıfırlanır.'
                          : 'Ücretsiz analiz hakkınızı kullandınız.'}
                  </span>
              </div>
              {!isAuthenticated && (
                  <div className="flex items-center gap-2 shrink-0">
                      <Link to="/login"
                          className="text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                          Giriş Yap
                      </Link>
                      <Link to="/register"
                          className="text-xs font-manrope font-black uppercase tracking-wide px-3 py-1.5 transition-opacity hover:opacity-90"
                          style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}>
                          Kayıt Ol →
                      </Link>
                  </div>
              )}
          </div>
      )}

      {/* ── Hero ── */}
      <div className="text-center mb-4 md:mb-6 mt-1 md:mt-2 flex flex-col items-center gap-3 md:gap-4">

        {/* Ana başlık */}
        <h1 style={{ animationDelay: '75ms' }} className="animate-fade-up leading-tight">
          <div className="relative inline-block" style={{ padding: '28px 52px' }}>
            <HeroFrame />
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-manrope font-extrabold text-tx-primary tracking-tighter leading-tight block">
              <GlitchNe />
            </span>
          </div>
        </h1>

        {/* Glitch subtitle */}
        <HeroSubtitle />
      </div>

      {/* ── 3 Kolon Layout ── */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6
                      w-full max-w-[1400px] mx-auto pb-8 items-start">

        {/* Sol: Günlük Trendler + Deprem + Namaz */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-3 animate-fade-left delay-200">
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
                onAnalyzeImage={handleAnalyzeImage}
                loading={loading || imgLoading}
                isPolling={isPolling || imgPolling}
                analysisStage={analysisStage}
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
                key={`result-${result.task_id ?? result.prediction ?? 'analysis'}`}
                result={result}
              />
            ) : null}
          </div>

          {(imgResult || imgPolling || exifFlags) && (
            <ImageResultCard
              result={imgResult}
              exifFlags={exifFlags}
              previewUrl={imagePreview}
              isPolling={imgPolling}
            />
          )}
          {imgError && (
            <p className="text-sm text-es-error text-center py-2">{imgError}</p>
          )}
        </div>

        {/* Sağ: En Çok Analiz Edilen */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-3 animate-fade-right delay-300">
          <HotAnalysesCard />
        </div>
      </div>

      {/* ── Benzer Haberler — sonuç varsa göster ── */}
      {result && (
          <SimilarNewsSection taskId={result.task_id ?? result.content_id} />
      )}

      {/* ── Platform İstatistikleri + Sahtelik Haritası ── */}
      <PlatformStatsSection />

      {/* ── En Popüler Haberler ── */}
      <PopularNewsSection />

      {/* ── Forum Trendleri ── */}
      <ForumTrendBand threads={trendThreads} loading={trendLoading} />

    </div>
  );
};

export default Home;
