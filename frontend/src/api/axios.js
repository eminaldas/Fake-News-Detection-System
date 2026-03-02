import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create a centralized Axios instance
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach JWT Token if available
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Global Error Handling
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Check if error is due to Unauthorized (401)
        if (error.response && error.response.status === 401) {
            // Clear token and optionally force reload to clear state and redirect to login
            localStorage.removeItem('token');
            // Uncomment below to force a strict logout transition if desired:
            // window.location.href = '/login'; 
        }

        // Format error message to be cleaner for the UI
        const customError = new Error(
            error.response?.data?.detail ||
            error.message ||
            'Bir ağ veya sunucu hatası oluştu.'
        );
        customError.status = error.response?.status;
        customError.data = error.response?.data;

        return Promise.reject(customError);
    }
);

export default axiosInstance;
