import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../services/market.service';
import WeatherWidget from './WeatherWidget';
import { useMarketPrefs } from '../../hooks/useMarketPrefs';

// Truncgil key → display meta
const RATE_META = {
    'USD':        { label: 'USD/TRY', unit: '₺', decimals: 2 },
    'EUR':        { label: 'EUR/TRY', unit: '₺', decimals: 2 },
    'gram-altin': { label: 'ALTIN',   unit: '₺', decimals: 0 },
    'BIST 100':   { label: 'BIST',    unit: '',  decimals: 0 },
};

function parseChange(raw) {
    if (raw == null || raw === '') return null;
    const val = parseFloat(String(raw).replace('%', '').replace(',', '.'));
    return isNaN(val) ? null : val;
}

function MarketItem({ label, unit, decimals, value, changePct }) {
    const chg      = changePct !== null && changePct !== undefined ? changePct : null;
    const isUp     = chg !== null && chg > 0;
    const isDown   = chg !== null && chg < 0;
    const chgColor = isUp ? '#3fff8b' : isDown ? '#ff7351' : 'rgba(255,255,255,0.45)';

    return (
        <span className="flex items-center gap-1.5 font-mono shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--color-market-label)' }}>
                {label}
            </span>
            <span className="text-[13px] font-bold"
                  style={{ color: 'var(--color-market-value)' }}>
                {value != null
                    ? `${unit}${Number(value).toLocaleString('tr-TR', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                      })}`
                    : '—'}
            </span>
            {chg !== null && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: chgColor }}>
                    {isUp   ? <TrendingUp   className="w-3 h-3" /> :
                     isDown ? <TrendingDown className="w-3 h-3" /> : null}
                    {Math.abs(chg).toFixed(2)}%
                </span>
            )}
        </span>
    );
}

const MarketBand = () => {
    const [rates,  setRates]  = React.useState({});
    const [stocks, setStocks] = React.useState([]);
    const { tickers } = useMarketPrefs();

    React.useEffect(() => {
        const load = () => {
            MarketService.getRates().then(setRates).catch(() => {});
            MarketService.getStocks().then(setStocks).catch(() => {});
        };
        load();
        const id = setInterval(load, 60_000);
        return () => clearInterval(id);
    }, []);

    // Build unified symbol → display-data map
    const dataMap = React.useMemo(() => {
        const m = {};
        for (const [key, meta] of Object.entries(RATE_META)) {
            const entry = rates[key];
            if (entry) {
                m[key] = {
                    label:     meta.label,
                    unit:      meta.unit,
                    decimals:  meta.decimals,
                    value:     entry.sell,
                    changePct: parseChange(entry.change),
                };
            }
        }
        for (const s of stocks) {
            m[s.symbol] = {
                label:     s.symbol.replace('.IS', ''),
                unit:      '₺',
                decimals:  2,
                value:     s.price,
                changePct: s.change_pct,
            };
        }
        return m;
    }, [rates, stocks]);

    const items      = tickers.map(sym => dataMap[sym]).filter(Boolean);
    const useMarquee = items.length > 4;
    // duration ilk veri yüklenince sabitlenir; sonraki refresh'lerde değişmez.
    const [stableCount, setStableCount] = React.useState(0);
    React.useEffect(() => {
        if (items.length > 0 && stableCount === 0) setStableCount(items.length);
    }, [items.length, stableCount]);
    const duration = `${Math.max((stableCount || items.length) * 3, 12)}s`;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[60] h-10 flex items-center px-6"
            style={{
                background:   'var(--color-market-band-bg)',
                borderBottom: '1px solid var(--color-terminal-border-raw)',
            }}
        >
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">

                {/* Left: SYS badge + market items */}
                <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
                    <Link to="/borsa" className="flex items-center gap-1.5 font-mono shrink-0 hover:opacity-70 transition-opacity">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                              style={{ background: 'var(--color-market-sys)' }} />
                        <span className="text-[10px] font-bold tracking-widest hidden sm:block"
                              style={{ color: 'var(--color-market-sys)' }}>
                            SYS.ONLINE
                        </span>
                    </Link>

                    <span className="h-3 w-px shrink-0"
                          style={{ background: 'var(--color-terminal-border-raw)' }} />

                    {useMarquee ? (
                        <div className="flex-1 overflow-hidden">
                            <div
                                className="flex animate-marquee"
                                style={{ gap: '2rem', animationDuration: duration, willChange: 'transform' }}
                            >
                                {[...items, ...items].map((item, i) => (
                                    <MarketItem key={i} {...item} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center" style={{ gap: '1.25rem' }}>
                            {items.map((item, i) => (
                                <MarketItem key={i} {...item} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sağ: Hava durumu */}
                <div className="shrink-0">
                    <WeatherWidget />
                </div>
            </div>
        </div>
    );
};

export default MarketBand;
