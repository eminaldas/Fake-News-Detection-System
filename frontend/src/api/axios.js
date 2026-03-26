import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'fnds_token';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Request — token localStorage ve sessionStorage'dan okunur
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response — 401 ve 429 global handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        // 429 — rate limit aşıldı (global CustomEvent)
        if (error.response?.status === 429) {
            const reset = error.response.headers['x-ratelimit-reset'];
            window.dispatchEvent(
                new CustomEvent('rate-limit-exceeded', {
                    detail: {
                        reset: reset ? parseInt(reset) * 1000 : null,
                        message: error.response.data?.detail || 'Günlük limit aşıldı.',
                    },
                })
            );
        }

        const customError = new Error(
            error.response?.data?.detail ||
            error.message ||
            'Bir ağ veya sunucu hatası oluştu.'
        );
        customError.status  = error.response?.status;
        customError.data    = error.response?.data;
        customError.headers = error.response?.headers;

        return Promise.reject(customError);
    }
);

export default axiosInstance;
