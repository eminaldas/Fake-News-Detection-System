import React, { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import AnalysisService from '../../services/analysis.service';
import { trackInteraction } from '../../services/interaction.service';
import { getProxiedImageUrl } from '../../utils/imageProxy';

const BRAND      = 'var(--color-brand-primary)';
const CARD_BORDER = 'rgba(255,255,255,0.07)';

function relTime(pubDate) {
    if (!pubDate) return '';
    const diff = Math.floor((Date.now() - new Date(pubDate)) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    const days = Math.floor(diff / 86400);
    return days === 1 ? 'Dün' : `${days} gün önce`;
}

function NewsCard({ item }) {
    const [imgErr,   setImgErr]   = useState(false);
    const [useProxy, setUseProxy] = useState(true);
    const hasImg = item.image_url && !imgErr;
    const imgSrc = hasImg
        ? (useProxy ? getProxiedImageUrl(item.image_url, 400) : item.image_url)
        : undefined;

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative h-full overflow-hidden block"
            style={{ border: `1px solid ${CARD_BORDER}` }}
            onClick={() => trackInteraction({
                content_id: item.id,
                interaction_type: 'click',
                category: item.category,
                source_domain: item.source_name,
            })}
        >
            {hasImg ? (
                <img
                    src={imgSrc}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ opacity: 0.78 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.78'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onError={() => useProxy ? setUseProxy(false) : setImgErr(true)}
                />
            ) : (
                <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg,#0f1e22,#0b1518)' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Layers className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    </div>
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0"
                 style={{ background: 'linear-gradient(to top,rgba(7,11,14,0.92) 0%,rgba(7,11,14,0.55) 42%,rgba(7,11,14,0.08) 75%,transparent 100%)' }} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: 'linear-gradient(to top,rgba(7,11,14,0.98) 0%,rgba(7,11,14,0.78) 52%,rgba(7,11,14,0.22) 82%,transparent 100%)' }} />

            {/* İçerik */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8
                            translate-y-0 group-hover:-translate-y-[6px]
                            transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
                {item.category && (
                    <span className="inline-block font-mono text-[9px] font-black uppercase tracking-widest px-2 py-0.5 mb-1.5"
                          style={{ color: BRAND, border: '1px solid rgba(63,255,139,0.35)', background: 'rgba(63,255,139,0.08)' }}>
                        {item.category}
                    </span>
                )}
                <h3 className="text-[12px] font-bold leading-snug line-clamp-2 mb-1.5" style={{ color: '#fff' }}>
                    {item.title}
                </h3>
                <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {item.source_name && (
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item.source_name}</span>
                    )}
                    {item.pub_date && <span>{relTime(item.pub_date)}</span>}
                </div>
            </div>

            {/* Alt çizgi hover efekti */}
            <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-[width] duration-300 ease-out"
                 style={{ background: BRAND }} />
        </a>
    );
}

function SkeletonCard() {
    return (
        <div className="relative animate-pulse overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg,#0f1e22,#0b1518)' }} />
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 space-y-2">
                <div className="h-2 w-12 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 w-4/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <div className="h-3 w-3/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
        </div>
    );
}

export default function SimilarNewsSection({ taskId }) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(!!taskId);

    useEffect(() => {
        if (!taskId) return;
        setLoading(true);
        AnalysisService.getSimilarNews(taskId)
            .then(data => setItems(data.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [taskId]);

    if (!loading && items.length === 0) return null;

    const count   = loading ? 4 : items.length;
    const colsCls = count <= 2
        ? 'grid-cols-2'
        : count === 3
            ? 'grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-4';

    return (
        <section className="w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-6 mt-6">
            <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4" style={{ color: BRAND }} />
                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--color-text-primary)' }}>
                    Benzer Haberler
                </h2>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-widest mb-4"
               style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                // Semantik Benzerlik / Vektör Arama
            </p>

            <div className={`grid ${colsCls} gap-3 auto-rows-[200px]`}>
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : items.map(item => <NewsCard key={item.id} item={item} />)
                }
            </div>
        </section>
    );
}
