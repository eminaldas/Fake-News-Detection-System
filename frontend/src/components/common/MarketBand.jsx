import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../services/market.service';
import WeatherWidget from './WeatherWidget';
import { useTheme } from '../../contexts/ThemeContext';

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

  const changeColor = isUp ? '#4ade80' : isDown ? '#f87171' : 'rgba(255,255,255,0.45)';

  return (
    <span className="flex items-center gap-2 font-mono">
      <span className="font-bold uppercase tracking-widest text-[11px] text-white/50">
        {label}
      </span>
      <span className="text-[13px] font-bold text-white">
        {value != null
          ? `${unit}${Number(value).toLocaleString('tr-TR', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}`
          : '—'}
      </span>
      {chg !== null && (
        <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: changeColor }}>
          {isUp   ? <TrendingUp   className="w-3 h-3" /> :
           isDown ? <TrendingDown className="w-3 h-3" /> : null}
          {Math.abs(chg).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

const MarketBand = () => {
  const [data, setData] = React.useState({});
  const { isDarkMode } = useTheme();

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
        background:   isDarkMode ? 'var(--color-market-band-bg)' : '#0a1510',
        borderBottom: '1px solid rgba(26,158,79,0.18)',
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
