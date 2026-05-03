import React, { useEffect, useState } from 'react';
import { Layers, ExternalLink, Eye } from 'lucide-react';
import AnalysisService from '../../services/analysis.service';
import { trackInteraction } from '../../services/interaction.service';

const CATEGORY_COLORS = {
    gündem:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    spor:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ekonomi:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    siyaset:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    dünya:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    teknoloji:'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    sağlık:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    kültür:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
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

function NewsCard({ item }) {
    const ago = timeAgo(item.pub_date);
    const viewCount = item.community?.view_count ?? 0;

    return (
        <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackInteraction({
                content_id: item.id,
                interaction_type: 'click',
                category: item.category,
                source_domain: item.source_name,
            })}
            className="group flex flex-col overflow-hidden
                       border border-brutal-border dark:border-[#41494d]/50
                       bg-surface dark:bg-[#0c1518]
                       hover:shadow-[0_0_12px_rgba(63,255,139,0.14)] transition-all duration-300"
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
                        <Layers className="w-6 h-6 text-brutal-border/40" />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1.5 p-2.5 flex-1">
                <div className="flex items-center justify-between gap-1">
                    {item.category && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wide ${getCategoryColor(item.category)}`}>
                            {item.category}
                        </span>
                    )}
                    {ago && <span className="font-mono text-[9px] text-tx-secondary shrink-0">{ago}</span>}
                </div>
                <p className="text-[12px] font-semibold leading-snug text-tx-primary line-clamp-2 flex-1
                              group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                    {item.title}
                </p>
                <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-brutal-border/30 dark:border-[#41494d]/30">
                    <span className="font-mono text-[10px] text-tx-secondary truncate">{item.source_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                        {viewCount > 0 && (
                            <span className="flex items-center gap-0.5 font-mono text-[9px] text-tx-secondary">
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

function SkeletonCard() {
    return (
        <div className="border border-brutal-border dark:border-[#41494d]/30 overflow-hidden animate-pulse bg-surface dark:bg-[#0c1518]">
            <div className="w-full aspect-[16/9] bg-brutal-border/20 dark:bg-[#41494d]/20" />
            <div className="p-2.5 space-y-2">
                <div className="h-3 bg-brutal-border/20 dark:bg-[#41494d]/20 w-1/3" />
                <div className="h-3 bg-brutal-border/15 dark:bg-[#41494d]/15 w-full" />
                <div className="h-3 bg-brutal-border/10 dark:bg-[#41494d]/10 w-4/5" />
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

    return (
        <section className="w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-6 mt-6">
            <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-brand dark:text-es-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-tx-primary">
                    Benzer Haberler
                </h2>
            </div>
            <p className="font-mono text-[10px] text-tx-secondary/80 uppercase tracking-widest mb-4">
                // Semantik Benzerlik / Vektör Arama
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                    : items.map(item => <NewsCard key={item.id} item={item} />)
                }
            </div>
        </section>
    );
}
