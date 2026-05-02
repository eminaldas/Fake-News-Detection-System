import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';
import AnalysisResultCard from '../../../features/analysis/AnalysisResultCard';
import { trackInteraction } from '../../../services/interaction.service';

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
        <span className="text-xs font-bold" style={{ color: nlpColor(score) }}>
            {pct}% güvenilir
        </span>
    );
}

function relTime(pubDate) {
    if (!pubDate) return '';
    const diff = Math.floor((Date.now() - new Date(pubDate)) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

function AnalyzeButton({ article }) {
    const [phase,  setPhase]  = useState('idle');
    const [result, setResult] = useState(null);
    const [modal,  setModal]  = useState(false);
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
        if (phase === 'done') { setModal(true); return; }
        if (phase !== 'idle' || !article.source_url) return;
        setPhase('loading');
        trackInteraction({
            content_id: article.id, interaction_type: 'click',
            category: article.category, nlp_score_at_time: article.nlp_score,
        });
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
                        setResult(s.result); setPhase('done');
                    } else if (failed || timeout) {
                        clearInterval(pollerRef.current); setPhase('error');
                    }
                } catch { clearInterval(pollerRef.current); setPhase('error'); }
            }, 2000);
        } catch { setPhase('error'); }
    };

    if (phase === 'loading') return (
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Analiz ediliyor...
        </span>
    );

    if (phase === 'done' && result) return (
        <>
            <button onClick={handleClick}
                    className="text-[10px] font-bold transition-opacity hover:opacity-80"
                    style={{ color: 'var(--color-brand-primary)' }}>
                Sonucu Gör →
            </button>
            {modal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                     style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
                     onClick={() => setModal(false)}>
                    <div className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl relative"
                         onClick={e => e.stopPropagation()}>
                        <button onClick={() => setModal(false)}
                                className="absolute top-4 right-4 z-10 text-white/40 hover:text-white transition-colors"
                                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '4px' }}>
                            <X size={16} />
                        </button>
                        <AnalysisResultCard result={result} />
                    </div>
                </div>,
                document.body
            )}
        </>
    );

    return (
        <button onClick={handleClick} disabled={!article.source_url}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{
                    background: 'var(--color-brand-accent)',
                    color:      'var(--color-brand-primary)',
                    border:     '1px solid var(--color-brand-light)',
                }}>
            Analiz Et →
        </button>
    );
}

function FeaturedCard({ article }) {
    const [imgErr, setImgErr] = useState(false);
    const hasImg = article.image_url && !imgErr;

    return (
        <a href={article.source_url} target="_blank" rel="noopener noreferrer"
           className="col-span-2 row-span-2 group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 hover:border-brand"
           style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface-solid)' }}
           onClick={() => trackInteraction({
               content_id: article.id, interaction_type: 'click',
               category: article.category,
               source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
               nlp_score_at_time: article.nlp_score,
           })}>

            {/* Görsel tam kaplar */}
            {hasImg ? (
                <img src={article.image_url} alt={article.title}
                     className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                     onError={() => setImgErr(true)} />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                     style={{ background: 'var(--color-bg-surface-solid)' }}>
                    <span className="text-muted text-xs">Görsel Yok</span>
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Kategori rozeti */}
            {article.category && (
                <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-white"
                      style={{ background: 'var(--color-brand-primary)' }}>
                    {article.category}
                </span>
            )}

            {/* Kaynak sayısı */}
            {(article.source_count || 0) > 1 && (
                <span className="absolute top-3 right-3 z-10 text-[9px] font-bold px-2 py-1 rounded-full"
                      style={{ background: 'var(--color-brand-accent)', color: 'var(--color-brand-primary)' }}>
                    {article.source_count} kaynak
                </span>
            )}

            {/* Alt bilgi */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                <h2 className="text-white font-extrabold text-xl md:text-2xl leading-snug line-clamp-3 mb-3 drop-shadow">
                    {article.title}
                </h2>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/70 text-xs">
                        {article.source_name && <span className="font-semibold">{article.source_name}</span>}
                        <span>·</span>
                        <span>{relTime(article.pub_date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <NlpLabel score={article.nlp_score} />
                        <AnalyzeButton article={article} />
                    </div>
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
           className="flex flex-col rounded-xl overflow-hidden border group transition-all duration-300 hover:border-brand"
           style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}
           onClick={() => trackInteraction({
               content_id: article.id, interaction_type: 'click',
               category: article.category,
               source_domain: (() => { try { return new URL(article.source_url).hostname; } catch { return null; } })(),
               nlp_score_at_time: article.nlp_score,
           })}>
            <div className="aspect-video overflow-hidden"
                 style={{ background: 'var(--color-bg-surface-solid)' }}>
                {hasImg ? (
                    <img src={article.image_url} alt={article.title}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={() => setImgErr(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"
                         style={{ background: 'var(--color-bg-surface-solid)' }}>
                        {article.category && (
                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                                {article.category}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="text-base font-bold text-tx-primary leading-snug">
                    {article.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-tx-secondary flex-wrap mt-auto pt-1">
                    {article.source_name && (
                        <span className="font-semibold truncate max-w-[120px]">{article.source_name}</span>
                    )}
                    <span>·</span>
                    <span className="shrink-0">{relTime(article.pub_date)}</span>
                    <NlpLabel score={article.nlp_score} />
                </div>
            </div>
        </a>
    );
}

function GridSkeleton() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[220px] animate-pulse">
            {/* Featured skeleton 2×2 */}
            <div className="col-span-2 row-span-2 rounded-xl overflow-hidden border bg-skeleton"
                 style={{ borderColor: 'var(--color-border)' }} />
            {/* Small skeletons */}
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}>
                    <div className="aspect-video bg-skeleton" />
                    <div className="p-3 space-y-2">
                        <div className="h-3 bg-skeleton rounded w-2/3" />
                        <div className="h-3 bg-skeleton rounded w-full" />
                        <div className="h-3 bg-skeleton rounded w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function LoadMoreTrigger({ onVisible }) {
    const ref   = useRef(null);
    const ready = useRef(false);

    useEffect(() => {
        // Sayfa ilk yüklendikten sonra kısa bekleme — az haber varken erken tetiklenmesin
        const timer = setTimeout(() => { ready.current = true; }, 600);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && ready.current) onVisible(); },
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
        <p className="text-muted text-sm text-center py-20">Henüz haber yok.</p>
    );

    const rest = articles || [];

    return (
        <div>
            {/* 4 kolonlu grid — featured 2×2, geri kalan 1×1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[220px] mb-4">
                <FeaturedCard article={featured} />
                {rest.slice(0, 4).map(a => <SmallCard key={a.id} article={a} />)}
            </div>

            {/* Kalan haberler 3 kolonlu normal grid */}
            {rest.length > 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rest.slice(4).map(a => <SmallCard key={a.id} article={a} />)}
                </div>
            )}

            {hasMore && !loadingMore && <LoadMoreTrigger onVisible={loadMore} />}

            {loadingMore && (
                <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                         style={{ borderColor: 'var(--color-brand-primary)', borderTopColor: 'transparent' }} />
                    <span className="text-xs text-muted">Haberler yükleniyor…</span>
                </div>
            )}
        </div>
    );
}
