import axiosInstance from '../api/axios';

class AuthService {
    /**
     * Log into the admin portal and retrieve a JWT token
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise} Resolves to the access token mapping
     */
    static async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        // Login endpoint usually requires Form-Url-Encoded mapping
        const response = await axiosInstance.post('/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
        }

        return response.data;
    }

    static logout() {
        localStorage.removeItem('token');
    }

    static isAuthenticated() {
        return !!localStorage.getItem('token');
    }
}

export default AuthService;
