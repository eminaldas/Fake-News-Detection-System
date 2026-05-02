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

/* Büyük kart — 2 kolon × 2 satır */
function FeaturedCard({ item }) {
    const ago = timeAgo(item.pub_date);
    const viewCount = item.community?.view_count ?? 0;

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(item)}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-brutal-border dark:border-surface-solid
                       bg-surface col-span-2 row-span-2
                       transition-all duration-200 hover:shadow-lg hover:border-brand dark:hover:border-es-primary"
        >
            {/* Görsel — tam kapla */}
            <div className="relative flex-1 overflow-hidden bg-surface-solid min-h-[180px]">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-10 h-10 text-brutal-border/30" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Sıra rozeti */}
                <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-brand dark:bg-es-primary
                                flex items-center justify-center text-white dark:text-black text-[12px] font-black shadow-lg">
                    1
                </div>

                {/* Kategori */}
                {item.category && (
                    <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getCategoryColor(item.category)}`}>
                        {item.category}
                    </span>
                )}

                {/* Başlık + meta — alt kısım üzerine */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-bold text-base leading-snug line-clamp-3 mb-2 drop-shadow">
                        {item.title}
                    </p>
                    <div className="flex items-center justify-between">
                        <span className="text-white/70 text-[11px] font-medium truncate max-w-[55%]">
                            {item.source_name}
                        </span>
                        <div className="flex items-center gap-2.5">
                            {ago && <span className="text-white/60 text-[10px]">{ago}</span>}
                            {viewCount > 0 && (
                                <span className="flex items-center gap-1 text-white/60 text-[10px]">
                                    <Eye className="w-3 h-3" />{viewCount}
                                </span>
                            )}
                            <ExternalLink className="w-3 h-3 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                </div>
            </div>
        </a>
    );
}

/* Küçük kart — 1×1 */
function SmallCard({ item, rank }) {
    const ago = timeAgo(item.pub_date);
    const viewCount = item.community?.view_count ?? 0;

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(item)}
            className="group flex flex-col overflow-hidden rounded-xl border border-brutal-border dark:border-surface-solid
                       bg-surface hover:bg-surface-solid/40 dark:hover:bg-white/[0.03]
                       transition-all duration-200 hover:shadow-md hover:border-brand dark:hover:border-es-primary"
        >
            {/* Görsel */}
            <div className="relative w-full aspect-[16/9] overflow-hidden bg-surface-solid shrink-0">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-brutal-border/40" />
                    </div>
                )}
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand dark:bg-es-primary
                                flex items-center justify-center text-white dark:text-black text-[10px] font-black shadow">
                    {rank}
                </div>
            </div>

            {/* İçerik */}
            <div className="flex flex-col gap-1.5 p-2.5 flex-1">
                <div className="flex items-center justify-between gap-1">
                    {item.category && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${getCategoryColor(item.category)}`}>
                            {item.category}
                        </span>
                    )}
                    {ago && <span className="text-[9px] text-tx-secondary shrink-0">{ago}</span>}
                </div>
                <p className="text-[12px] font-semibold leading-snug text-tx-primary line-clamp-2 flex-1
                              group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                    {item.title}
                </p>
                <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-brutal-border/30 dark:border-surface-solid/40">
                    <span className="text-[10px] text-tx-secondary truncate">{item.source_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                        {viewCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-tx-secondary">
                                <Eye className="w-2.5 h-2.5" />{viewCount}
                            </span>
                        )}
                        <ExternalLink className="w-2.5 h-2.5 text-tx-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>
        </a>
    );
}

function SkeletonFeatured() {
    return (
        <div className="col-span-2 row-span-2 rounded-xl border border-brutal-border dark:border-surface-solid overflow-hidden animate-pulse bg-surface">
            <div className="w-full h-full min-h-[200px] bg-brutal-border/20" />
        </div>
    );
}

function SkeletonSmall() {
    return (
        <div className="rounded-xl border border-brutal-border dark:border-surface-solid overflow-hidden animate-pulse bg-surface">
            <div className="w-full aspect-[16/9] bg-brutal-border/20" />
            <div className="p-2.5 space-y-2">
                <div className="h-3 bg-brutal-border/20 rounded w-1/3" />
                <div className="h-3 bg-brutal-border/15 rounded w-full" />
                <div className="h-3 bg-brutal-border/10 rounded w-4/5" />
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
            <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-brand dark:text-es-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-tx-primary">
                    En Popüler Haberler
                </h2>
                <span className="text-[10px] text-tx-secondary font-medium">(son 2 gün)</span>
            </div>

            {/* 5 kart yan yana */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonSmall key={i} />)
                    : news.map((item, i) => (
                        <SmallCard key={item.id} item={item} rank={i + 1} />
                    ))
                }
            </div>
        </section>
    );
}
