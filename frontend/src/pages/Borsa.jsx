import React, { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import MarketService from '../services/market.service';
import { useMarketPrefs } from '../hooks/useMarketPrefs';
import BorsaSearch from '../components/features/borsa/BorsaSearch';
import MarketSummaryCard from '../components/features/borsa/MarketSummaryCard';
import MoversPanel from '../components/features/borsa/MoversPanel';
import WatchlistPanel from '../components/features/borsa/WatchlistPanel';
import SymbolRow from '../components/features/borsa/SymbolRow';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

const RATE_META = {
    'USD':        { name: 'Dolar / TL', type: 'Döviz', currency: 'TRY' },
    'EUR':        { name: 'Euro / TL',  type: 'Döviz', currency: 'TRY' },
    'gram-altin': { name: 'Gram Altın', type: 'Emtia', currency: 'TRY' },
    'BIST 100':   { name: 'BIST 100',   type: 'Endeks', currency: '' },
};

const TABS = ['Tümü', 'Döviz', 'BIST', 'Kripto', 'Emtia', 'Endeks'];

function parseChange(raw) {
    if (raw == null || raw === '') return null;
    const v = parseFloat(String(raw).replace('%', '').replace(',', '.'));
    return isNaN(v) ? null : v;
}

export default function Borsa() {
    const [rates,  setRates]  = useState({});
    const [stocks, setStocks] = useState([]);
    const [cat, setCat] = useState('Tümü');
    const { isActive, toggle } = useMarketPrefs();

    useEffect(() => {
        MarketService.getRates().then(setRates).catch(() => {});
        MarketService.getStocks().then(setStocks).catch(() => {});
    }, []);

    const rows = useMemo(() => {
        const out = [];
        for (const [key, meta] of Object.entries(RATE_META)) {
            const e = rates[key];
            if (e) out.push({ symbol: key, name: meta.name, type: meta.type, value: e.sell, currency: meta.currency, changePct: parseChange(e.change) });
        }
        for (const s of stocks) {
            out.push({
                symbol: s.symbol,
                name: s.name || s.symbol,
                type: s.category === 'crypto' ? 'Kripto' : 'BIST',
                value: s.price,
                currency: s.category === 'crypto' ? 'USD' : 'TRY',
                changePct: s.change_pct,
            });
        }
        return out;
    }, [rates, stocks]);

    const filtered = cat === 'Tümü' ? rows : rows.filter(r => r.type === cat);

    const starFor = (sym) => (
        <button type="button" onClick={e => { e.stopPropagation(); toggle(sym); }} aria-label="Yıldızla">
            <Star className="w-4 h-4" fill={isActive(sym) ? '#f59e0b' : 'none'} style={{ color: '#f59e0b' }} />
        </button>
    );

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-7 flex flex-col gap-3.5">
            <h1 className="font-extrabold text-3xl tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Piyasalar<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
            </h1>

            <BorsaSearch />
            <MarketSummaryCard />

            <div className="flex gap-1.5 flex-wrap">
                {TABS.map(t => (
                    <button key={t} type="button" onClick={() => setCat(t)}
                            className="font-mono text-[12.5px] font-bold px-4 py-2 border transition-colors"
                            style={cat === t
                                ? { background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)', borderColor: 'var(--color-brand-primary)' }
                                : { ...TS, color: 'var(--color-text-muted)' }}>
                        {t}
                    </button>
                ))}
            </div>

            <MoversPanel />
            <WatchlistPanel />

            {/* Ana liste */}
            <div className="relative border" style={{ ...TS, borderLeft: '3px solid rgba(63,255,139,0.55)' }}>
                <div className="absolute top-0 left-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
                <div className="absolute top-0 left-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
                <div className="font-mono text-[11px] font-bold tracking-widest px-4 py-3 border-b"
                     style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-terminal-border-raw)' }}>
                    {cat === 'Tümü' ? 'TÜM PİYASALAR' : cat.toUpperCase()}
                </div>
                {filtered.length === 0 ? (
                    <div className="px-4 py-6 font-mono text-[12px] text-center" style={{ color: 'var(--color-text-muted)' }}>yükleniyor…</div>
                ) : filtered.map(r => (
                    <SymbolRow key={r.symbol} {...r} star={starFor(r.symbol)} />
                ))}
            </div>
        </div>
    );
}
