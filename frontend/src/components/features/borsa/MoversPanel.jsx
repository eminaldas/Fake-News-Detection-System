import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketService from '../../../services/market.service';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function MoverList({ title, color, items }) {
    const navigate = useNavigate();
    return (
        <div className="relative border" style={{ ...TS, borderLeft: '3px solid rgba(63,255,139,0.45)' }}>
            <div className="absolute top-0 left-0 w-3 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3 w-[2px] bg-brand pointer-events-none" />
            <div className="font-mono text-[10px] font-bold tracking-widest px-4 py-3 border-b"
                 style={{ color, borderColor: 'var(--color-terminal-border-raw)' }}>{title}</div>
            {items.length === 0 ? (
                <div className="px-4 py-4 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>—</div>
            ) : items.map((m, i) => {
                const up = (m.change_pct ?? 0) >= 0;
                return (
                    <div key={m.symbol} onClick={() => navigate(`/borsa/${encodeURIComponent(m.symbol)}`)}
                         className="flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                         style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                        <span className="font-mono font-bold text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {(m.name || m.symbol).replace('.IS', '').replace('-USD', '')}
                        </span>
                        <span className="ml-auto font-mono text-[12px] font-bold"
                              style={{ color: up ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)' }}>
                            {up ? '+' : ''}{Number(m.change_pct).toFixed(2)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default function MoversPanel() {
    const [data, setData] = useState({ gainers: [], losers: [] });

    useEffect(() => {
        let alive = true;
        MarketService.getMovers().then(d => { if (alive) setData(d); }).catch(() => {});
        return () => { alive = false; };
    }, []);

    if (!data.gainers?.length && !data.losers?.length) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-up">
            <MoverList title="▲ EN ÇOK YÜKSELEN" color="var(--color-brand-primary)" items={data.gainers ?? []} />
            <MoverList title="▼ EN ÇOK DÜŞEN" color="var(--color-fake-fill)" items={data.losers ?? []} />
        </div>
    );
}
