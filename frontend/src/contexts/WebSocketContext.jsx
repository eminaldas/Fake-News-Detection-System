import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import wsService from '../services/websocket';

const WebSocketContext = createContext(null);

const wsSubscribe = wsService.subscribe.bind(wsService);

export function WebSocketProvider({ children }) {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const unsubReconnected = wsSubscribe('reconnected', () => setConnected(true));
        return () => {
            unsubReconnected();
        };
    }, []);

    const value = useMemo(() => ({
        connected,
        subscribe: wsSubscribe,
    }), [connected]);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
    return ctx;
}
