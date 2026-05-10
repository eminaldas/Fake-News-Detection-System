/**
 * frontend/src/services/websocket.js
 * Singleton WebSocket service — reconnect with exponential backoff.
 *
 * Kullanım:
 *   wsService.connect(token)
 *   const unsub = wsService.subscribe('analysis_complete', (payload) => { ... })
 *   unsub()
 *   wsService.disconnect()
 */

const BACKOFF_STEPS = [1000, 2000, 4000, 8000, 16000, 30000]; // ms

class WebSocketService {
    constructor() {
        this._ws         = null;
        this._token      = null;
        this._listeners  = {};   // type → Set<callback>
        this._retryCount = 0;
        this._retryTimer = null;
        this._intentional = false;  // kullanıcı logout → yeniden bağlanma
    }

    connect(token) {
        if (this._ws && (
            this._ws.readyState === WebSocket.OPEN ||
            this._ws.readyState === WebSocket.CONNECTING
        )) return;
        this._token       = token;
        this._intentional = false;
        this._open();
    }

    _open() {
        /* VITE_API_URL:
           - Dev:  tanımsız → fallback 'http://localhost:8000/api/v1'  (backend direkt)
           - Prod: '/api/v1'  (nginx proxy, relative)                   */
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
        let wsBase;
        if (apiUrl.startsWith('/')) {
            // Prod — nginx üzerinden, mevcut host'tan türet
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            wsBase = `${proto}://${window.location.host}${apiUrl}`;
        } else {
            // Dev — http → ws dönüştür
            wsBase = apiUrl.replace(/^http/, 'ws');
        }
        const url = `${wsBase}/ws?token=${this._token}`;
        this._ws  = new WebSocket(url);

        this._ws.onopen = () => {
            if (this._retryCount > 0) {
                this._emit('reconnected', {});
            }
            this._retryCount = 0;
        };

        this._ws.onmessage = (event) => {
            try {
                const { type, payload } = JSON.parse(event.data);
                this._emit(type, payload);
            } catch {
                // geçersiz JSON — yok say
            }
        };

        this._ws.onclose = () => {
            this._ws = null;
            if (this._intentional) return;
            const delay = BACKOFF_STEPS[Math.min(this._retryCount, BACKOFF_STEPS.length - 1)];
            this._retryCount++;
            this._retryTimer = setTimeout(() => this._open(), delay);
        };

        this._ws.onerror = () => {
            // onclose tetiklenecek — orada retry yapılır
        };
    }

    disconnect() {
        this._intentional = true;
        if (this._retryTimer) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
        this._token      = null;
        this._retryCount = 0;
    }

    subscribe(type, callback) {
        if (!this._listeners[type]) {
            this._listeners[type] = new Set();
        }
        this._listeners[type].add(callback);
        return () => this._listeners[type]?.delete(callback);
    }

    _emit(type, payload) {
        this._listeners[type]?.forEach(cb => {
            try { cb(payload); } catch { /* subscriber hatası izole et */ }
        });
    }
}

export default new WebSocketService();
