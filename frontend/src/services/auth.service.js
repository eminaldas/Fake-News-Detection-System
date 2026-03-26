import axiosInstance from '../api/axios';

const TOKEN_KEY = 'fnds_token';
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

    static getToken() {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    }

    static isAuthenticated() {
        return !!this.getToken();
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

    static async register(email, username, password) {
        const response = await axiosInstance.post('/auth/register', {
            email,
            username,
            password,
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

    static logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
    }
}

export default AuthService;
