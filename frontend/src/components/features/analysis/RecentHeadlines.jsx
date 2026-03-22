import React, { useEffect, useState } from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import RecentHeadlinesSkeleton from './RecentHeadlinesSkeleton';

const RecentHeadlines = () => {
    const [headlines, setHeadlines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance
            .get('/articles/trending')
            .then((res) => setHeadlines(res.data.filter((h) => !!h.source_url)))
            .catch(() => setHeadlines([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <RecentHeadlinesSkeleton />;

    return (
        <div className="bg-surface rounded-2xl overflow-hidden border border-brutal-border dark:border-surface-solid animate-fade-left">

            {/* Başlık */}
            <div className="px-4 py-3 border-b border-brutal-border dark:border-surface-solid flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-authentic-fill shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-tx-primary">
                    Günlük Trendler
                </span>
            </div>

            {/* Liste */}
            <div className="divide-y divide-brutal-border/40 dark:divide-surface-solid/60">
                {headlines.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-tx-secondary">
                        Henüz trend yok
                    </p>
                ) : (
                    headlines.map((item) => (
                        <a
                            key={item.id}
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-1.5 px-4 py-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                        >
                            {(item.source_domain || item.source_name) && (
                                <span className="text-[10px] font-semibold text-tx-secondary uppercase tracking-wide">
                                    {item.source_domain || item.source_name}
                                </span>
                            )}
                            <p className="text-[13px] font-medium leading-snug text-tx-primary line-clamp-2 group-hover:text-brand dark:group-hover:text-tx-primary transition-colors">
                                {item.title}
                            </p>
                            <span className="flex items-center gap-1 text-[10px] text-tx-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight className="w-3 h-3" />
                                Habere git
                            </span>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
};

export default RecentHeadlines;
