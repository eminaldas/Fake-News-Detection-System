import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import DepremService from '../../../services/deprem.service';

function timeAgo(ms) {
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 60)  return `${m} dk önce`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h} sa önce`;
    return `${Math.floor(h / 24)} gün önce`;
}

function magColor(mag) {
    if (mag >= 5.0) return 'bg-red-500 text-white';
    if (mag >= 4.0) return 'bg-orange-400 text-white';
    if (mag >= 3.0) return 'bg-yellow-400 text-slate-900';
    return 'bg-slate-500/40 text-tx-secondary';
}

const DepremCard = () => {
    const [quakes,  setQuakes]  = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        DepremService.getRecentQuakes()
            .then(q => setQuakes(q))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="rounded-2xl overflow-hidden border border-brutal-border dark:border-surface-solid bg-surface">
            <div className="px-4 py-3 border-b border-brutal-border dark:border-surface-solid flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-tx-primary">Deprem İzleme</span>
            </div>

            <div className="divide-y divide-brutal-border/40 dark:divide-surface-solid/60">
                {loading ? (
                    [1,2,3].map(i => (
                        <div key={i} className="px-4 py-3 flex gap-3 items-center">
                            <div className="h-6 w-8 rounded-md bg-brutal-border/40 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-2.5 w-32 rounded bg-brutal-border/40 animate-pulse" />
                                <div className="h-2 w-20 rounded bg-brutal-border/40 animate-pulse" />
                            </div>
                        </div>
                    ))
                ) : quakes.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-tx-secondary">
                        Son 24 saatte kayda değer deprem yok
                    </p>
                ) : (
                    quakes.map(q => (
                        <div key={q.id} className="px-4 py-3 flex items-center gap-3">
                            <span className={`text-[11px] font-black rounded-md px-1.5 py-0.5 shrink-0 tabular-nums ${magColor(q.mag)}`}>
                                M{q.mag.toFixed(1)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-tx-primary truncate">{q.place}</p>
                                <p className="text-[10px] text-tx-secondary mt-0.5">
                                    {timeAgo(q.time)} · {q.depth} km derinlik
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="px-4 py-2 text-right">
                <span className="text-[9px] text-tx-secondary/30 uppercase tracking-widest">usgs.gov</span>
            </div>
        </div>
    );
};

export default DepremCard;
