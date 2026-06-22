import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import NewsService from '../../../services/news.service';
import CollapsiblePanel from './CollapsiblePanel';

const ACCENT = '#3fff8b';

function relColor(score) {
    if (score == null) return 'var(--color-text-muted)';
    if (score < 0.40) return ACCENT;
    if (score < 0.60) return 'var(--color-accent-amber)';
    return 'var(--color-fake-fill)';
}
const rankColor = (r) => (r === 1 ? ACCENT : r === 2 ? '#2ec46a' : r === 3 ? '#1da050' : 'var(--color-text-secondary)');

export default function PopularNewsPanel() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        let alive = true;
        NewsService.getNews({ sort: 'popular', size: 6, page: 1 })
            .then(d => { if (alive) setItems(d.items ?? []); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    if (items.length === 0) return null;

    const liveBadge = (
        <span className="font-mono text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 flex items-center gap-1"
              style={{ background: ACCENT, color: '#021a0a' }}>
            <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#021a0a' }} />CANLI
        </span>
    );

    return (
        <CollapsiblePanel icon={TrendingUp} title="Popüler Haberler" badge={liveBadge} storageKey="popnews">
            <div className="flex flex-col">
                {items.map((a, i) => {
                    const rank = i + 1;
                    const clicks = a.community?.view_count ?? 0;
                    const pct = a.nlp_score != null ? Math.round((1 - a.nlp_score) * 100) : null;
                    return (
                        <a key={a.id} href={a.source_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                           style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none', textDecoration: 'none' }}>
                            <span className="font-extrabold text-lg leading-none shrink-0" style={{ color: rankColor(rank) }}>{rank}</span>
                            <div className="min-w-0">
                                <p className="text-[12.5px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                                    {a.title}
                                </p>
                                <p className="font-mono text-[10px] mt-1 flex gap-2" style={{ color: 'var(--color-text-muted)' }}>
                                    {clicks > 0 && <span>{clicks} tıklama</span>}
                                    {pct != null && <span style={{ color: relColor(a.nlp_score), fontWeight: 800 }}>%{pct} güven</span>}
                                </p>
                            </div>
                        </a>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
