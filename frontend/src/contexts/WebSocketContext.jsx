/**
 * frontend/src/contexts/WebSocketContext.jsx
 * React context — WebSocketService'i bileşenlere sunar.
 *
 * Kullanım:
 *   const { connected, subscribe } = useWebSocket();
 *   const unsub = subscribe('analysis_complete', handler);
 *   return unsub; // cleanup
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import wsService from '../services/websocket';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const unsubOpen  = wsService.subscribe('reconnected', () => setConnected(true));
        return () => {
            unsubOpen();
        };
    }, []);

    const value = {
        connected,
        subscribe: wsService.subscribe.bind(wsService),
    };

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
