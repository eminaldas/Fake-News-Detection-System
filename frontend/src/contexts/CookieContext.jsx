import { createContext, useState, useContext, useCallback, useEffect } from 'react';

const YM_ID = 109348313;

function initMetrica() {
    if (typeof window.ym === 'function') return;
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
    })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id='+YM_ID,'ym');
    window.ym(YM_ID,'init',{ webvisor:true, trackHash:true, clickmap:true, accurateTrackBounce:true, trackLinks:true });
}

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

    useEffect(() => {
        if (consent.analytics) initMetrica();
    }, [consent.analytics]);

    const resetConsent = useCallback(() => {
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
