import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN_KEY   = 'fnds_token';
const REMEMBER_KEY = 'fnds_remember';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ── Token utilities (inline — avoids circular import with auth.service.js) ──

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function saveToken(newToken) {
    const rememberMe = !!localStorage.getItem(REMEMBER_KEY);
    if (rememberMe) localStorage.setItem(TOKEN_KEY, newToken);
    else sessionStorage.setItem(TOKEN_KEY, newToken);
}

function decodeJWT(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function isTokenExpiringSoon(token) {
    const payload = decodeJWT(token);
    if (!payload?.exp) return false;
    return Date.now() >= payload.exp * 1000 - 5 * 60 * 1000; // 5 dakika kala
}

// ── Proactive refresh state ───────────────────────────────────────────────────

let isRefreshing    = false;
let refreshPromise  = null;

async function maybeRefreshToken() {
    const token = getToken();
    if (!token || !isTokenExpiringSoon(token)) return;
    if (!isRefreshing) {
        isRefreshing   = true;
        refreshPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, null, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                saveToken(res.data.access_token);
            })
            .catch(() => {})
            .finally(() => {
                isRefreshing   = false;
                refreshPromise = null;
            });
    }
    if (refreshPromise) await refreshPromise;
}

// ── Request interceptor ───────────────────────────────────────────────────────

axiosInstance.interceptors.request.use(
    async (config) => {
        // /auth/ endpoint'leri için proaktif refresh atla
        if (!config.url?.includes('/auth/')) {
            await maybeRefreshToken();
        }
        const token = getToken();
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────────────────────────────────────

let isRedirecting = false;

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            if (!isRedirecting && window.location.pathname !== '/login') {
                isRedirecting = true;
                window.location.href = '/login';
            }
        }

        if (error.response?.status === 429) {
            const reset = error.response.headers['x-ratelimit-reset'];
            window.dispatchEvent(
                new CustomEvent('rate-limit-exceeded', {
                    detail: {
                        reset:   reset ? parseInt(reset) * 1000 : null,
                        message: error.response.data?.detail || 'Günlük limit aşıldı.',
                    },
                })
            );
        }

        const customError    = new Error(
            error.response?.data?.detail ||
            error.message ||
            'Bir ağ veya sunucu hatası oluştu.'
        );
        customError.status    = error.response?.status;
        customError.data      = error.response?.data;
        customError.headers   = error.response?.headers;
        customError.authError = error.response?.headers?.['x-auth-error'] ?? null;

        return Promise.reject(customError);
    }
);

export default axiosInstance;
