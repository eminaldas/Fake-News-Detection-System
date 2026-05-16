import { createContext, useState, useContext, useCallback } from 'react';

const STORAGE_KEY = 'cookieConsent';

const DEFAULT_STATE = { decided: false, analytics: false, personalization: false };

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_STATE;
    }
}

const CookieContext = createContext(null);

export function CookieProvider({ children }) {
    const [consent, setConsent] = useState(load);

    const persist = useCallback((next) => {
        setConsent(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }, []);

    const saveConsent = useCallback(({ analytics, personalization }) => {
        persist({ decided: true, analytics, personalization });
    }, [persist]);

    const acceptAll = useCallback(() => {
        persist({ decided: true, analytics: true, personalization: true });
    }, [persist]);

    const rejectAll = useCallback(() => {
        persist({ decided: true, analytics: false, personalization: false });
    }, [persist]);

    const resetConsent = useCallback(() => {
        // Intentionally removes the key rather than writing DEFAULT_STATE,
        // so the banner re-appears on next load as if the user never decided.
        localStorage.removeItem(STORAGE_KEY);
        setConsent(DEFAULT_STATE);
    }, []);

    return (
        <CookieContext.Provider value={{ consent, saveConsent, acceptAll, rejectAll, resetConsent }}>
            {children}
        </CookieContext.Provider>
    );
}

export function useCookie() {
    const ctx = useContext(CookieContext);
    if (!ctx) throw new Error('useCookie must be used inside CookieProvider');
    return ctx;
}
