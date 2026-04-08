import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';
import { trackInteraction } from '../../services/interaction.service';

const REASON_COLORS = {
    'Senin için seçildi':    'text-es-primary',
    'Çok okuduğun kategori': 'text-brand',
    'İlgi alanın':           'text-authentic-text',
    'Trend':                 'text-tx-secondary',
};

export default function RecommendationPanel({ context = 'post_analysis', title = 'İlgili Haberler' }) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get(`/recommendations/?context=${context}&limit=5`)
            .then(res => setItems(res.data.items || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [context]);

    if (loading) return (
        <div className="mt-4 space-y-2">
            {[1,2,3].map(i => (
                <div key={i} className="h-10 rounded-lg bg-base animate-pulse" />
            ))}
        </div>
    );

    if (items.length === 0) return null;

    return (
        <div className="mt-4 rounded-2xl border border-brutal-border overflow-hidden"
             style={{ animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
            <div className="px-4 py-3 border-b border-brutal-border bg-base">
                <span className="text-xs font-extrabold uppercase tracking-widest text-tx-secondary">
                    📰 {title}
                </span>
            </div>
            <div className="divide-y divide-brutal-border">
                {items.map(item => (
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
                        className="flex items-center gap-3 px-4 py-3 hover:bg-base transition-colors group"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-tx-primary line-clamp-2 group-hover:text-brand transition-colors">
                                {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                {item.reason && (
                                    <span className={`text-[10px] font-bold ${REASON_COLORS[item.reason] || 'text-tx-secondary'}`}>
                                        {item.reason}
                                    </span>
                                )}
                                {item.source_name && (
                                    <span className="text-[10px] text-tx-secondary opacity-60">
                                        {item.source_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        {item.nlp_score != null && (
                            <div className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                 style={{
                                     background: item.nlp_score > 0.6 ? '#ef44441a' : '#3fff8b1a',
                                     color:      item.nlp_score > 0.6 ? '#ef4444'   : '#3fff8b',
                                 }}>
                                %{Math.round(item.nlp_score * 100)} risk
                            </div>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
}
