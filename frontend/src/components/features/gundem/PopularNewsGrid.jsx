import React, { useState, useRef, useEffect } from 'react';
import { Layers } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';
import NewsSummaryModal from '../../../features/analysis/NewsSummaryModal';
import AnalysisModal from '../../../features/analysis/AnalysisModal';
import { trackInteraction } from '../../../services/interaction.service';

const BRAND  = 'var(--color-brand-primary)';
const BORDER = 'var(--color-terminal-border-raw)';
const borderStyle = { borderColor: BORDER };
const cardStyle   = { background: 'var(--color-terminal-surface)', borderColor: BORDER };

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
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
    return `${Math.floor(diff / 86400)} gün`;
}

function AnalyzeButton({ article }) {
    const [phase,        setPhase]        = useState('idle');
    const [result,       setResult]       = useState(null);
    const [showSummary,  setShowSummary]  = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const pollerRef = useRef(null);
    const lsKey     = article.source_url ? `g_analysis_${article.source_url}` : null;

    useEffect(() => {
        if (!lsKey) return;
        try {
            const raw = localStorage.getItem(lsKey);
            if (!raw) return;
            const { result: r, ts } = JSON.parse(raw);
            if (Date.now() - ts < 86_400_000) { setResult(r); setPhase('done'); }
            else localStorage.removeItem(lsKey);
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lsKey]);

    useEffect(() => {
        if (phase === 'done' && result && lsKey) {
            try { localStorage.setItem(lsKey, JSON.stringify({ result, ts: Date.now() })); } catch { /* ignore */ }
        }
    }, [phase, result, lsKey]);

    useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase === 'done') { setShowSummary(true); return; }
        if (phase !== 'idle' || !article.source_url) return;
        setPhase('loading');
        trackInteraction({ content_id: article.id, interaction_type: 'click', category: article.category, nlp_score_at_time: article.nlp_score });
        try {
            const data = await AnalysisService.analyzeUrl(article.source_url);
            if (!data.task_id) { setPhase('error'); return; }
            const t0 = Date.now();
            pollerRef.current = setInterval(async () => {
                try {
                    const s       = await AnalysisService.checkStatus(data.task_id);
                    const done    = s.status === 'SUCCESS' && s.result?.ai_comment != null;
                    const failed  = ['FAILED', 'FAILURE'].includes(s.status);
                    const timeout = Date.now() - t0 > 90_000;
                    if (done || (timeout && s.result)) {
                        clearInterval(pollerRef.current);
                        setResult(s.result);
                        setPhase('done');
                        setShowSummary(true);
                    } else if (failed || timeout) {
                        clearInterval(pollerRef.current);
                        setPhase('error');
                    }
                } catch { clearInterval(pollerRef.current); setPhase('error'); }
            }, 2000);
        } catch { setPhase('error'); }
    };

    if (phase === 'loading') return (
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: BRAND }}>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            taranıyor
        </span>
    );

    if (phase === 'done' && result) return (
        <>
            <button onClick={handleClick}
                    className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border transition-all hover:brightness-110"
                    style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
                özeti gör →
            </button>
            {showSummary && (
                <NewsSummaryModal
                    result={result}
                    article={article}
                    onClose={() => setShowSummary(false)}
                    onAnalyze={() => setShowAnalysis(true)}
                />
            )}
            {showAnalysis && (
                <AnalysisModal
                    result={result}
                    onClose={() => setShowAnalysis(false)}
                />
            )}
        </>
    );

    if (phase === 'error') return (
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-es-error)', opacity: 0.7 }}>hata</span>
    );

    return (
        <button onClick={handleClick} disabled={!article.source_url}
                className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border transition-all hover:brightness-110 disabled:opacity-30"
                style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}>
            haberi özetle →
        </button>
    );
}

function FeaturedCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    return (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="animate-fade-up col-span-1 row-span-2 group relative flex flex-col overflow-hidden border
                      transition-all duration-300 hover:shadow-[0_0_20px_rgba(63,255,139,0.18)]"
           style={borderStyle}
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
                <img src={article.image_url} alt={article.title}
                     className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                     onError={() => setImgErr(true)} />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                     style={{ background: 'var(--color-terminal-surface)' }}>
                    <Layers className="w-10 h-10 text-brutal-border/30" />
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent" />

            {article.category && (
                <span className="absolute top-3 left-3 z-10 font-mono text-[10px] font-black uppercase tracking-widest px-2 py-1 text-white"
                      style={{ background: BRAND }}>
                    {article.category}
                </span>
            )}
            {(article.source_count || 0) > 1 && (
                <span className="absolute top-3 right-3 z-10 font-mono text-[10px] font-bold px-2 py-1"
                      style={{ background: 'var(--color-brand-accent)', color: BRAND, border: `1px solid ${BORDER}` }}>
                    {article.source_count} kaynak
                </span>
            )}

            <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
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
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    return (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="h-full flex flex-col overflow-hidden border group
                      transition-all duration-300 hover:shadow-[0_0_14px_rgba(63,255,139,0.15)]"
           style={cardStyle}
           onClick={() => trackInteraction({
               content_id: article.id, interaction_type: 'click', category: article.category,
               source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
               nlp_score_at_time: article.nlp_score,
           })}>

            <div className="relative h-28 overflow-hidden shrink-0"
                 style={{ background: 'var(--color-bg-surface-solid)' }}>
                {hasImg ? (
                    <img src={article.image_url} alt={article.title}
                         className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                         onError={() => setImgErr(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"
                         style={{ background: 'var(--color-bg-surface-solid)' }}>
                        <Layers className="w-6 h-6" style={{ color: BORDER, opacity: 0.3 }} />
                    </div>
                )}
                {article.category && (
                    <span className="absolute bottom-2 left-2 font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 text-white"
                          style={{ background: BRAND }}>
                        {article.category}
                    </span>
                )}
            </div>

            <div className="p-3.5 flex flex-col gap-2 flex-1">
                <h3 className="text-sm font-bold leading-snug line-clamp-2 transition-colors group-hover:text-brand"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {article.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t" style={borderStyle}>
                    {article.source_name && (
                        <span className="font-mono text-[10px] font-semibold truncate max-w-[110px]"
                              style={{ color: 'var(--color-text-secondary)' }}>
                            {article.source_name}
                        </span>
                    )}
                    <span style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>·</span>
                    <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                        {relTime(article.pub_date)}
                    </span>
                    <NlpLabel score={article.nlp_score} />
                    <div className="ml-auto shrink-0">
                        <AnalyzeButton article={article} />
                    </div>
                </div>
            </div>
        </a>
    );
}

function GridSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-4 auto-rows-[220px] animate-pulse">
            <div className="col-span-1 row-span-2 overflow-hidden border" style={{ ...borderStyle, background: 'var(--color-skeleton)' }} />
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="overflow-hidden border" style={{ ...borderStyle, background: 'var(--color-terminal-surface)' }}>
                    <div className="h-28" style={{ background: 'var(--color-skeleton)' }} />
                    <div className="p-3 space-y-2">
                        <div className="h-3 w-2/3" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="h-3 w-full" style={{ background: 'var(--color-skeleton)' }} />
                    </div>
                </div>
            ))}
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
            // makale bulunamadı
        </p>
    );

    const rest = articles || [];

    return (
        <div>
            {/* Ana grid: sol büyük (row-span-2) + sağda 2 kart */}
            <div className="grid grid-cols-2 gap-4 auto-rows-[220px] mb-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        // haberler yükleniyor
                    </span>
                </div>
            )}
        </div>
    );
}
