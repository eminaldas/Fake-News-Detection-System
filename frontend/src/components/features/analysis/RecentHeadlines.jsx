import React, { useEffect, useState } from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import axiosInstance from '../../../api/axios';

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
        <div className="relative bg-surface dark:bg-[#0c1518] border border-brutal-border dark:border-[#41494d]/60 animate-fade-left overflow-hidden">

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-brutal-border dark:border-[#41494d]/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-brand dark:text-es-primary shrink-0" />
                    <span className="font-mono font-bold text-[10px] uppercase tracking-widest text-tx-primary">
                        Günlük Trendler
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand dark:bg-es-primary animate-pulse shrink-0" />
                    <span className="font-mono text-[10px] text-brand dark:text-es-primary tracking-widest">[ TREND ]</span>
                </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-brutal-border/40 dark:divide-[#41494d]/30">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="px-4 py-3 space-y-1.5 animate-pulse border-l-2 border-brand/15 dark:border-es-primary/15">
                            <div className="h-2 bg-brutal-border/20 dark:bg-[#41494d]/20 w-1/3" />
                            <div className="h-3 bg-brutal-border/30 dark:bg-[#41494d]/30 w-full" />
                            <div className="h-3 bg-brutal-border/20 dark:bg-[#41494d]/20 w-3/4" />
                        </div>
                    ))
                ) : headlines.length === 0 ? (
                    <p className="px-4 py-8 text-center font-mono text-[10px] text-tx-secondary/60">
                        // NO_TRENDS_FOUND
                    </p>
                ) : (
                    headlines.map(item => (
                        <a
                            key={item.id}
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-1.5 px-4 py-3 transition-colors border-l-2
                                       border-brand/25 dark:border-es-primary/25
                                       hover:border-brand dark:hover:border-es-primary
                                       hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                        >
                            {(item.source_domain || item.source_name) && (
                                <span className="font-mono text-[9px] text-tx-secondary/60 tracking-wide">
                                    [{item.source_domain || item.source_name}]
                                </span>
                            )}
                            <p className="text-[12px] leading-snug text-tx-primary line-clamp-2
                                          group-hover:text-brand dark:group-hover:text-es-primary transition-colors">
                                {item.title}
                            </p>
                            <span className="flex items-center gap-1 font-mono text-[9px] text-brand/60 dark:text-es-primary/60
                                             opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight className="w-3 h-3" />
                                habere_git →
                            </span>
                        </a>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-brutal-border/50 dark:border-[#41494d]/30 flex justify-between items-center">
                <span className="font-mono text-[9px] text-tx-secondary/40">// RSS_FEED_ACTIVE</span>
                <span className="font-mono text-[9px] text-brand/50 dark:text-es-primary/50">v2.4</span>
            </div>
        </div>
    );
};

export default RecentHeadlines;
