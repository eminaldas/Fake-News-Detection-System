import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import MarketService from '../services/market.service';
import { useMarketPrefs } from '../hooks/useMarketPrefs';
import { useAuth } from '../contexts/AuthContext';

const BRAND   = 'var(--color-brand-primary)';
const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';

const RATE_TILES = [
    { key: 'USD',        label: 'Dolar (USD/TRY)', unit: '₺', decimals: 2 },
    { key: 'EUR',        label: 'Euro (EUR/TRY)',  unit: '₺', decimals: 2 },
    { key: 'gram-altin', label: 'Gram Altın',      unit: '₺', decimals: 0 },
    { key: 'BIST 100',   label: 'BIST 100',        unit: '',  decimals: 0 },
];

function parseChange(raw) {
    if (raw == null || raw === '') return null;
    const val = parseFloat(String(raw).replace('%', '').replace(',', '.'));
    return isNaN(val) ? null : val;
}

function ChangeChip({ value }) {
    if (value === null) return null;
    const isUp = value > 0;
    const color = isUp ? '#3fff8b' : value < 0 ? '#ff7351' : 'var(--color-text-muted)';
    return (
        <span className="flex items-center gap-0.5 font-mono text-xs font-bold" style={{ color }}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {value > 0 ? '+' : ''}{value.toFixed(2)}%
        </span>
    );
}

function StarBtn({ symbol, isActive, onToggle, atMax, requiresAuth }) {
    const title = requiresAuth
        ? 'Kaydetmek için giriş yap'
        : atMax && !isActive
            ? 'Maksimum 12 ticker'
            : isActive ? "Band'dan kaldır" : 'Banda ekle';

    return (
        <button
            title={title}
            onClick={() => !requiresAuth && onToggle(symbol)}
            className="transition-all hover:scale-110 active:scale-95"
            style={{
                color:   isActive ? '#f59e0b' : 'var(--color-text-muted)',
                opacity: (atMax && !isActive) || requiresAuth ? 0.4 : 1,
                cursor:  requiresAuth ? 'not-allowed' : 'pointer',
            }}
        >
            <Star className="w-4 h-4" fill={isActive ? '#f59e0b' : 'none'} />
        </button>
    );
}

function Section({ title, children }) {
    return (
        <div className="relative border" style={{ background: SURFACE, borderColor: BORDER }}>
            <span className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase pointer-events-none"
                  style={{ background: SURFACE, color: BRAND }}>
                {title}
            </span>
            <div className="absolute top-0 left-0 w-4 h-[2px]" style={{ background: BRAND }} />
            <div className="absolute top-0 left-0 w-[2px] h-4" style={{ background: BRAND }} />
            <div className="absolute bottom-0 right-0 w-4 h-[2px]" style={{ background: BRAND }} />
            <div className="absolute bottom-0 right-0 w-[2px] h-4" style={{ background: BRAND }} />
            <div className="pt-6 pb-4">{children}</div>
        </div>
    );
}

function SkeletonRow() {
    return (
        <div className="flex items-center px-5 py-3 gap-4 border-b animate-pulse" style={{ borderColor: BORDER }}>
            <div className="h-3 w-16 rounded" style={{ background: BORDER }} />
            <div className="h-3 w-32 rounded flex-1" style={{ background: BORDER }} />
            <div className="h-3 w-20 rounded" style={{ background: BORDER }} />
            <div className="h-3 w-14 rounded" style={{ background: BORDER }} />
            <div className="h-4 w-4 rounded" style={{ background: BORDER }} />
        </div>
    );
}

function StockRow({ stock, isActive, toggle, atMax, isAuthenticated }) {
    const active   = isActive(stock.symbol);
    const isUp     = stock.change_pct > 0;
    const isDown   = stock.change_pct < 0;
    const chgColor = isUp ? '#3fff8b' : isDown ? '#ff7351' : 'var(--color-text-muted)';
    const label    = stock.symbol.replace('.IS', '').replace('-USD', '');
    const unit     = stock.currency === 'USD' ? '$' : '₺';

    return (
        <div className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
             style={{ borderColor: BORDER }}>
            <span className="font-mono text-xs font-black w-16 shrink-0 text-tx-primary">{label}</span>
            <span className="font-mono text-xs flex-1 min-w-0 truncate"
                  style={{ color: 'var(--color-text-secondary)' }}>
                {stock.name}
            </span>
            <span className="font-mono text-sm font-black text-tx-primary shrink-0">
                {stock.price != null
                    ? `${unit}${Number(stock.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
            </span>
            <span className="flex items-center gap-0.5 font-mono text-xs font-bold w-16 shrink-0 justify-end"
                  style={{ color: chgColor }}>
                {isUp   ? <TrendingUp   className="w-3 h-3" /> :
                 isDown ? <TrendingDown className="w-3 h-3" /> : null}
                {stock.change_pct > 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
            </span>
            <StarBtn symbol={stock.symbol} isActive={active} onToggle={toggle}
                     atMax={atMax} requiresAuth={!isAuthenticated} />
        </div>
    );
}

function StockSection({ title, items, loading, error, isActive, toggle, atMax, isAuthenticated }) {
    return (
        <Section title={title}>
            <div className="divide-y" style={{ borderColor: BORDER }}>
                {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                {error && !loading && (
                    <div className="px-5 py-4 font-mono text-sm" style={{ color: '#ff7351' }}>
                        <span className="font-black">[ ERR ]</span> {error}
                    </div>
                )}
                {!loading && !error && items.map(stock => (
                    <StockRow key={stock.symbol} stock={stock} isActive={isActive}
                              toggle={toggle} atMax={atMax} isAuthenticated={isAuthenticated} />
                ))}
            </div>
        </Section>
    );
}

export default function Borsa() {
    const [rates,        setRates]        = useState({});
    const [stocks,       setStocks]       = useState([]);
    const [ratesLoading, setRatesLoading] = useState(true);
    const [stockLoading, setStockLoading] = useState(true);
    const [stockError,   setStockError]   = useState(null);

    const { isAuthenticated } = useAuth();
    const { toggle, isActive, atMax, saving } = useMarketPrefs();

    useEffect(() => {
        MarketService.getRates()
            .then(setRates)
            .catch(() => {})
            .finally(() => setRatesLoading(false));

        MarketService.getStocks()
            .then(setStocks)
            .catch(() => setStockError('Hisse verileri alınamadı.'))
            .finally(() => setStockLoading(false));
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4" style={{ color: BRAND }} />
                    <h1 className="font-mono text-sm font-black uppercase tracking-widest text-tx-primary">
                        Piyasalar
                    </h1>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BRAND, opacity: 0.7 }}>
                </p>
                {!isAuthenticated && (
                    <p className="font-mono text-[10px] mt-2" style={{ color: '#f59e0b' }}>
                        ★ Yıldızlamak ve banda eklemek için giriş yap.
                    </p>
                )}
                {saving && (
                    <p className="font-mono text-[10px] mt-1" style={{ color: BRAND, opacity: 0.6 }}>
                        Kaydediliyor...
                    </p>
                )}
            </div>

            {/* Döviz & Emtia */}
            <Section title="// DÖVİZ_EMTIA">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mx-4" style={{ background: BORDER }}>
                    {RATE_TILES.map(tile => {
                        const entry  = rates[tile.key];
                        const chg    = parseChange(entry?.change);
                        const value  = entry?.sell;
                        const active = isActive(tile.key);

                        return (
                            <div key={tile.key} className="flex items-center justify-between p-4"
                                 style={{ background: SURFACE }}>
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                                       style={{ color: active ? '#f59e0b' : 'var(--color-text-muted)', opacity: 0.7 }}>
                                        {tile.label}
                                    </p>
                                    {ratesLoading ? (
                                        <div className="h-7 w-24 animate-pulse rounded" style={{ background: BORDER }} />
                                    ) : (
                                        <p className="font-mono text-2xl font-black text-tx-primary">
                                            {value != null
                                                ? `${tile.unit}${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: tile.decimals, maximumFractionDigits: tile.decimals })}`
                                                : '—'}
                                        </p>
                                    )}
                                    <ChangeChip value={chg} />
                                </div>
                                <StarBtn
                                    symbol={tile.key}
                                    isActive={active}
                                    onToggle={toggle}
                                    atMax={atMax}
                                    requiresAuth={!isAuthenticated}
                                />
                            </div>
                        );
                    })}
                </div>
            </Section>

            {/* BIST Hisseleri */}
            <StockSection
                title="// BIST_HİSSELERİ"
                items={stocks.filter(s => s.category === 'bist')}
                loading={stockLoading}
                error={stockError}
                isActive={isActive}
                toggle={toggle}
                atMax={atMax}
                isAuthenticated={isAuthenticated}
            />

            {/* Kripto */}
            <StockSection
                title="// KRİPTO"
                items={stocks.filter(s => s.category === 'crypto')}
                loading={stockLoading}
                error={stockError}
                isActive={isActive}
                toggle={toggle}
                atMax={atMax}
                isAuthenticated={isAuthenticated}
            />
        </div>
    );
}
