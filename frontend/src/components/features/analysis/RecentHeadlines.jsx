import React, { useEffect, useState } from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import axiosInstance from '../../../api/axios';

const cardStyle = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const divStyle  = { borderColor: 'var(--color-terminal-border-raw)' };

const RecentHeadlines = () => {
    const [headlines, setHeadlines] = useState([]);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        axiosInstance
            .get('/articles/trending')
            .then(res => setHeadlines(res.data.filter(h => !!h.source_url)))
            .catch(() => setHeadlines([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="relative border animate-fade-left overflow-hidden" style={cardStyle}>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between" style={divStyle}>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand shrink-0" />
                    <span className="font-mono font-bold text-xs uppercase tracking-widest text-tx-primary">
                        Günlük Trendler
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shrink-0" />
                    <span className="font-mono text-[11px] text-brand tracking-widest">[ TREND ]</span>
                </div>
            </div>

            {/* Items */}
            <div>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="px-4 py-3.5 space-y-2 animate-pulse border-b border-l-2"
                             style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: 'var(--color-brand-primary)' + '25' }}>
                            <div className="h-2.5 bg-brutal-border/20 w-1/3" />
                            <div className="h-3.5 bg-brutal-border/30 w-full" />
                            <div className="h-3.5 bg-brutal-border/20 w-3/4" />
                        </div>
                    ))
                ) : headlines.length === 0 ? (
                    <p className="px-4 py-8 text-center font-mono text-xs text-tx-secondary/60">
                        // NO_TRENDS_FOUND
                    </p>
                ) : (
                    headlines.map((item, idx) => (
                        <a
                            key={item.id}
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex flex-col gap-1.5 px-4 py-3.5 transition-colors border-l-2
                                       hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
                                       ${idx < headlines.length - 1 ? 'border-b' : ''}`}
                            style={{
                                borderColor:     'var(--color-terminal-border-raw)',
                                borderLeftColor: 'var(--color-brand-primary)' + '28',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)' + '28')}
                        >
                            {(item.source_domain || item.source_name) && (
                                <span className="font-mono text-[11px] text-tx-secondary/70 tracking-wide">
                                    [{item.source_domain || item.source_name}]
                                </span>
                            )}
                            <p className="text-sm leading-snug text-tx-primary line-clamp-2
                                          group-hover:text-brand transition-colors">
                                {item.title}
                            </p>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-brand/60
                                             opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight className="w-3 h-3" />
                                habere_git →
                            </span>
                        </a>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t flex justify-between items-center" style={divStyle}>
                <span className="font-mono text-[11px] text-tx-secondary/70">// RSS_FEED_ACTIVE</span>
                <span className="font-mono text-[11px] text-brand/70">v2.4</span>
            </div>
        </div>
    );
};

export default RecentHeadlines;
