import React, { useEffect, useState } from 'react';
import { Flame, BarChart2 } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import HotAnalysisModal from './HotAnalysisModal';

const STATUS_COLOR = {
    FAKE:      { bg: '#ff735122', text: '#ff7351' },
    AUTHENTIC: { bg: '#3fff8b22', text: '#3fff8b' },
};

const STATUS_LABEL = {
    FAKE:      'Şüpheli',
    AUTHENTIC: 'Güvenilir',
};

export default function HotAnalysesCard() {
    const [items,        setItems]        = useState([]);
    const [hours,        setHours]        = useState(24);
    const [loading,      setLoading]      = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        axiosInstance
            .get(`/articles/trending-analyses?hours=${hours}&limit=8`)
            .then(res => setItems(res.data.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [hours]);

    const handleHoursChange = (h) => {
        setHours(h);
        setLoading(true);
    };

    return (
        <>
        <div className="bg-surface rounded-2xl overflow-hidden border border-brutal-border dark:border-surface-solid animate-fade-right">

            {/* Başlık */}
            <div className="px-4 py-3 border-b border-brutal-border dark:border-surface-solid flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest text-tx-primary">
                        En Çok Analiz Edilen
                    </span>
                </div>
                {/* Saat toggle */}
                <div className="flex items-center gap-1">
                    {[12, 24].map(h => (
                        <button
                            key={h}
                            onClick={() => handleHoursChange(h)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors
                                ${hours === h
                                    ? 'bg-brand text-white dark:bg-es-primary dark:text-black'
                                    : 'text-tx-secondary hover:text-tx-primary'
                                }`}
                        >
                            {h}s
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste */}
            <div className="divide-y divide-brutal-border/40 dark:divide-surface-solid/60">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-4 py-3.5 space-y-2 animate-pulse">
                            <div className="h-3 bg-brutal-border/30 rounded w-4/5" />
                            <div className="h-2 bg-brutal-border/20 rounded w-2/5" />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-tx-secondary">
                        Son {hours} saatte analiz verisi yok
                    </p>
                ) : (
                    items.map(item => {
                        const colors = STATUS_COLOR[item.status] || STATUS_COLOR.AUTHENTIC;
                        const label  = STATUS_LABEL[item.status] || item.status;
                        const pct    = item.confidence != null
                            ? Math.round(item.confidence * 100)
                            : null;

                        return (
                            <div
                                key={item.task_id}
                                className="flex flex-col gap-1.5 px-4 py-3.5 cursor-pointer hover:bg-surface-solid/40 transition-colors"
                                onClick={() => setSelectedItem(item)}
                            >
                                <p className="text-[13px] font-medium leading-snug text-tx-primary line-clamp-2">
                                    {item.title}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    {/* Sayaç */}
                                    <span className="flex items-center gap-1 text-[10px] text-tx-secondary">
                                        <BarChart2 className="w-3 h-3" />
                                        {item.request_count}× analiz edildi
                                    </span>
                                    {/* Verdict rozeti */}
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: colors.bg, color: colors.text }}
                                    >
                                        {label}{pct != null ? ` %${pct}` : ''}
                                    </span>
                                </div>
                                {/* Progress bar: Güvenilir oranı */}
                                {item.confidence != null && (
                                    <div className="h-1 w-full rounded-full bg-brutal-border/20 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${item.status === 'AUTHENTIC' ? pct : 100 - pct}%`,
                                                background: '#3fff8b',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {selectedItem && (
            <HotAnalysisModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
            />
        )}
        </>
    );
}
