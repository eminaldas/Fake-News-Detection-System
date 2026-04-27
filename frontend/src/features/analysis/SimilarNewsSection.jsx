import React, { useEffect, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import AnalysisService from '../../services/analysis.service';

const CATEGORY_COLORS = {
    spor:     { bg: '#3b82f620', text: '#3b82f6' },
    ekonomi:  { bg: '#f59e0b20', text: '#f59e0b' },
    siyaset:  { bg: '#8b5cf620', text: '#8b5cf6' },
    dünya:    { bg: '#10b98120', text: '#10b981' },
    teknoloji:{ bg: '#06b6d420', text: '#06b6d4' },
    sağlık:   { bg: '#ef444420', text: '#ef4444' },
    kültür:   { bg: '#f97316', text: '#fff' },
};

function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function NewsCard({ item }) {
    const cat    = (item.category || '').toLowerCase();
    const catStyle = CATEGORY_COLORS[cat] || { bg: '#6b728020', text: '#6b7280' };
    const date   = formatDate(item.pub_date);

    return (
        <a
            href={item.source_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border border-brutal-border bg-surface
                       overflow-hidden hover:border-brand/40 dark:hover:border-es-primary/40
                       transition-all duration-200 hover:shadow-md"
        >
            {/* Görsel */}
            {item.image_url ? (
                <div className="h-36 w-full overflow-hidden shrink-0">
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
                    />
                </div>
            ) : (
                <div className="h-24 w-full flex items-center justify-center shrink-0"
                     style={{ background: catStyle.bg }}>
                    <Newspaper className="w-8 h-8 opacity-30" style={{ color: catStyle.text }} />
                </div>
            )}

            {/* İçerik */}
            <div className="flex flex-col gap-2 p-4 flex-1">
                {/* Kategori */}
                {item.category && (
                    <span
                        className="text-[10px] font-bold uppercase tracking-widest w-fit px-2 py-0.5 rounded-full"
                        style={{ background: catStyle.bg, color: catStyle.text }}
                    >
                        {item.category}
                    </span>
                )}

                {/* Başlık */}
                <p className="text-[13px] font-semibold leading-snug text-tx-primary line-clamp-3
                              group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                    {item.title}
                </p>

                {/* Alt satır */}
                <div className="flex items-center justify-between mt-auto pt-1 gap-2">
                    <span className="text-[10px] text-tx-secondary truncate">
                        {item.source_name}{date ? ` · ${date}` : ''}
                    </span>
                    <ExternalLink className="w-3 h-3 text-tx-secondary shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
            </div>
        </a>
    );
}

export default function SimilarNewsSection({ taskId }) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(!!taskId);

    useEffect(() => {
        if (!taskId) return;
        AnalysisService.getSimilarNews(taskId)
            .then(data => setItems(data.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [taskId]);

    if (loading) return (
        <div className="mt-8">
            <div className="h-4 w-40 bg-brutal-border/30 rounded mb-4 animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-2xl border border-brutal-border/30 overflow-hidden animate-pulse">
                        <div className="h-28 bg-brutal-border/20" />
                        <div className="p-4 space-y-2">
                            <div className="h-2.5 bg-brutal-border/30 rounded w-1/3" />
                            <div className="h-3 bg-brutal-border/25 rounded w-full" />
                            <div className="h-3 bg-brutal-border/20 rounded w-4/5" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (items.length === 0) return null;

    return (
        <div className="mt-8" style={{ animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-4 h-4 text-tx-secondary" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-tx-secondary">
                    Benzer Haberler
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {items.map(item => (
                    <NewsCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}
