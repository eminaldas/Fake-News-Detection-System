import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../../services/market.service';

const TILES = [
    { key: 'USD',        label: 'Dolar',       unit: '₺', decimals: 2 },
    { key: 'EUR',        label: 'Euro',         unit: '₺', decimals: 2 },
    { key: 'gram-altin', label: 'Gram Altın',   unit: '₺', decimals: 0 },
    { key: 'BIST 100',   label: 'BIST 100',     unit: '',  decimals: 0 },
];

function parseChange(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const val = parseFloat(String(raw).replace('%', '').replace(',', '.'));
    return isNaN(val) ? null : val;
}

function Tile({ label, unit, value, change, decimals, loading }) {
    const chg    = parseChange(change);
    const isUp   = chg !== null && chg > 0;
    const isDown = chg !== null && chg < 0;

    return (
        <div
            className="flex flex-col justify-between p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{label}</span>
                {chg !== null && (
                    <span className={`flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5
                        ${isUp   ? 'bg-emerald-500/20 text-emerald-300' :
                          isDown ? 'bg-red-500/20 text-red-300' :
                                   'bg-white/10 text-white/50'}`}>
                        {isUp   ? <TrendingUp   className="w-2.5 h-2.5" /> :
                         isDown ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                        {Math.abs(chg).toFixed(2)}%
                    </span>
                )}
            </div>

            {loading ? (
                <div className="h-7 w-20 rounded-lg animate-pulse bg-white/10" />
            ) : value != null ? (
                <span className="text-2xl font-manrope font-black leading-none text-white">
                    {unit}{Number(value).toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                </span>
            ) : (
                <span className="text-2xl font-manrope font-black text-white/30">—</span>
            )}
        </div>
    );
}

const BorsaCard = () => {
    const [data,    setData]    = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        MarketService.getRates()
            .then(d => setData(d))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0d1f1a' }}>
            {/* Başlık */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-manrope font-bold text-white">Piyasalar</span>
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                    {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* 2×2 tile grid */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                {TILES.map(t => (
                    <Tile
                        key={t.key}
                        label={t.label}
                        unit={t.unit}
                        decimals={t.decimals}
                        value={data[t.key]?.sell}
                        change={data[t.key]?.change}
                        loading={loading}
                    />
                ))}
            </div>

            <div className="px-5 pb-3 text-right">
                <span className="text-[9px] uppercase tracking-widest text-white/20">
                    truncgil.com
                </span>
            </div>
        </div>
    );
};

export default BorsaCard;
