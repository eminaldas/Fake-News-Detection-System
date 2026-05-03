import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../services/market.service';
import WeatherWidget from './WeatherWidget';

const ITEMS = [
  { key: 'BIST 100', label: 'BIST',    unit: '',  decimals: 0 },
  { key: 'USD',      label: 'USD/TRY', unit: '₺', decimals: 2 },
  { key: 'EUR',      label: 'EUR/TRY', unit: '₺', decimals: 2 },
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
  const changeColor = isUp ? '#3fff8b' : isDown ? '#ff7351' : 'rgba(255,255,255,0.35)';

  return (
    <span className="flex items-center gap-1.5 font-mono">
      <span className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
      <span className="text-[12px] font-bold text-white">
        {value != null
          ? `${unit}${Number(value).toLocaleString('tr-TR', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}`
          : '—'}
      </span>
      {chg !== null && (
        <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: changeColor }}>
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
    MarketService.getRates().then(d => setData(d)).catch(() => {});
    const id = setInterval(() => {
      MarketService.getRates().then(d => setData(d)).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center px-6"
      style={{
        background:   '#070f12',
        borderBottom: '1px solid rgba(65,73,77,0.5)',
      }}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">

        {/* Sol: SYS badge + market items */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fff8b] animate-pulse shrink-0" />
            <span className="text-[9px] font-bold tracking-widest text-[#3fff8b]/60 hidden sm:block">
              SYS.ONLINE
            </span>
          </span>

          <span className="h-3 w-px bg-[#41494d]" />

          <div className="flex items-center gap-5">
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
        </div>

        {/* Sağ: Hava durumu + versiyon */}
        <div className="flex items-center gap-3">
          <WeatherWidget />
          <span className="hidden lg:block font-mono text-[9px] tracking-widest"
                style={{ color: 'rgba(63,255,139,0.35)' }}>
            VERITAS v2.4
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarketBand;
