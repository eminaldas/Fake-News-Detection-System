import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import MarketService from '../../../services/market.service';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function MarketSummaryCard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        let alive = true;
        MarketService.getSummary().then(d => { if (alive) setData(d); }).catch(() => {});
        return () => { alive = false; };
    }, []);

    if (!data?.available || !data.text) return null;

    return (
        <div className="relative border animate-fade-up" style={{ ...TS, borderLeft: '3px solid rgba(124,58,237,0.55)' }}>
            <div className="absolute top-0 left-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest px-4 py-3 border-b"
                 style={{ color: '#7c3aed', borderColor: 'var(--color-terminal-border-raw)' }}>
                <Sparkles className="w-3.5 h-3.5" /> GÜNÜN PİYASA ÖZETİ · AI
            </div>
            <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>
                {data.text}
            </p>
        </div>
    );
}
