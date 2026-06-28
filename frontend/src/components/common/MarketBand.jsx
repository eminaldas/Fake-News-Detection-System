import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../../services/market.service';
import WeatherWidget from './WeatherWidget';
import CornerBrackets from './CornerBrackets';
import MarketDetailCard from './MarketDetailCard';
import { useMarketPrefs } from '../../hooks/useMarketPrefs';

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

function MarketItem({ label, unit, decimals, value, changePct, symbol, onHover, onLeave }) {
    const chg      = changePct !== null && changePct !== undefined ? changePct : null;
    const isUp     = chg !== null && chg > 0;
    const isDown   = chg !== null && chg < 0;
    const chgColor = isUp
        ? 'var(--color-market-up)'
        : isDown
            ? 'var(--color-market-down)'
            : 'var(--color-market-flat)';

    return (
        <span className="flex items-center gap-1.5 font-mono shrink-0 cursor-pointer"
              onMouseEnter={e => onHover?.(symbol, e)}
              onMouseLeave={onLeave}>
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

    const [hovered, setHovered] = React.useState(null);   // { symbol, left } | null
    const closeTimer = React.useRef(null);
    const openCard = (symbol, e) => {
        clearTimeout(closeTimer.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setHovered({ symbol, left: Math.min(Math.max(rect.left, 8), window.innerWidth - 308) });
    };
    const scheduleClose = () => { closeTimer.current = setTimeout(() => setHovered(null), 120); };
    const keepOpen = () => clearTimeout(closeTimer.current);

    React.useEffect(() => {
        const load = () => {
            MarketService.getRates().then(setRates).catch(() => {});
            MarketService.getStocks().then(setStocks).catch(() => {});
        };
        load();
        const id = setInterval(load, 60_000);
        return () => clearInterval(id);
    }, []);

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
                    symbol:    key,
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
                symbol:    s.symbol,
            };
        }
        return m;
    }, [rates, stocks]);

    const items      = tickers.map(sym => dataMap[sym]).filter(Boolean);
    const useMarquee = items.length > 4;

    // Kesintisiz akış (piksel tabanlı): bir "grubun" gerçek genişliğini ölç,
    // animasyonu tam o kadar kaydır (translateX(-gw)). Kayma mesafesi her zaman
    // tam bir grup olduğundan, grup #2 grup #1'in başladığı yere birebir oturur
    // → tur dönüşünde ne boşluk ne zıplama olur. Görünür alanı garanti doldurmak
    // için yeterli sayıda grup basılır; kopya sayısı dikişi etkilemez.
    const viewportRef = React.useRef(null);
    const groupRef    = React.useRef(null);     // ilk grup — genişlik ölçümü için
    const [shift, setShift] = React.useState(0); // bir grubun px genişliği
    const [reps,  setReps]  = React.useState(2); // görünür alanı dolduran grup sayısı

    React.useLayoutEffect(() => {
        if (!useMarquee) return;
        const measure = () => {
            const vp = viewportRef.current;
            const g  = groupRef.current;
            if (!vp || !g) return;
            const gw = g.getBoundingClientRect().width;   // trailing margin dahil
            if (!gw) return;
            setShift(gw);
            setReps(Math.max(2, Math.ceil(vp.clientWidth / gw) + 1));
        };
        measure();
        const t = setTimeout(measure, 300);               // fontlar geç yüklenirse
        window.addEventListener('resize', measure);
        if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
        return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
    }, [items.length, useMarquee]);

    // Hız sabit (px/sn) → süre, ölçülen grup genişliğiyle (shift) orantılı.
    // Eski bug: süre ilk öğe sayısına sabitliydi; öğeler sonradan yüklenip grup
    // genişleyince mesafe büyüyor ama süre aynı kalıyor → marquee hızlanıyordu.
    const SPEED_PX_S = 45;
    const duration   = `${Math.max((shift || 600) / SPEED_PX_S, 12)}s`;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[60] h-8 flex items-center"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
            <div className="w-full flex items-stretch h-full">

                {/* SOL — market kutusu (kendi çentikleri) */}
                <div className="relative flex-1 min-w-0 flex items-center gap-4 overflow-hidden px-3"
                     style={{ background: 'var(--color-market-box-bg)' }}>
                    <CornerBrackets color="#47b172" length={12} thickness={2} />

                    <Link to="/borsa" className="flex items-center gap-1.5 font-mono shrink-0 hover:opacity-70 transition-opacity">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                              style={{ background: 'var(--color-market-sys)' }} />
                        <span className="text-[10px] font-bold tracking-widest hidden sm:block"
                              style={{ color: 'var(--color-market-sys)' }}>
                            PİYASA
                        </span>
                    </Link>

                    <span className="h-3 w-px shrink-0"
                          style={{ background: 'var(--color-terminal-border-raw)' }} />

                    {useMarquee ? (
                        <div ref={viewportRef} className="flex-1 overflow-hidden">
                            <div
                                className="flex animate-marquee"
                                style={{ '--mq-shift': `${shift}px`, animationDuration: duration, willChange: 'transform', animationPlayState: hovered ? 'paused' : 'running' }}
                            >
                                {Array.from({ length: reps }).map((_, c) => (
                                    <div key={c} ref={c === 0 ? groupRef : undefined} className="flex shrink-0">
                                        {items.map((item, i) => (
                                            <div key={i} className="shrink-0" style={{ marginRight: '2rem' }}>
                                                <MarketItem {...item} onHover={openCard} onLeave={scheduleClose} />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center" style={{ gap: '1.25rem' }}>
                            {items.map((item, i) => (
                                <MarketItem key={i} {...item} onHover={openCard} onLeave={scheduleClose} />
                            ))}
                        </div>
                    )}
                </div>

                {/* SAĞ — hava durumu kutusu */}
                <WeatherWidget />
            </div>

            {/* Hover detay kartı */}
            {hovered && (
                <div className="fixed z-[70]" style={{ top: 34, left: hovered.left }}
                     onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
                    <MarketDetailCard symbol={hovered.symbol} onEnter={keepOpen} onLeave={scheduleClose} />
                </div>
            )}
        </div>
    );
};

export default MarketBand;
