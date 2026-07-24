import React, { useState, useRef, useEffect } from 'react';
import { Layers } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';
import NewsService from '../../../services/news.service';
import NewsSummaryModal from '../../../features/analysis/NewsSummaryModal';
import AnalysisModal from '../../../features/analysis/AnalysisModal';
import { trackInteraction } from '../../../services/interaction.service';
import { getProxiedImageUrl } from '../../../utils/imageProxy';

const BRAND       = 'var(--color-brand-primary)';
const BORDER      = 'var(--color-terminal-border-raw)';
const borderStyle = { borderColor: BORDER };
const cardStyle   = { background: 'transparent', borderColor: BORDER };
const CARD_BORDER = 'rgba(255,255,255,0.07)';
const CARD_BG     = 'rgba(255,255,255,0.025)';

function nlpColor(score) {
    if (score == null) return 'var(--color-text-muted)';
    if (score < 0.20)  return '#16a34a';
    if (score < 0.40)  return '#65a30d';
    if (score < 0.60)  return '#d97706';
    if (score < 0.80)  return '#ea580c';
    return '#dc2626';
}

function NlpLabel({ score }) {
    if (score == null) return null;
    const pct = Math.round((1 - score) * 100);
    return (
        <span className="font-mono text-[10px] font-bold" style={{ color: nlpColor(score) }}>
            %{pct} güvenilir
        </span>
    );
}

function relTime(pubDate) {
    if (!pubDate) return '';
    const diff = Math.floor((Date.now() - new Date(pubDate)) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    const days = Math.floor(diff / 86400);
    return days === 1 ? 'Dün' : `${days} gün önce`;
}

function AnalyzeButton({ article }) {
    const [phase,        setPhase]        = useState('idle');
    const [summary,      setSummary]      = useState(null);
    const [result,       setResult]       = useState(null);
    const [showSummary,  setShowSummary]  = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const pollerRef = useRef(null);

    const sumKey  = article.id ? `ns_sum_${article.id}`  : null;
    const anaKey  = article.source_url ? `g_analysis_${article.source_url}` : null;

    useEffect(() => {
        if (sumKey) {
            try {
                const raw = localStorage.getItem(sumKey);
                if (raw) {
                    const { summary: s, ts } = JSON.parse(raw);
                    if (Date.now() - ts < 3_600_000) { setSummary(s); setPhase('summarized'); }
                    else localStorage.removeItem(sumKey);
                }
            } catch { /* ignore */ }
        }
        if (anaKey) {
            try {
                const raw = localStorage.getItem(anaKey);
                if (raw) {
                    const { result: r, ts } = JSON.parse(raw);
                    if (Date.now() - ts < 86_400_000) { setResult(r); }
                }
            } catch { /* ignore */ }
        }
    }, []);

    useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

    const handleSummarize = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (phase === 'summarized') { setShowSummary(true); return; }
        if (phase !== 'idle' || !article.id) return;
        setPhase('summarizing');
        try {
            const data = await NewsService.summarize(article.id);
            setSummary(data.summary);
            setPhase('summarized');
            setShowSummary(true);
            if (sumKey) {
                try { localStorage.setItem(sumKey, JSON.stringify({ summary: data.summary, ts: Date.now() })); } catch { /* ignore */ }
            }
        } catch {
            setPhase('error');
        }
    };

    const handleAnalyze = async () => {
        if (!article.source_url || phase === 'analyzing' || phase === 'analyzed') return;
        setPhase('analyzing');
        try {
            const data = await AnalysisService.analyzeUrl(article.source_url);
            if (!data.task_id) { setPhase('summarized'); return; }
            const t0 = Date.now();
            pollerRef.current = setInterval(async () => {
                try {
                    const s      = await AnalysisService.checkStatus(data.task_id);
                    const done   = s.status === 'SUCCESS' && s.result?.ai_comment != null;
                    const failed = ['FAILED', 'FAILURE'].includes(s.status);
                    const timeout = Date.now() - t0 > 90_000;
                    if (done || (timeout && s.result)) {
                        clearInterval(pollerRef.current);
                        setResult(s.result);
                        setPhase('analyzed');
                        if (anaKey) {
                            try { localStorage.setItem(anaKey, JSON.stringify({ result: s.result, ts: Date.now() })); } catch { /* ignore */ }
                        }
                    } else if (failed || timeout) {
                        clearInterval(pollerRef.current);
                        setPhase('summarized');
                    }
                } catch { clearInterval(pollerRef.current); setPhase('summarized'); }
            }, 2000);
        } catch { setPhase('summarized'); }
    };

    if (phase === 'summarizing') return (
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: BRAND }}>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            özetleniyor
        </span>
    );

    if (phase === 'error') return (
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-es-error)', opacity: 0.7 }}>hata</span>
    );

    if (phase === 'summarized' || phase === 'analyzing' || phase === 'analyzed') return (
        <>
            <button
                onClick={handleSummarize}
                className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border transition-all hover:brightness-110"
                style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
            >
                özeti gör →
            </button>
            {showSummary && (
                <NewsSummaryModal
                    summary={summary}
                    article={article}
                    analysisPhase={phase}
                    analysisResult={result}
                    onClose={() => setShowSummary(false)}
                    onAnalyze={handleAnalyze}
                    onViewAnalysis={() => { setShowSummary(false); setShowAnalysis(true); }}
                />
            )}
            {showAnalysis && result && (
                <AnalysisModal
                    result={result}
                    onClose={() => { setShowAnalysis(false); setShowSummary(true); }}
                />
            )}
        </>
    );

    return (
        <button
            onClick={handleSummarize}
            disabled={!article.id}
            className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border transition-all hover:brightness-110 disabled:opacity-30"
            style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
        >
            haberi özetle →
        </button>
    );
}

function FeaturedCard({ article }) {
    const [imgErr,    setImgErr]    = useState(false);
    const [useProxy,  setUseProxy]  = useState(true);
    const hasImg = article.image_url && !imgErr;
    const imgSrc = hasImg
        ? (useProxy ? getProxiedImageUrl(article.image_url, 800) : article.image_url)
        : undefined;

    return (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="animate-fade-up col-span-1 row-span-2 group relative flex flex-col overflow-hidden
                      transition-all duration-300 hover:shadow-[0_0_20px_rgba(63,255,139,0.18)]"
           style={{ border: `1px solid ${CARD_BORDER}` }}
           onClick={() => trackInteraction({
               content_id: article.id, interaction_type: 'click', category: article.category,
               source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
               nlp_score_at_time: article.nlp_score,
           })}>

            {/* Köşe çentikler */}
            <div className="absolute top-0 left-0 w-5 h-[2px] z-20" style={{ background: BRAND }} />
            <div className="absolute top-0 left-0 h-5 w-[2px] z-20" style={{ background: BRAND }} />
            <div className="absolute bottom-0 right-0 w-5 h-[2px] z-20" style={{ background: BRAND }} />
            <div className="absolute bottom-0 right-0 h-5 w-[2px] z-20" style={{ background: BRAND }} />

            {hasImg ? (
                <img src={imgSrc} alt={article.title}
                     fetchPriority="high"
                     loading="eager"
                     className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                     onError={() => useProxy ? setUseProxy(false) : setImgErr(true)} />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                     style={{ background: 'transparent' }}>
                    <Layers className="w-10 h-10 text-brutal-border/30" />
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />

            {article.category && (
                <span className="absolute top-3 left-3 z-10 font-mono text-[10px] font-black uppercase tracking-widest px-2 py-1"
                      style={{ background: BRAND, color: 'var(--color-brand-badge-text)' }}>
                    {article.category}
                </span>
            )}
            {(article.source_count || 0) > 1 && (
                <span className="absolute top-3 right-3 z-10 font-mono text-[10px] font-bold px-2 py-1"
                      style={{ background: 'var(--color-brand-accent)', color: BRAND, border: `1px solid ${BORDER}` }}>
                    {article.source_count} kaynak
                </span>
            )}

            {/* Flex spacer + içerik: absolute yerine flex flow ile daha yukarıda konumlanır */}
            <div className="flex-1" />
            <div className="relative z-10 px-5 pb-5 pt-10">
                <h2 className="text-white font-extrabold text-xl md:text-2xl leading-snug line-clamp-3 mb-3 drop-shadow
                               group-hover:text-brand transition-colors">
                    {article.title}
                </h2>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-white/65">
                        {article.source_name && <span className="font-semibold">{article.source_name}</span>}
                        <span>·</span>
                        <span>{relTime(article.pub_date)}</span>
                        <NlpLabel score={article.nlp_score} />
                    </div>
                    <AnalyzeButton article={article} />
                </div>
            </div>
        </a>
    );
}

function SmallCard({ article }) {
    const [imgErr,   setImgErr]   = useState(false);
    const [useProxy, setUseProxy] = useState(true);
    const hasImg = article.image_url && !imgErr;
    const imgSrc = hasImg
        ? (useProxy ? getProxiedImageUrl(article.image_url, 400) : article.image_url)
        : undefined;

    return (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="group relative h-full overflow-hidden block"
           style={{ border: `1px solid ${CARD_BORDER}` }}
           onClick={() => trackInteraction({
               content_id: article.id, interaction_type: 'click', category: article.category,
               source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
               nlp_score_at_time: article.nlp_score,
           })}>

            {/* Tam kaplayan görsel veya koyu arka plan */}
            {hasImg ? (
                <img src={imgSrc} alt={article.title}
                     className="absolute inset-0 w-full h-full object-cover transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                     style={{ opacity: 0.78 }}
                     onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                     onMouseLeave={e => { e.currentTarget.style.opacity = '0.78'; e.currentTarget.style.transform = 'scale(1)'; }}
                     onError={() => useProxy ? setUseProxy(false) : setImgErr(true)} />
            ) : (
                <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg,#0f1e22,#0b1518)' }} />
            )}

            {/* Temel gradyan */}
            <div className="absolute inset-0"
                 style={{ background: 'linear-gradient(to top,rgba(7,11,14,0.92) 0%,rgba(7,11,14,0.55) 42%,rgba(7,11,14,0.08) 75%,transparent 100%)' }} />
            {/* Hover gradyan — opacity ile koyulaşır */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: 'linear-gradient(to top,rgba(7,11,14,0.98) 0%,rgba(7,11,14,0.78) 52%,rgba(7,11,14,0.22) 82%,transparent 100%)' }} />

            {/* İçerik — hover'da yukarı kayar */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10
                            translate-y-0 group-hover:-translate-y-[7px]
                            transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">

                {/* Kategori rozeti */}
                {article.category && (
                    <span className="inline-block font-mono text-[9px] font-black uppercase tracking-widest
                                     px-2 py-0.5 rounded mb-2"
                          style={{ color: BRAND, border: '1px solid rgba(63,255,139,0.35)', background: 'rgba(63,255,139,0.08)' }}>
                        {article.category}
                    </span>
                )}

                {/* Başlık */}
                <h3 className="text-[13px] font-bold leading-snug line-clamp-2 mb-2.5"
                    style={{ color: '#fff' }}>
                    {article.title}
                </h3>

                {/* Meta: güven + kaynak + zaman + buton */}
                <div className="flex items-center gap-2 flex-wrap">
                    <NlpLabel score={article.nlp_score} />
                    {article.source_name && (
                        <span className="font-mono text-[10px] font-semibold"
                              style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {article.source_name}
                        </span>
                    )}
                    {article.pub_date && (
                        <span className="font-mono text-[10px]"
                              style={{ color: 'rgba(255,255,255,0.55)' }}>
                            {relTime(article.pub_date)}
                        </span>
                    )}
                    <div className="ml-auto shrink-0">
                        <AnalyzeButton article={article} />
                    </div>
                </div>
            </div>

            {/* Alt sağa kayan çizgi */}
            <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-[width] duration-300 ease-out"
                 style={{ background: BRAND }} />
        </a>
    );
}

function SkeletonCard({ className = '', style = {} }) {
    return (
        <div
            className={`animate-shimmer overflow-hidden ${className}`}
            style={{ border: `1px solid ${CARD_BORDER}`, ...style }}
        >
            {/* Alt içerik alanı simülasyonu — gerçek kartla aynı oran */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 space-y-2">
                <div className="h-2 w-14 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3.5 w-4/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <div className="h-3.5 w-3/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
        </div>
    );
}

function GridSkeleton() {
    return (
        <div>
            {/* Ana grid — featured + 2 küçük */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-[220px] sm:auto-rows-[260px] mb-4">
                <SkeletonCard className="col-span-1 row-span-2 relative" />
                {[0, 1].map(i => (
                    <SkeletonCard key={i} className="relative" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
            {/* Alt grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[220px] sm:auto-rows-[260px]">
                {[0, 1, 2].map(i => (
                    <SkeletonCard key={i} className="relative" style={{ animationDelay: `${(i + 2) * 0.12}s` }} />
                ))}
            </div>
        </div>
    );
}

function LoadMoreTrigger({ onVisible }) {
    const ref   = useRef(null);
    const ready = useRef(false);
    useEffect(() => { const t = setTimeout(() => { ready.current = true; }, 600); return () => clearTimeout(t); }, []);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting && ready.current) onVisible(); },
            { rootMargin: '80px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [onVisible]);
    return <div ref={ref} />;
}

export default function PopularNewsGrid({ featured, articles, loading, loadingMore, hasMore, loadMore }) {
    if (loading) return <GridSkeleton />;
    if (!featured && (!articles || articles.length === 0)) return (
        <p className="font-mono text-sm text-center py-20" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
        </p>
    );

    const rest = articles || [];

    return (
        <div className="animate-fade-in">
            {/* Ana grid: mobilde tek kolon 220px, sm+ iki kolon 260px */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-[220px] sm:auto-rows-[260px] mb-4">
                {featured && <FeaturedCard article={featured} />}
                {rest.slice(0, 2).map((a, idx) => (
                    <div key={a.id}
                         className="animate-fade-up h-full"
                         style={{ animationDelay: `${(idx + 1) * 80}ms` }}>
                        <SmallCard article={a} />
                    </div>
                ))}
            </div>

            {/* Kalan kartlar */}
            {rest.length > 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[220px] sm:auto-rows-[260px]">
                    {rest.slice(2).map((a, idx) => (
                        <div key={a.id}
                             className="animate-fade-up"
                             style={{ animationDelay: `${idx * 60}ms` }}>
                            <SmallCard article={a} />
                        </div>
                    ))}
                </div>
            )}

            {hasMore && !loadingMore && <LoadMoreTrigger onVisible={loadMore} />}

            {loadingMore && (
                <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-6 h-6 border-2 border-t-transparent animate-spin"
                         style={{ borderColor: BRAND, borderTopColor: 'transparent' }} />
                    <span className="font-mono text-[10px] uppercase tracking-widest"
                          style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    </span>
                </div>
            )}
        </div>
    );
}
