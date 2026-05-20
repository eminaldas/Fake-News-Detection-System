import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTrending } from '../../../hooks/useTrending';
import { trackInteraction } from '../../../services/interaction.service';

const BORDER   = 'var(--color-terminal-border-raw)';
const TEXT_PRI = 'var(--color-text-primary)';
const TEXT_MUT = 'var(--color-text-muted-accent)';
const ACCENT   = '#3fff8b';

function SkeletonPanel() {
    return (
        <div className="overflow-hidden animate-pulse w-full"
             style={{ background: 'var(--color-terminal-surface)' }}>
            <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
                <div className="w-4 h-4 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-4 w-24 rounded" style={{ background: 'var(--color-skeleton)' }} />
            </div>
            <div className="px-4 py-2 flex flex-col">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-4 items-start py-3.5">
                        <div className="w-7 h-7 rounded shrink-0" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 w-full rounded" style={{ background: 'var(--color-skeleton)' }} />
                            <div className="h-3 w-2/3 rounded" style={{ background: 'var(--color-skeleton)' }} />
                            <div className="h-2.5 w-16 rounded" style={{ background: 'var(--color-skeleton)' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TrendItem({ article, rank }) {
    const [hovered, setHovered] = useState(false);

    const clicks  = article.community?.view_count || 0;
    const sources = article.source_count || 1;
    const meta    = clicks > 0 ? `${clicks} tıklama` : `${sources} kaynak`;

    const rankColor = rank === 1 ? ACCENT
                    : rank === 2 ? '#2ec46a'
                    : rank === 3 ? '#1da050'
                    : 'var(--color-text-secondary)';

    return (
        <a href={article.source_url}
           target="_blank"
           rel="noopener noreferrer"
           className="block transition-all duration-200 animate-fade-up"
           style={{
               textDecoration: 'none',
               animationDelay: `${(rank - 1) * 55}ms`,
           }}
           onMouseEnter={e => {
               setHovered(true);
               const dark = document.documentElement.classList.contains('dark');
               e.currentTarget.style.background = dark ? 'rgba(100,140,255,0.07)' : 'rgba(0,0,0,0.04)';
           }}
           onMouseLeave={e => { setHovered(false); e.currentTarget.style.background = 'transparent'; }}
           onClick={() => trackInteraction({
               content_id:        article.id,
               interaction_type:  'click',
               category:          article.category,
               nlp_score_at_time: article.nlp_score,
           })}>
            <div className="flex items-start gap-4 px-4 py-3.5">
                <span className="font-extrabold text-xl leading-none shrink-0 pt-0.5 transition-colors duration-200 min-w-6"
                      style={{ color: hovered ? ACCENT : rankColor }}>
                    {rank}
                </span>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium leading-snug line-clamp-2 transition-colors duration-200"
                        style={{ color: hovered ? '#3fff8b' : TEXT_PRI }}>
                        {article.title}
                    </h3>
                    <p className="text-[11px] mt-1" style={{ color: TEXT_MUT }}>
                        {meta}
                    </p>
                </div>
            </div>
            {/* Gradient divider */}
            <div className="mx-4 h-px"
                 style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.08), transparent)' }} />
        </a>
    );
}

export default function TrendingPanel({ category }) {
    const { items, loading } = useTrending(category);

    if (loading) return <SkeletonPanel />;

    return (
        <div className="overflow-hidden flex flex-col animate-fade-up w-full"
             style={{ background: 'var(--color-terminal-surface)', borderLeft: `3px solid ${ACCENT}55` }}>

            {/* Başlık */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b" style={{ borderColor: BORDER }}>
                <TrendingUp className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                <span className="text-sm font-bold flex-1" style={{ color: TEXT_PRI }}>
                    Günün Trendleri
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 tracking-wide flex items-center gap-1.5"
                      style={{ background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)', opacity: 0.9 }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#fff' }} />
                    CANLI
                </span>
            </div>

            {/* Liste */}
            {items.length === 0 ? (
                <p className="px-5 py-8 text-sm text-center" style={{ color: TEXT_MUT }}>
                    Bugün henüz trend haber yok
                </p>
            ) : (
                <div className="flex flex-col py-1 flex-1">
                    {items.map((article, i) => (
                        <TrendItem key={article.id} article={article} rank={i + 1} />
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="px-5 pb-4 pt-3 flex items-center gap-2 border-t" style={{ borderColor: BORDER }}>
                <span className="w-1.5 h-1.5 shrink-0 animate-pulse" style={{ background: ACCENT }} />
                <span className="text-xs" style={{ color: TEXT_MUT }}>
                    Her 5 dakikada güncellenir
                </span>
            </div>
        </div>
    );
}
