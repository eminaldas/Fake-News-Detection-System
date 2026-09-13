import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import CollapsiblePanel from './CollapsiblePanel';

const rankColor = (r) =>
    r === 1 ? 'var(--color-brand-primary)'
  : r === 2 ? '#2bb464'
  : r === 3 ? '#3dbf72'
  : 'var(--color-text-muted)';

export default function PopularPostsPanel() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        let alive = true;
        axiosInstance.get('/forum/trending', { params: { velocity: true } })
            .then(r => { if (alive) setItems((r.data?.trending_threads ?? []).slice(0, 6)); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    if (items.length === 0) return null;

    const liveBadge = (
        <span className="text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--color-brand-primary) 15%, transparent)', color: 'var(--color-brand-primary)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor' }} />Canlı
        </span>
    );

    return (
        <CollapsiblePanel icon={TrendingUp} title="Popüler Gönderiler" badge={liveBadge} storageKey="popposts">
            <div className="flex flex-col gap-1 -mx-2">
                {items.map((t, i) => {
                    const rank = i + 1;
                    return (
                        <Link key={t.id} to={`/forum/${t.id}`}
                              className="flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-150 hover:translate-x-0.5"
                              style={{ textDecoration: 'none' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-surface-solid)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <span className="font-extrabold text-lg leading-none shrink-0" style={{ color: rankColor(rank) }}>{rank}</span>
                            <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t.title}
                                </p>
                                <p className="text-[11.5px] mt-1 flex gap-2 items-center flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                                    <span>{t.total_votes ?? 0} oy</span>
                                    <span>{t.comment_count ?? 0} yorum</span>
                                    {t.is_rising && (
                                        <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded"
                                              style={{ color: 'var(--color-accent-amber)', background: 'color-mix(in srgb, var(--color-accent-amber) 14%, transparent)' }}>
                                            <TrendingUp className="w-2.5 h-2.5" /> Yükselişte
                                        </span>
                                    )}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </CollapsiblePanel>
    );
}
