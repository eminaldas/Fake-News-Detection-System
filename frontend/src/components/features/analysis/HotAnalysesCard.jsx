import React, { useEffect, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import axiosInstance from '../../../api/axios';
import HotAnalysisModal from './HotAnalysisModal';

const STATUS_COLORS = {
    FAKE:      { border: '#ff7351', text: '#ff7351', bar: '#ff7351' },
    AUTHENTIC: { border: '#3fff8b', text: '#3fff8b', bar: '#3fff8b' },
};

const STATUS_LABELS = {
    FAKE:      'Şüpheli',
    AUTHENTIC: 'Güvenilir',
};

export default function HotAnalysesCard() {
    const [items,        setItems]        = useState([]);
    const [hours,        setHours]        = useState(24);
    const [loading,      setLoading]      = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        setLoading(true);
        axiosInstance
            .get(`/articles/trending-analyses?hours=${hours}&limit=8`)
            .then(res => setItems(res.data.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [hours]);

    return (
        <>
        <div className="relative bg-surface dark:bg-[#0c1518] border border-brutal-border dark:border-[#41494d]/60 animate-fade-right overflow-hidden">

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand dark:bg-es-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand dark:bg-es-primary pointer-events-none" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-brutal-border dark:border-[#41494d]/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-brand dark:text-es-primary shrink-0" />
                    <span className="font-mono font-bold text-[10px] uppercase tracking-widest text-tx-primary">
                        En Çok Analiz Edilen
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-es-error animate-ping shrink-0" />
                    <span className="font-mono text-[10px] text-es-error tracking-widest">[ LIVE ]</span>
                </div>
            </div>

            {/* Hour filter */}
            <div className="px-4 py-2 border-b border-brutal-border/50 dark:border-[#41494d]/30 flex items-center gap-2">
                {[12, 24].map(h => (
                    <button
                        key={h}
                        onClick={() => setHours(h)}
                        className={`font-mono text-[10px] tracking-widest px-2 py-0.5 transition-colors border
                            ${hours === h
                                ? 'text-brand dark:text-es-primary border-brand/50 dark:border-es-primary/50'
                                : 'text-tx-secondary hover:text-tx-primary border-transparent'
                            }`}
                    >
                        [ {h}S ]
                    </button>
                ))}
            </div>

            {/* Items */}
            <div className="divide-y divide-brutal-border/40 dark:divide-[#41494d]/30">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-4 py-3.5 space-y-2 animate-pulse border-l-2 border-[#41494d]/30">
                            <div className="h-3 bg-brutal-border/30 dark:bg-[#41494d]/30 w-4/5" />
                            <div className="h-2 bg-brutal-border/20 dark:bg-[#41494d]/20 w-2/5" />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                        <Sparkles className="w-5 h-5 text-brand dark:text-es-primary" />
                        <p className="text-sm font-semibold text-tx-primary leading-snug">
                            Bu alanı sen doldurabilirsin
                        </p>
                        <p className="text-xs text-tx-secondary leading-relaxed">
                            Şüpheli gördüğün bir haberi analiz et — burada ilk sırada görünsün.
                        </p>
                    </div>
                ) : (
                    items.map(item => {
                        const colors = STATUS_COLORS[item.status] || STATUS_COLORS.AUTHENTIC;
                        const label  = STATUS_LABELS[item.status] || item.status;
                        const pct    = item.confidence != null ? Math.round(item.confidence * 100) : null;
                        const barPct = item.status === 'AUTHENTIC' ? pct : (pct != null ? 100 - pct : null);

                        return (
                            <div
                                key={item.task_id}
                                className="flex flex-col gap-1.5 px-4 py-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-l-2"
                                style={{ borderLeftColor: colors.border + '60' }}
                                onMouseEnter={e => (e.currentTarget.style.borderLeftColor = colors.border)}
                                onMouseLeave={e => (e.currentTarget.style.borderLeftColor = colors.border + '60')}
                                onClick={() => setSelectedItem(item)}
                            >
                                <p className="text-[12px] leading-snug text-tx-primary line-clamp-2">
                                    {item.title}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[10px] text-tx-secondary">
                                        {item.request_count}× analiz edildi
                                    </span>
                                    <span className="font-mono text-[10px] font-bold" style={{ color: colors.text }}>
                                        {label}{pct != null ? ` %${pct}` : ''}
                                    </span>
                                </div>
                                {barPct != null && (
                                    <div className="h-[2px] w-full bg-brutal-border/20 dark:bg-[#41494d]/30 overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-700"
                                            style={{ width: `${barPct}%`, background: colors.bar }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-brutal-border/50 dark:border-[#41494d]/30 flex justify-between items-center">
                <span className="font-mono text-[9px] text-tx-secondary/40">// SYS_MONITOR_ACTIVE</span>
                <span className="font-mono text-[9px] text-brand/50 dark:text-es-primary/50">v2.4</span>
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
