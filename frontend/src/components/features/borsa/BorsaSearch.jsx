import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSymbolSearch } from '../../../hooks/useSymbolSearch';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

export default function BorsaSearch() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const { results, loading } = useSymbolSearch(q);
    const boxRef = useRef(null);

    useEffect(() => {
        const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const groups = results.reduce((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {});
    const go = sym => { navigate(`/borsa/${encodeURIComponent(sym)}`); setOpen(false); setQ(''); };

    return (
        <div ref={boxRef} className="relative">
            <div className="flex items-center gap-2.5 px-4 py-3 border"
                 style={{ ...TS, borderColor: open ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
                       placeholder="sembol ara — Bitcoin, THYAO, dolar, altın…"
                       className="flex-1 bg-transparent outline-none font-mono text-sm"
                       style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }} />
            </div>
            {open && q.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 border max-h-[60vh] overflow-y-auto"
                     style={{ ...TS, boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }}>
                    {loading && <div className="font-mono text-[11px] px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>aranıyor…</div>}
                    {!loading && results.length === 0 && (
                        <div className="font-mono text-[11px] px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>sembol bulunamadı</div>
                    )}
                    {Object.entries(groups).map(([type, list]) => (
                        <div key={type}>
                            <div className="font-mono text-[9px] tracking-widest px-4 pt-2.5 pb-1"
                                 style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-terminal-border-raw)' }}>
                                {type.toUpperCase()}
                            </div>
                            {list.map(r => (
                                <button key={r.symbol} type="button" onClick={() => go(r.symbol)}
                                        className="flex items-center gap-3 w-full px-4 py-2 text-left transition-colors hover:bg-white/[0.04]">
                                    <span className="font-mono font-bold text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>{r.symbol}</span>
                                    <span className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.name}</span>
                                    <span className="ml-auto font-mono text-[9px] font-bold px-1.5 py-0.5 border shrink-0"
                                          style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.25)' }}>{r.type}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
