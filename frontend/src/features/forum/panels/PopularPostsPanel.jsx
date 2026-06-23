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
        <span className="font-mono text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 flex items-center gap-1"
              style={{ background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)' }}>
            <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'currentColor' }} />CANLI
        </span>
    );

    return (
        <CollapsiblePanel icon={TrendingUp} title="Popüler Gönderiler" badge={liveBadge} storageKey="popposts">
            <div className="flex flex-col">
                {items.map((t, i) => {
                    const rank = i + 1;
                    return (
                        <Link key={t.id} to={`/forum/${t.id}`}
                              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                              style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none', textDecoration: 'none' }}>
                            <span className="font-extrabold text-lg leading-none shrink-0" style={{ color: rankColor(rank) }}>{rank}</span>
                            <div className="min-w-0">
                                <p className="text-[12.5px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t.title}
                                </p>
                                <p className="font-mono text-[10px] mt-1 flex gap-2 items-center flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                                    <span>{t.total_votes ?? 0} oy</span>
                                    <span>{t.comment_count ?? 0} yorum</span>
                                    {t.is_rising && (
                                        <span className="font-extrabold px-1"
                                              style={{ color: 'var(--color-accent-amber)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)' }}>
                                            ▲ YÜKSELİŞTE
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
