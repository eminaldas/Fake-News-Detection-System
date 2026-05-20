import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTrending } from '../../../hooks/useTrending';
import { trackInteraction } from '../../../services/interaction.service';

const BORDER = 'var(--color-terminal-border-raw)';
const ACCENT = '#7c8fff';

function SkeletonPanel() {
    return (
        <div className="rounded-xl overflow-hidden animate-pulse"
             style={{ background: 'var(--color-terminal-surface)', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ACCENT}33` }}>
            <div className="p-4 space-y-3">
                <div className="h-3 w-1/2 rounded" style={{ background: 'var(--color-skeleton)' }} />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <div className="w-4 h-4 rounded" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="h-3 flex-1 rounded" style={{ background: 'var(--color-skeleton)' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function rankColor(i) {
    if (i === 0) return ACCENT;
    if (i === 1) return `${ACCENT}99`;
    if (i === 2) return `${ACCENT}66`;
    return `${ACCENT}33`;
}

export default function TrendingPanel({ category }) {
    const { items, loading } = useTrending(category);

    const maxClicks = useMemo(
        () => Math.max(1, ...items.map(a => a.community?.view_count || 0)),
        [items]
    );

    if (loading) return <SkeletonPanel />;

    return (
        <div className="rounded-xl overflow-hidden flex flex-col"
             style={{
                 background: 'var(--color-terminal-surface)',
                 border:     `1px solid ${BORDER}`,
                 borderLeft: `3px solid ${ACCENT}55`,
             }}>

            <div className="flex items-center gap-2 px-4 pt-4 pb-3"
                 style={{ borderBottom: `1px solid ${BORDER}` }}>
                <TrendingUp className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    Bugün Trend
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
                    Canlı
                </span>
            </div>

            {items.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center"
                   style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                    Bugün henüz trend haber yok
                </p>
            ) : (
                <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
                    {items.map((article, i) => {
                        const clicks = article.community?.view_count || 0;
                        const barW   = Math.round((clicks / maxClicks) * 100);
                        return (
                            <a key={article.id}
                               href={article.source_url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex gap-2 items-start px-2 py-2 rounded-lg transition-colors"
                               style={{ textDecoration: 'none' }}
                               onMouseEnter={e  => e.currentTarget.style.background = '#ffffff07'}
                               onMouseLeave={e  => e.currentTarget.style.background = 'transparent'}
                               onClick={() => trackInteraction({
                                   content_id:       article.id,
                                   interaction_type: 'click',
                                   category:         article.category,
                                   nlp_score_at_time: article.nlp_score,
                               })}>
                                <span className="text-[13px] font-black min-w-[18px] leading-tight pt-0.5"
                                      style={{ color: rankColor(i) }}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold leading-snug line-clamp-2 mb-1.5"
                                       style={{ color: 'var(--color-text-secondary)' }}>
                                        {article.title}
                                    </p>
                                    <div className="h-[2px] rounded-full overflow-hidden mb-1"
                                         style={{ background: '#0d1520' }}>
                                        <div className="h-full rounded-full transition-all duration-700"
                                             style={{ width: `${barW}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}88)` }} />
                                    </div>
                                    <p className="text-[9px] font-mono" style={{ color: `${ACCENT}55` }}>
                                        {clicks > 0 ? `${clicks} tıklama` : article.source_count > 1 ? `${article.source_count} kaynak` : ''}
                                    </p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}

            <div className="px-4 pb-3 pt-2 flex items-center gap-1.5"
                 style={{ borderTop: `1px solid ${BORDER}` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: ACCENT }} />
                <span className="text-[10px]" style={{ color: `${ACCENT}55` }}>
                    Her 5 dakikada güncellenir
                </span>
            </div>
        </div>
    );
}
