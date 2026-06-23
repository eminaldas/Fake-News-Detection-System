import React from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmtAxis = (v) => Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 0 });

function ChartTooltip({ active, payload, currency }) {
    if (!active || !payload?.length) return null;
    const unit = currency === 'USD' ? '$' : currency === 'TRY' ? '₺' : '';
    const c = payload.find(p => p.dataKey === 'c');
    return (
        <div className="border px-3 py-1.5 font-mono text-[11px]"
             style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}>
            {unit}{Number(c?.value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
        </div>
    );
}

export default function PriceChart({ series, ma20Series, currency }) {
    const data = (series || []).map((p, i) => ({ t: p.t, c: p.c, ma: ma20Series?.[i] ?? null }));
    if (data.length < 2) return <div style={{ height: 240 }} />;
    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                    <linearGradient id="px" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-terminal-border-raw)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis domain={['auto', 'auto']} width={48} tickFormatter={fmtAxis}
                       tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'var(--color-text-muted)' }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Area type="monotone" dataKey="c" stroke="var(--color-brand-primary)" strokeWidth={2}
                      fill="url(#px)" isAnimationActive animationDuration={600} />
                <Line type="monotone" dataKey="ma" stroke="#7c3aed" strokeWidth={1.4}
                      strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
