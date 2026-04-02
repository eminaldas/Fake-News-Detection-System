import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../../services/market.service';

const TILES = [
    { key: 'USD',        label: 'Dolar',       unit: '₺', decimals: 2 },
    { key: 'EUR',        label: 'Euro',         unit: '₺', decimals: 2 },
    { key: 'gram-altin', label: 'Gram Altın',   unit: '₺', decimals: 0 },
    { key: 'BIST 100',   label: 'BIST 100',     unit: '',  decimals: 0 },
];

const ACCENT = '#54E0FD';

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
            style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(84,224,253,0.10)' }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: `${ACCENT}99` }}>{label}</span>
                {chg !== null && (
                    <span className={`flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5
                        ${isUp   ? 'bg-emerald-500/15 text-emerald-400' :
                          isDown ? 'bg-red-500/15 text-red-400' :
                                   'bg-white/10 text-white/40'}`}>
                        {isUp   ? <TrendingUp   className="w-2.5 h-2.5" /> :
                         isDown ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                        {Math.abs(chg).toFixed(2)}%
                    </span>
                )}
            </div>

            {loading ? (
                <div className="h-6 w-20 rounded-lg bg-white/10 animate-pulse" />
            ) : value != null ? (
                <span className="text-xl font-manrope font-black leading-none"
                      style={{ color: ACCENT }}>
                    {unit}{Number(value).toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                </span>
            ) : (
                <span className="text-xl font-manrope font-black text-white/20">—</span>
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
        <div
            className="rounded-2xl overflow-hidden relative"
            style={{
                background: 'linear-gradient(135deg, rgba(10,20,55,0.97) 0%, rgba(5,12,40,0.99) 100%)',
                border:     '1px solid rgba(84,224,253,0.18)',
                boxShadow:  '0 8px 32px rgba(84,224,253,0.07), 0 2px 8px rgba(0,0,0,0.4)',
            }}
        >
            {/* Dekoratif glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
                 style={{ background: 'rgba(84,224,253,0.10)', filter: 'blur(40px)' }} />

            {/* Başlık */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />
                    <span className="text-sm font-manrope font-bold text-white/90">Piyasalar</span>
                </div>
                <span className="text-[10px] text-white/30 font-mono">
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
                <span className="text-[9px] uppercase tracking-widest" style={{ color: `${ACCENT}30` }}>
                    truncgil.com
                </span>
            </div>
        </div>
    );
};

export default BorsaCard;
