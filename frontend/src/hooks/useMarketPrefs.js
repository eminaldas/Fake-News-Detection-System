import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MarketService from '../services/market.service';

const DEFAULT_TICKERS = ['USD', 'EUR', 'BIST 100'];
const MAX_TICKERS     = 12;
const LS_KEY          = 'market_tickers';

// ── Paylaşımlı durum: tüm useMarketPrefs örnekleri (MarketBand + ayar UI) anında senkron ──
let shared = null;
const listeners = new Set();

function sameList(a, b) {
    return a && b && a.length === b.length && a.every((t, i) => t === b[i]);
}

function broadcast(next) {
    if (sameList(shared, next)) return;
    shared = next;
    listeners.forEach(fn => fn(next));
}

export function useMarketPrefs() {
    const { user, isAuthenticated } = useAuth();

    const [tickers, setTickers] = useState(() => shared ?? DEFAULT_TICKERS);
    const [saving,  setSaving]  = useState(false);

    // Örnekler arası senkron — bir yerde toggle olunca hepsi güncellenir
    useEffect(() => {
        const fn = (next) => setTickers(next);
        listeners.add(fn);
        if (shared) setTickers(shared);
        return () => listeners.delete(fn);
    }, []);

    // Kaynak: auth ise user.preferences, değilse localStorage
    useEffect(() => {
        let next;
        if (isAuthenticated && user?.preferences?.market_tickers?.length) {
            next = user.preferences.market_tickers;
        } else {
            try {
                const stored = localStorage.getItem(LS_KEY);
                next = stored ? JSON.parse(stored) : DEFAULT_TICKERS;
            } catch {
                next = DEFAULT_TICKERS;
            }
        }
        broadcast(next);
    }, [user, isAuthenticated]);

    const toggle = useCallback(async (symbol) => {
        const current = shared ?? tickers;
        const isPresent = current.includes(symbol);
        const next = isPresent
            ? current.filter(t => t !== symbol)
            : current.length >= MAX_TICKERS
                ? current
                : [...current, symbol];

        if (sameList(next, current)) return; // at max, no change

        const prev = current;
        broadcast(next); // tüm örnekler (band dahil) anında — yenileme gerekmez

        if (isAuthenticated) {
            setSaving(true);
            try {
                await MarketService.savePrefs(next);
            } catch {
                broadcast(prev); // hata → geri al
            } finally {
                setSaving(false);
            }
        } else {
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        }
    }, [tickers, isAuthenticated]);

    const isActive = useCallback((symbol) => tickers.includes(symbol), [tickers]);
    const atMax    = tickers.length >= MAX_TICKERS;

    return { tickers, toggle, saving, isActive, atMax };
}
