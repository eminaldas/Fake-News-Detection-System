import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import MarketService from '../../../services/market.service';
import { useMarketPrefs } from '../../../hooks/useMarketPrefs';
import SymbolRow from './SymbolRow';
import WatchlistModal from './WatchlistModal';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function inferType(sym) {
    if (sym.endsWith('-USD')) return 'Kripto';
    if (sym.endsWith('=X')) return 'Döviz';
    if (sym.endsWith('.IS')) return 'BIST';
    if (sym === 'gram-altin' || sym === 'BIST 100' || sym === 'USD' || sym === 'EUR') return 'Döviz';
    return 'Hisse';
}

export default function WatchlistPanel() {
    const { tickers, toggle } = useMarketPrefs();
    const [info, setInfo] = useState({});
    const [modal, setModal] = useState(false);

    const first = tickers.slice(0, 3);

    useEffect(() => {
        let alive = true;
        Promise.allSettled(first.map(s => MarketService.getAnalysis(s, '1g').then(d => [s, d])))
            .then(rs => {
                if (!alive) return;
                const m = {};
                rs.forEach(r => { if (r.status === 'fulfilled' && r.value[1] && !r.value[1].error) m[r.value[0]] = r.value[1]; });
                setInfo(prev => ({ ...prev, ...m }));
            });
        return () => { alive = false; };
    }, [tickers.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="relative border" style={{ ...TS, borderLeft: '3px solid rgba(63,255,139,0.55)' }}>
            <div className="absolute top-0 left-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
            <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: 'var(--color-brand-primary)' }}>★ İZLEME LİSTEM</span>
                {tickers.length > 3 && (
                    <button type="button" onClick={() => setModal(true)}
                            className="ml-auto font-mono text-[10px]" style={{ color: 'var(--color-brand-primary)' }}>
                        Tümü ({tickers.length}) →
                    </button>
                )}
            </div>
            {tickers.length === 0 ? (
                <div className="px-4 py-5 font-mono text-[12px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Henüz yıldızladığın sembol yok.
                </div>
            ) : first.map(s => {
                const d = info[s];
                const spark = d?.series ? d.series.map(p => p.c).slice(-40) : null;
                return (
                    <SymbolRow key={s} symbol={s} name={d?.name ?? s} type={inferType(s)}
                               value={d?.price} currency={d?.currency} changePct={d?.change_pct} spark={spark}
                               star={<button type="button" onClick={e => { e.stopPropagation(); toggle(s); }} aria-label="Yıldızı kaldır">
                                        <Star className="w-4 h-4" fill="#f59e0b" style={{ color: '#f59e0b' }} />
                                     </button>} />
                );
            })}
            {modal && <WatchlistModal tickers={tickers} toggle={toggle} onClose={() => setModal(false)} />}
        </div>
    );
}
