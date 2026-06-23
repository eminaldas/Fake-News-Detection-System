import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X } from 'lucide-react';
import MarketService from '../../../services/market.service';
import SymbolRow from './SymbolRow';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function inferType(sym) {
    if (sym.endsWith('-USD')) return 'Kripto';
    if (sym.endsWith('=X')) return 'Döviz';
    if (sym.endsWith('.IS')) return 'BIST';
    if (sym === 'gram-altin' || sym === 'BIST 100' || sym === 'USD' || sym === 'EUR') return 'Döviz';
    return 'Hisse';
}

export default function WatchlistModal({ tickers, toggle, onClose }) {
    const [info, setInfo] = useState({});
    const [filter, setFilter] = useState('');

    useEffect(() => {
        let alive = true;
        Promise.allSettled(tickers.map(s => MarketService.getAnalysis(s, '1g').then(d => [s, d])))
            .then(rs => {
                if (!alive) return;
                const m = {};
                rs.forEach(r => { if (r.status === 'fulfilled' && r.value[1] && !r.value[1].error) m[r.value[0]] = r.value[1]; });
                setInfo(m);
            });
        return () => { alive = false; };
    }, [tickers]);

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const shown = tickers.filter(s => s.toLowerCase().includes(filter.trim().toLowerCase()));

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
             style={{ background: 'rgba(13,43,26,0.45)' }} onMouseDown={onClose}>
            <div className="relative w-full max-w-md border animate-fade-up"
                 style={{ ...TS, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }} onMouseDown={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand" />
                <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand" />
                <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand" />
                <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand" />

                <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                    <span className="font-extrabold text-[15px]" style={{ color: 'var(--color-text-primary)' }}>
                        ★ İzleme Listem <span className="font-normal text-[12px]" style={{ color: 'var(--color-text-muted)' }}>({tickers.length})</span>
                    </span>
                    <button onClick={onClose} className="ml-auto" aria-label="Kapat">
                        <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                </div>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="listede ara…"
                           className="w-full px-3 py-2 border font-mono text-[12px] outline-none"
                           style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }} />
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                    {shown.length === 0 ? (
                        <div className="px-4 py-6 font-mono text-[12px] text-center" style={{ color: 'var(--color-text-muted)' }}>sonuç yok</div>
                    ) : shown.map(s => {
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
                </div>
            </div>
        </div>,
        document.body
    );
}
