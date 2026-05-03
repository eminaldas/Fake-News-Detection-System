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

const cardStyle  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const divStyle   = { borderColor: 'var(--color-terminal-border-raw)' };

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
        <div className="relative border animate-fade-right overflow-hidden" style={cardStyle}>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between" style={divStyle}>
                <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-brand shrink-0" />
                    <span className="font-mono font-bold text-xs uppercase tracking-widest text-tx-primary">
                        En Çok Analiz Edilen
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-es-error animate-ping shrink-0" />
                    <span className="font-mono text-[11px] text-es-error tracking-widest">[ LIVE ]</span>
                </div>
            </div>

            {/* Saat filtresi */}
            <div className="px-4 py-2 border-b flex items-center gap-2" style={divStyle}>
                {[12, 24].map(h => (
                    <button
                        key={h}
                        onClick={() => setHours(h)}
                        className={`font-mono text-[11px] tracking-widest px-2 py-0.5 transition-colors border
                            ${hours === h
                                ? 'text-brand border-brand/50'
                                : 'text-tx-secondary hover:text-tx-primary border-transparent'
                            }`}
                    >
                        [ {h}S ]
                    </button>
                ))}
            </div>

            {/* Items */}
            <div>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-4 py-4 space-y-2 animate-pulse border-b border-l-2"
                             style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: 'rgba(65,73,77,0.3)' }}>
                            <div className="h-3.5 bg-brutal-border/30 w-4/5" />
                            <div className="h-2.5 bg-brutal-border/20 w-2/5" />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                        <Sparkles className="w-6 h-6 text-brand" />
                        <p className="text-sm font-semibold text-tx-primary leading-snug">
                            Bu alanı sen doldurabilirsin
                        </p>
                        <p className="text-xs text-tx-secondary leading-relaxed">
                            Şüpheli gördüğün bir haberi analiz et — burada ilk sırada görünsün.
                        </p>
                    </div>
                ) : (
                    items.map((item, idx) => {
                        const colors = STATUS_COLORS[item.status] || STATUS_COLORS.AUTHENTIC;
                        const label  = STATUS_LABELS[item.status] || item.status;
                        const pct    = item.confidence != null ? Math.round(item.confidence * 100) : null;
                        const barPct = item.status === 'AUTHENTIC' ? pct : (pct != null ? 100 - pct : null);

                        return (
                            <div
                                key={item.task_id}
                                className={`flex flex-col gap-2 px-4 py-3.5 cursor-pointer transition-colors border-l-2 ${idx < items.length - 1 ? 'border-b' : ''}`}
                                style={{
                                    borderColor:     'var(--color-terminal-border-raw)',
                                    borderLeftColor: colors.border + '60',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderLeftColor = colors.border)}
                                onMouseLeave={e => (e.currentTarget.style.borderLeftColor = colors.border + '60')}
                                onClick={() => setSelectedItem(item)}
                            >
                                <p className="text-sm leading-snug text-tx-primary line-clamp-2">
                                    {item.title}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] text-tx-secondary">
                                        {item.request_count}× analiz edildi
                                    </span>
                                    <span className="font-mono text-[11px] font-bold" style={{ color: colors.text }}>
                                        {label}{pct != null ? ` %${pct}` : ''}
                                    </span>
                                </div>
                                {barPct != null && (
                                    <div className="h-[2px] w-full overflow-hidden"
                                         style={{ background: 'var(--color-terminal-border-raw)' }}>
                                        <div className="h-full transition-all duration-700"
                                             style={{ width: `${barPct}%`, background: colors.bar }} />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t flex justify-between items-center" style={divStyle}>
                <span className="font-mono text-[11px] text-tx-secondary/70">// SYS_MONITOR_ACTIVE</span>
                <span className="font-mono text-[11px] text-brand/70">v2.4</span>
            </div>
        </div>

        {selectedItem && (
            <HotAnalysisModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
        </>
    );
}
