import React, { useState } from 'react';
import { TrendingUp, Newspaper } from 'lucide-react';
import { useTrending } from '../../../hooks/useTrending';
import { trackInteraction } from '../../../services/interaction.service';

const BORDER   = 'var(--color-terminal-border-raw)';
const SURFACE  = 'var(--color-terminal-surface)';
const TEXT_PRI = 'var(--color-text-primary)';
const TEXT_MUT = 'var(--color-text-muted-accent)';
const ACCENT   = 'var(--color-brand-primary)';
const BADGE_FG = 'var(--color-brand-badge-text)';

function formatCount(n) {
    if (!n) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.0', '')}B`;
    return String(n);
}

function SkeletonPanel() {
    return (
        <div className="relative overflow-hidden animate-pulse w-full" style={{ background: SURFACE }}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: 'var(--color-skeleton)' }} />
            <div className="p-6">
                <div className="flex justify-between items-start mb-7">
                    <div className="space-y-2">
                        <div className="h-6 w-28 rounded" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="h-6 w-20 rounded" style={{ background: 'var(--color-skeleton)' }} />
                    </div>
                    <div className="h-6 w-16 rounded" style={{ background: 'var(--color-skeleton)' }} />
                </div>
                <div className="flex flex-col gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded shrink-0" style={{ background: 'var(--color-skeleton)' }} />
                            <div className="w-14 h-14 rounded shrink-0" style={{ background: 'var(--color-skeleton)' }} />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-full rounded" style={{ background: 'var(--color-skeleton)' }} />
                                <div className="h-3 w-2/3 rounded" style={{ background: 'var(--color-skeleton)' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TrendItem({ article, rank }) {
    const [hovered, setHovered] = useState(false);

    const clicks  = article.community?.view_count || 0;
    const views   = formatCount(clicks);
    const meta    = article.source_name
        ? `${article.source_name}${views ? ` · ${views} görüntülenme` : ''}`
        : (views ? `${views} görüntülenme` : `${article.source_count || 1} kaynak`);

    const rankColor = rank === 1 ? ACCENT
                    : rank === 2 ? 'color-mix(in srgb, var(--color-brand-primary) 75%, var(--color-text-primary))'
                    : rank === 3 ? 'color-mix(in srgb, var(--color-brand-primary) 50%, var(--color-text-primary))'
                    : TEXT_MUT;

    return (
        <a href={article.source_url}
           target="_blank"
           rel="noopener noreferrer"
           className="group flex items-start gap-4 -mx-2 px-2 py-2 transition-colors duration-200 animate-fade-up"
           style={{ textDecoration: 'none', animationDelay: `${(rank - 1) * 55}ms` }}
           onMouseEnter={e => {
               setHovered(true);
               const dark = document.documentElement.classList.contains('dark');
               e.currentTarget.style.background = dark ? 'rgba(16,185,129,0.08)' : 'rgba(26,158,79,0.06)';
           }}
           onMouseLeave={e => { setHovered(false); e.currentTarget.style.background = 'transparent'; }}
           onClick={() => trackInteraction({
               content_id:        article.id,
               interaction_type:  'click',
               category:          article.category,
               nlp_score_at_time: article.nlp_score,
           })}>
            <span className="font-extrabold text-4xl leading-none w-9 text-center shrink-0 pt-1 transition-colors duration-200"
                  style={{ color: hovered ? ACCENT : rankColor }}>
                {rank}
            </span>

            {article.image_url ? (
                <img src={article.image_url}
                     alt=""
                     className="w-14 h-14 object-cover shrink-0 mt-0.5 grayscale group-hover:grayscale-0 transition-all duration-300"
                     style={{ border: `1px solid ${BORDER}` }} />
            ) : (
                <div className="w-14 h-14 flex items-center justify-center shrink-0 mt-0.5"
                     style={{ border: `1px solid ${BORDER}`, background: 'color-mix(in srgb, var(--color-brand-primary) 8%, transparent)' }}>
                    <Newspaper className="w-5 h-5" style={{ color: ACCENT, opacity: 0.6 }} />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold leading-snug transition-colors duration-200"
                    style={{ color: hovered ? ACCENT : TEXT_PRI }}>
                    {article.title}
                </h3>
                <p className="text-[11px] mt-1 truncate" style={{ color: TEXT_MUT }}>
                    {meta}
                </p>
            </div>
        </a>
    );
}

export default function TrendingPanel({ category }) {
    const { items, loading } = useTrending(category);

    if (loading) return <SkeletonPanel />;

    return (
        <div className="relative overflow-hidden w-full animate-fade-up shadow-lg" style={{ background: SURFACE }}>
            {/* Neon sol aksan */}
            <div className="absolute inset-y-0 left-0 w-1"
                 style={{ background: `linear-gradient(to bottom, ${ACCENT}, color-mix(in srgb, ${ACCENT} 30%, transparent), transparent)` }} />

            <div className="p-6">
                {/* Başlık */}
                <div className="flex justify-between items-start mb-7">
                    <h2 className="text-[26px] leading-[1.1] font-bold tracking-tight" style={{ color: TEXT_PRI }}>
                        Günün<br />Trendleri
                    </h2>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0"
                         style={{ background: 'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)', border: `1px solid color-mix(in srgb, ${ACCENT} 35%, transparent)` }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: ACCENT }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                            Canlı
                        </span>
                    </div>
                </div>

                {/* Liste */}
                {items.length === 0 ? (
                    <p className="py-8 text-sm text-center" style={{ color: TEXT_MUT }}>
                        Bugün henüz trend haber yok
                    </p>
                ) : (
                    <div className="flex flex-col gap-1">
                        {items.map((article, i) => (
                            <TrendItem key={article.id} article={article} rank={i + 1} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-4 flex items-center gap-2 border-t" style={{ borderColor: BORDER }}>
                <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                <span className="text-xs" style={{ color: TEXT_MUT }}>
                    Her 5 dakikada güncellenir
                </span>
            </div>
        </div>
    );
}
