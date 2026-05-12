import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MarketService from '../services/market.service';

const DEFAULT_TICKERS = ['USD', 'EUR', 'BIST 100'];
const MAX_TICKERS     = 12;
const LS_KEY          = 'market_tickers';

export function useMarketPrefs() {
    const { user, isAuthenticated } = useAuth();

    const getInitial = () => {
        if (isAuthenticated && user?.preferences?.market_tickers?.length) {
            return user.preferences.market_tickers;
        }
        try {
            const stored = localStorage.getItem(LS_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_TICKERS;
        } catch {
            return DEFAULT_TICKERS;
        }
    };

    const [tickers, setTickers] = useState(getInitial);
    const [saving,  setSaving]  = useState(false);

    // Sync when user logs in/out
    useEffect(() => {
        if (isAuthenticated && user?.preferences?.market_tickers?.length) {
            setTickers(user.preferences.market_tickers);
        } else if (!isAuthenticated) {
            try {
                const stored = localStorage.getItem(LS_KEY);
                setTickers(stored ? JSON.parse(stored) : DEFAULT_TICKERS);
            } catch {
                setTickers(DEFAULT_TICKERS);
            }
        }
    }, [user, isAuthenticated]);

    const toggle = useCallback(async (symbol) => {
        const isPresent = tickers.includes(symbol);
        const next = isPresent
            ? tickers.filter(t => t !== symbol)
            : tickers.length >= MAX_TICKERS
                ? tickers
                : [...tickers, symbol];

        if (next === tickers) return; // at max, no change

        const prev = tickers;
        setTickers(next); // optimistic update

        if (isAuthenticated) {
            setSaving(true);
            try {
                await MarketService.savePrefs(next);
            } catch {
                setTickers(prev); // rollback on error
            } finally {
                setSaving(false);
            }
        } else {
            localStorage.setItem(LS_KEY, JSON.stringify(next));
        }
    }, [tickers, isAuthenticated]);

    const isActive = useCallback((symbol) => tickers.includes(symbol), [tickers]);
    const atMax    = tickers.length >= MAX_TICKERS;

    return { tickers, toggle, saving, isActive, atMax };
}
