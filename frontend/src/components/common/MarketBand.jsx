import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../services/market.service';
import WeatherWidget from './WeatherWidget';

const ITEMS = [
  { key: 'BIST 100', label: 'BIST 100', unit: '',  decimals: 0 },
  { key: 'USD',      label: 'USD/TRY',  unit: '₺', decimals: 2 },
  { key: 'EUR',      label: 'EUR/TRY',  unit: '₺', decimals: 2 },
];

function parseChange(raw) {
  if (raw == null || raw === '') return null;
  const val = parseFloat(String(raw).replace('%', '').replace(',', '.'));
  return isNaN(val) ? null : val;
}

function MarketItem({ label, unit, value, change, decimals }) {
  const chg    = parseChange(change);
  const isUp   = chg !== null && chg > 0;
  const isDown = chg !== null && chg < 0;

  const changeColor = isUp
    ? 'var(--color-brand-primary)'
    : isDown
    ? 'var(--color-fake-text)'
    : 'var(--color-text-muted)';

  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono">
      <span
        className="font-bold uppercase tracking-widest text-[9px]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {value != null
          ? `${unit}${Number(value).toLocaleString('tr-TR', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}`
          : '—'}
      </span>
      {chg !== null && (
        <span className="flex items-center gap-0.5 font-bold" style={{ color: changeColor }}>
          {isUp   ? <TrendingUp   className="w-2.5 h-2.5" /> :
           isDown ? <TrendingDown className="w-2.5 h-2.5" /> : null}
          {Math.abs(chg).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

const MarketBand = () => {
  const [data, setData] = React.useState({});

  React.useEffect(() => {
    MarketService.getRates()
      .then(d => setData(d))
      .catch(() => {});

    const interval = setInterval(() => {
      MarketService.getRates()
        .then(d => setData(d))
        .catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center px-6"
      style={{
        background:   'var(--color-market-band-bg)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          {ITEMS.map(item => (
            <MarketItem
              key={item.key}
              label={item.label}
              unit={item.unit}
              decimals={item.decimals}
              value={data[item.key]?.sell}
              change={data[item.key]?.change}
            />
          ))}
        </div>
        <WeatherWidget />
      </div>
    </div>
  );
};

export default MarketBand;
