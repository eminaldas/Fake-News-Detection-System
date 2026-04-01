import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import NamazService from '../../../services/namaz.service';

const PRAYERS = [
    { key: 'Fajr',    label: 'Sabah'   },
    { key: 'Dhuhr',   label: 'Öğle'    },
    { key: 'Asr',     label: 'İkindi'  },
    { key: 'Maghrib', label: 'Akşam'   },
    { key: 'Isha',    label: 'Yatsı'   },
];

function toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function findNext(timings) {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    for (const p of PRAYERS) {
        if (toMinutes(timings[p.key]) > cur) return p.key;
    }
    return PRAYERS[0].key; // gece yarısından sonra → sabah
}

const NamazCard = () => {
    const [timings, setTimings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        NamazService.getTimings()
            .then(t => setTimings(t))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const nextKey = timings ? findNext(timings) : null;

    return (
        <div className="rounded-2xl overflow-hidden border border-brutal-border dark:border-surface-solid bg-surface">
            <div className="px-4 py-3 border-b border-brutal-border dark:border-surface-solid flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-es-primary shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest text-tx-primary">Namaz Vakitleri</span>
                </div>
                <span className="text-[10px] text-tx-secondary/50">İstanbul</span>
            </div>

            <div className="divide-y divide-brutal-border/40 dark:divide-surface-solid/60">
                {loading ? (
                    [1,2,3,4,5].map(i => (
                        <div key={i} className="px-4 py-2.5 flex justify-between">
                            <div className="h-3 w-14 rounded bg-brutal-border/40 animate-pulse" />
                            <div className="h-3 w-10 rounded bg-brutal-border/40 animate-pulse" />
                        </div>
                    ))
                ) : timings ? (
                    PRAYERS.map(p => {
                        const isNext = p.key === nextKey;
                        return (
                            <div key={p.key}
                                 className={`px-4 py-2.5 flex items-center justify-between ${isNext ? 'bg-es-primary/10 dark:bg-es-primary/8' : ''}`}>
                                <div className="flex items-center gap-2">
                                    {isNext && <span className="w-1.5 h-1.5 rounded-full bg-es-primary animate-pulse-soft shrink-0" />}
                                    <span className={`text-xs font-bold ${isNext ? 'text-es-primary' : 'text-tx-primary'}`}>
                                        {p.label}
                                    </span>
                                    {isNext && <span className="text-[9px] text-es-primary/70 uppercase tracking-wider">Sonraki</span>}
                                </div>
                                <span className={`text-xs font-manrope font-black tabular-nums ${isNext ? 'text-es-primary' : 'text-tx-primary'}`}>
                                    {timings[p.key]}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <p className="px-4 py-6 text-center text-xs text-tx-secondary">Veri alınamadı</p>
                )}
            </div>

            <div className="px-4 py-2 text-right">
                <span className="text-[9px] text-tx-secondary/30 uppercase tracking-widest">aladhan.com</span>
            </div>
        </div>
    );
};

export default NamazCard;
