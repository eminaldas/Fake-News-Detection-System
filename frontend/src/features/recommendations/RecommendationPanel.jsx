import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';
import { trackInteraction } from '../../services/interaction.service';

const RISK_STYLE = (score) => {
    if (score == null) return null;
    return score > 0.6
        ? { bg: '#ef44441a', color: '#ef4444' }
        : { bg: '#3fff8b1a', color: '#3fff8b' };
};

export default function RecommendationPanel({ context = 'post_analysis', title = 'İlgili Haberler' }) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get(`/recommendations/?context=${context}&limit=6`)
            .then(res => setItems(res.data.items || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [context]);

    if (loading) return (
        <div className="mt-6 flex gap-3 overflow-hidden">
            {[1, 2, 3].map(i => (
                <div key={i} className="min-w-[200px] h-24 rounded-xl bg-base animate-pulse shrink-0" />
            ))}
        </div>
    );

    if (items.length === 0) return null;

    return (
        <div className="mt-6" style={{ animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="px-1 mb-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-tx-secondary">
                    📰 {title}
                </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {items.map(item => {
                    const risk = RISK_STYLE(item.nlp_score);
                    return (
                        <a
                            key={item.id}
                            href={item.source_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackInteraction({
                                content_id:        item.id,
                                interaction_type:  'click',
                                category:          item.category,
                                nlp_score_at_time: item.nlp_score,
                            })}
                            className="flex flex-col justify-between min-w-[190px] max-w-[220px] shrink-0
                                       rounded-xl border border-brutal-border bg-surface p-3 gap-2
                                       hover:border-brand/50 transition-colors group"
                        >
                            <p className="text-[12px] font-semibold text-tx-primary line-clamp-3
                                          group-hover:text-brand transition-colors leading-snug">
                                {item.title}
                            </p>
                            <div className="flex items-center justify-between gap-1 mt-auto">
                                {item.source_name && (
                                    <span className="text-[10px] text-tx-secondary truncate">
                                        {item.source_name}
                                    </span>
                                )}
                                {risk && (
                                    <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                        style={{ background: risk.bg, color: risk.color }}
                                    >
                                        %{Math.round(item.nlp_score * 100)} risk
                                    </span>
                                )}
                            </div>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
