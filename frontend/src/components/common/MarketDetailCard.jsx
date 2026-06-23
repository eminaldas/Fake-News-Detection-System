import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import axiosInstance from '../../api/axios';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const RANGES = [
    { key: '1g', label: '1G' },
    { key: '1h', label: '1H' },
    { key: '1a', label: '1A' },
];

function fmt(v, currency) {
    if (v == null) return '—';
    const unit = currency === 'USD' ? '$' : currency === 'TRY' ? '₺' : '';
    return `${unit}${Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}

function Sparkline({ data }) {
    if (!data || data.length < 2) return <div style={{ height: 64 }} />;
    const w = 280, h = 64, min = Math.min(...data), max = Math.max(...data);
    const span = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - 6 - ((v - min) / span) * (h - 12);
        return [x, y];
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${w},${h} L0,${h} Z`;
    const up = data[data.length - 1] >= data[0];
    const col = up ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)';
    return (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={col} stopOpacity="0.28" />
                    <stop offset="1" stopColor={col} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#spk)" />
            <path d={line} fill="none" stroke={col} strokeWidth="2" />
        </svg>
    );
}

export default function MarketDetailCard({ symbol, onEnter, onLeave }) {
    const [range, setRange] = useState('1g');
    const [data, setData]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        const run = async () => {
            setLoading(true);
            setError(false);
            try {
                const r = await axiosInstance.get(`/market/detail/${encodeURIComponent(symbol)}`, { params: { range } });
                if (!alive) return;
                if (r.data?.error) setError(true); else setData(r.data);
            } catch {
                if (alive) setError(true);
            } finally {
                if (alive) setLoading(false);
            }
        };
        run();
        return () => { alive = false; };
    }, [symbol, range]);

    const up = data && data.change_pct >= 0;
    const chgColor = up ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)';

    return (
        <div className="border animate-fade-up"
             style={{ ...TS, position: 'relative', width: 300, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
             onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand" />

            {error ? (
                <div className="px-4 py-6 font-mono text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                    veri alınamadı
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2.5 px-4 py-3">
                        <div className="min-w-0">
                            <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {data?.name ?? symbol}
                            </div>
                            <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{symbol}</div>
                        </div>
                        <div className="ml-auto text-right">
                            <div className="font-mono font-black text-base" style={{ color: 'var(--color-text-primary)' }}>
                                {loading ? '…' : fmt(data?.price, data?.currency)}
                            </div>
                            {data && (
                                <span className="font-mono text-[11px] font-bold inline-flex items-center gap-1" style={{ color: chgColor }}>
                                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(data.change_pct).toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="px-3 pb-2">
                        <div className="flex gap-1 mb-1.5">
                            {RANGES.map(r => (
                                <button key={r.key} type="button" onClick={() => setRange(r.key)}
                                        className="font-mono text-[10px] px-2 py-0.5 border transition-colors"
                                        style={range === r.key
                                            ? { background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)', borderColor: 'var(--color-brand-primary)' }
                                            : { color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <Sparkline data={data?.spark} />
                    </div>

                    <div className="grid grid-cols-2 border-t" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                        {[
                            ['AÇILIŞ', data?.open], ['ÖNC. KAPANIŞ', data?.prev_close],
                            ['GÜN YÜKSEK', data?.day_high], ['GÜN DÜŞÜK', data?.day_low],
                        ].map(([lbl, val], i) => (
                            <div key={lbl} className="px-3 py-2"
                                 style={{ borderRight: i % 2 === 0 ? '1px solid var(--color-terminal-border-raw)' : 'none', borderTop: i >= 2 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                                <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{lbl}</div>
                                <div className="font-mono text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{fmt(val, data?.currency)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 font-mono text-[10px]">
                        <span style={{ color: 'var(--color-text-muted)' }}>Yahoo Finance · gecikmeli</span>
                        <Link to="/borsa" className="font-bold" style={{ color: 'var(--color-brand-primary)' }}>Borsa'da gör →</Link>
                    </div>
                </>
            )}
        </div>
    );
}
