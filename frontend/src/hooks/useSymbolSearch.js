import { useEffect, useState } from 'react';
import MarketService from '../services/market.service';

export function useSymbolSearch(q) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const term = (q || '').trim();
        const t = setTimeout(async () => {
            if (term.length < 2) { setResults([]); setLoading(false); return; }
            setLoading(true);
            try { setResults(await MarketService.search(term)); }
            catch { setResults([]); }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    return { results, loading };
}
