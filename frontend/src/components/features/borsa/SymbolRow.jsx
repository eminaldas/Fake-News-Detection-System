import React from 'react';
import { useNavigate } from 'react-router-dom';

const ICON_BG = { Kripto: '#f7931a', BIST: '#1a9e4f', Döviz: '#1a9e4f', Emtia: '#d4a017', Endeks: '#627eea', Hisse: '#23292f' };

function MiniSpark({ data }) {
    if (!data || data.length < 2) return <span style={{ width: 80, display: 'inline-block' }} />;
    const w = 80, h = 26, min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - 4 - (v - min) / span * (h - 8)).toFixed(1)}`).join(' ');
    const up = data[data.length - 1] >= data[0];
    return (
        <svg width="80" height="26" viewBox="0 0 80 26">
            <polyline points={pts} fill="none"
                      stroke={up ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)'} strokeWidth="1.5" />
        </svg>
    );
}

export default function SymbolRow({ symbol, name, type = 'Hisse', value, currency, changePct, spark, star }) {
    const navigate = useNavigate();
    const up = (changePct ?? 0) >= 0;
    const unit = currency === 'USD' ? '$' : currency === 'TRY' ? '₺' : '';
    return (
        <div onClick={() => navigate(`/borsa/${encodeURIComponent(symbol)}`)}
             className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-white/[0.03]"
             style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
            <div className="w-7 h-7 shrink-0 flex items-center justify-center font-extrabold text-[11px] text-white"
                 style={{ background: ICON_BG[type] ?? '#23292f' }}>
                {(name || symbol)[0]}
            </div>
            <div className="min-w-0">
                <div className="font-bold text-[13.5px] truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</div>
                <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{symbol}</div>
            </div>
            <div className="ml-auto"><MiniSpark data={spark} /></div>
            <div className="text-right min-w-[92px]">
                <div className="font-mono font-bold text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                    {value != null ? `${unit}${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` : '—'}
                </div>
                <div className="font-mono text-[11px] font-bold"
                     style={{ color: up ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)' }}>
                    {changePct != null ? `${up ? '▲' : '▼'}${Math.abs(changePct).toFixed(2)}%` : ''}
                </div>
            </div>
            {star}
        </div>
    );
}
