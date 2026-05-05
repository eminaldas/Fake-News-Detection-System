import axiosInstance from '../api/axios';

const TOKEN_KEY  = 'fnds_token';
const REMEMBER_KEY = 'fnds_remember';

class AuthService {
    static _saveToken(token, rememberMe) {
        if (rememberMe) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(REMEMBER_KEY, 'true');
        } else {
            sessionStorage.setItem(TOKEN_KEY, token);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REMEMBER_KEY);
        }
    }

    static _decodeToken(token) {
        try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
    }

    static getToken() {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;
        const payload = this._decodeToken(token);
        if (!payload?.exp) return true;
        return Date.now() >= payload.exp * 1000;
    }

    static isTokenExpiringSoon(thresholdMs = 5 * 60 * 1000) {
        const token = this.getToken();
        if (!token) return false;
        const payload = this._decodeToken(token);
        if (!payload?.exp) return false;
        return Date.now() >= payload.exp * 1000 - thresholdMs;
    }

    static async login(username, password, rememberMe = false) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await axiosInstance.post(
            `/auth/login?remember_me=${rememberMe}`,
            formData,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data.access_token) {
            this._saveToken(response.data.access_token, rememberMe);
        }
        return response.data;
    }

    static async register(email, username, password, interests = [], marketingSource = null) {
        const response = await axiosInstance.post('/auth/register', {
            email,
            username,
            password,
            interests,
            ...(marketingSource ? { marketing_source: marketingSource } : {}),
        });
        return response.data;
    }

    static async getMe() {
        const response = await axiosInstance.get('/auth/me');
        return response.data;
    }

    static async updateMe(data) {
        const response = await axiosInstance.patch('/auth/me', data);
        return response.data;
    }

    static async getHistory(page = 1, size = 20) {
        const response = await axiosInstance.get(`/users/me/history?page=${page}&size=${size}`);
        return response.data;
    }

    static async getQuota() {
        const response = await axiosInstance.get('/users/me/quota');
        return response.data;
    }

    static logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
    }

    static async serverLogout() {
        try {
            await axiosInstance.post('/auth/logout');
        } catch { /* token zaten geçersiz olabilir */ }
        this.logout();
    }
}

export default AuthService;
