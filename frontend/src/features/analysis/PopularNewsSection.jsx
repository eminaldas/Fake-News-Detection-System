import React, { useEffect, useState } from 'react';
import { TrendingUp, Eye, ExternalLink } from 'lucide-react';
import NewsService from '../../services/news.service';
import { trackInteraction } from '../../services/interaction.service';

const CATEGORY_COLORS = {
    gündem:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    spor:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ekonomi:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    siyaset:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    dünya:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    teknoloji:'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    default:  'bg-surface-solid text-tx-secondary',
};

function getCategoryColor(category) {
    if (!category) return CATEGORY_COLORS.default;
    return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default;
}

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}dk`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}s`;
    return `${Math.floor(hours / 24)}g`;
}

function handleClick(item) {
    trackInteraction({
        content_id: item.id,
        interaction_type: 'click',
        category: item.category,
        source_domain: item.source_name,
        nlp_score_at_time: item.nlp_score,
    });
}

/* Rank 1 — image overlay hero */
function HeroCard({ item }) {
    const ago = timeAgo(item.pub_date);
    const viewCount = item.community?.view_count ?? 0;

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(item)}
            className="group relative flex flex-col overflow-hidden
                       col-span-1 sm:col-span-2 lg:col-span-2
                       min-h-[220px] lg:min-h-[260px]
                       border border-brutal-border dark:border-[#41494d]/50
                       bg-surface-solid dark:bg-[#0c1518]
                       hover:shadow-[0_0_18px_rgba(63,255,139,0.18)] transition-all duration-300"
        >
            {item.image_url && (
                <img
                    src={item.image_url}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-500"
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {/* Rank badge */}
            <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full border border-brand dark:border-es-primary flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <span className="font-mono font-bold text-[12px] text-brand dark:text-es-primary">1</span>
            </div>

            {item.category && (
                <span className={`absolute top-3 right-3 z-10 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide ${getCategoryColor(item.category)}`}>
                    {item.category}
                </span>
            )}

            <div className="relative z-10 mt-auto p-4">
                <p className="font-manrope font-bold text-white text-base md:text-lg leading-snug line-clamp-3 mb-2 drop-shadow group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                    {item.title}
                </p>
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-white/60 truncate max-w-[55%]">{item.source_name}</span>
                    <div className="flex items-center gap-2">
                        {ago && <span className="font-mono text-[9px] text-white/50">{ago}</span>}
                        {viewCount > 0 && (
                            <span className="flex items-center gap-0.5 font-mono text-[9px] text-white/50">
                                <Eye className="w-2.5 h-2.5" />{viewCount}
                            </span>
                        )}
                        <ExternalLink className="w-2.5 h-2.5 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>
        </a>
    );
}

/* Rank 2-3 — dikey kart */
function VerticalCard({ item, rank }) {
    const ago = timeAgo(item.pub_date);
    const viewCount = item.community?.view_count ?? 0;

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(item)}
            className="group flex flex-col overflow-hidden
                       border border-brutal-border dark:border-[#41494d]/50
                       bg-surface dark:bg-[#0c1518]
                       hover:shadow-[0_0_14px_rgba(63,255,139,0.15)] transition-all duration-300"
        >
            <div className="relative w-full aspect-[16/9] overflow-hidden bg-surface-solid shrink-0">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-brutal-border/40" />
                    </div>
                )}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full border border-brand dark:border-es-primary flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <span className="font-mono font-bold text-[10px] text-brand dark:text-es-primary">{rank}</span>
                </div>
                {item.category && (
                    <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wide ${getCategoryColor(item.category)}`}>
                        {item.category}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1 p-2.5 flex-1">
                <p className="text-[12px] font-semibold leading-snug text-tx-primary line-clamp-2 flex-1
                              group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                    {item.title}
                </p>
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-brutal-border/30 dark:border-[#41494d]/30">
                    <span className="font-mono text-[10px] text-tx-secondary truncate">{item.source_name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {ago && <span className="font-mono text-[9px] text-tx-secondary">{ago}</span>}
                        {viewCount > 0 && (
                            <span className="flex items-center gap-0.5 font-mono text-[9px] text-tx-secondary">
                                <Eye className="w-2.5 h-2.5" />{viewCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </a>
    );
}

/* Rank 4-5 — yatay kart */
function HorizontalCard({ item, rank }) {
    const ago = timeAgo(item.pub_date);

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(item)}
            className="group flex overflow-hidden
                       col-span-1 sm:col-span-1 lg:col-span-2
                       border border-brutal-border dark:border-[#41494d]/50
                       bg-surface dark:bg-[#0c1518]
                       hover:shadow-[0_0_14px_rgba(63,255,139,0.15)] transition-all duration-300"
        >
            <div className="relative w-1/3 overflow-hidden bg-surface-solid shrink-0">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-brutal-border/40" />
                    </div>
                )}
            </div>

            <div className="relative flex flex-col justify-center p-3 flex-1 gap-1.5 min-w-0">
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full border border-brand dark:border-es-primary flex items-center justify-center bg-surface dark:bg-[#0c1518]">
                    <span className="font-mono font-bold text-[9px] text-brand dark:text-es-primary">{rank}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pr-6">
                    {item.category && (
                        <span className="font-bold text-[9px] text-brand dark:text-es-primary uppercase tracking-wide">
                            {item.category}
                        </span>
                    )}
                    {ago && <span className="font-mono text-[9px] text-tx-secondary">{ago}</span>}
                </div>

                <p className="text-[12px] font-semibold leading-snug text-tx-primary line-clamp-2
                              group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                    {item.title}
                </p>

                <span className="font-mono text-[10px] text-tx-secondary truncate">{item.source_name}</span>
            </div>
        </a>
    );
}

function SkeletonHero() {
    return (
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[220px] lg:min-h-[260px]
                        border border-brutal-border dark:border-[#41494d]/30 animate-pulse bg-brutal-border/10 dark:bg-[#41494d]/10" />
    );
}

function SkeletonVertical() {
    return (
        <div className="border border-brutal-border dark:border-[#41494d]/30 overflow-hidden animate-pulse bg-surface dark:bg-[#0c1518]">
            <div className="w-full aspect-[16/9] bg-brutal-border/20 dark:bg-[#41494d]/20" />
            <div className="p-2.5 space-y-2">
                <div className="h-3 bg-brutal-border/20 dark:bg-[#41494d]/20 w-full" />
                <div className="h-3 bg-brutal-border/15 dark:bg-[#41494d]/15 w-3/4" />
            </div>
        </div>
    );
}

function SkeletonHorizontal() {
    return (
        <div className="col-span-1 sm:col-span-1 lg:col-span-2 flex h-[110px]
                        border border-brutal-border dark:border-[#41494d]/30 overflow-hidden animate-pulse bg-surface dark:bg-[#0c1518]">
            <div className="w-1/3 bg-brutal-border/20 dark:bg-[#41494d]/20" />
            <div className="flex-1 p-3 space-y-2">
                <div className="h-2 bg-brutal-border/20 dark:bg-[#41494d]/20 w-1/2" />
                <div className="h-3 bg-brutal-border/15 dark:bg-[#41494d]/15 w-full" />
                <div className="h-3 bg-brutal-border/10 dark:bg-[#41494d]/10 w-3/4" />
            </div>
        </div>
    );
}

export default function PopularNewsSection() {
    const [news, setNews]       = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        NewsService.getNews({ sort: 'popular', size: 5 })
            .then(data => setNews(data.items || []))
            .catch(() => setNews([]))
            .finally(() => setLoading(false));
    }, []);

    if (!loading && news.length === 0) return null;

    return (
        <section className="w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-12 mt-4">
            {/* Başlık */}
            <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-brand dark:text-es-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-tx-primary">
                    En Popüler Haberler
                </h2>
            </div>
            <p className="font-mono text-[9px] text-tx-secondary/60 uppercase tracking-widest mb-4">
                // Son 2 Gün / Görüntülenme Bazlı
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {loading ? (
                    <>
                        <SkeletonHero />
                        <SkeletonVertical />
                        <SkeletonVertical />
                        <SkeletonHorizontal />
                        <SkeletonHorizontal />
                    </>
                ) : (
                    <>
                        {news[0] && <HeroCard item={news[0]} />}
                        {news[1] && <VerticalCard item={news[1]} rank={2} />}
                        {news[2] && <VerticalCard item={news[2]} rank={3} />}
                        {news[3] && <HorizontalCard item={news[3]} rank={4} />}
                        {news[4] && <HorizontalCard item={news[4]} rank={5} />}
                    </>
                )}
            </div>
        </section>
    );
}
