import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AuthService from '../services/auth.service';
import axiosInstance from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser]                       = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(AuthService.isAuthenticated());

    const fetchUser = useCallback(async () => {
        try {
            const me = await AuthService.getMe();
            setUser(me);
            setIsAuthenticated(true);
            return me;
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            if (error.status === 401 || error.status === 403) {
                AuthService.logout();
            }
            return null;
        }
    }, []);

    useEffect(() => {
        if (!AuthService.isAuthenticated()) {
            setLoading(false);
            return;
        }
        if (AuthService.isTokenExpired()) {
            AuthService.logout();
            setLoading(false);
            return;
        }
        fetchUser().finally(() => setLoading(false));
    }, [fetchUser]);

    const login = async (username, password, rememberMe = false) => {
        try {
            await AuthService.login(username, password, rememberMe);
            const me = await fetchUser();
            setLoading(false);
            return { success: true, needsVerification: me ? !me.is_email_verified : false };
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    const register = async (email, username, password, termsAccepted) => {
        try {
            const data = await AuthService.register(email, username, password, termsAccepted);
            if (data.user) {
                setUser(data.user);
                setIsAuthenticated(true);
            } else {
                await fetchUser();
            }
            setLoading(false);
            return { success: true, needsVerification: data.needs_verification, needsOnboarding: data.needs_onboarding };
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    const googleLogin = async (credential) => {
        try {
            const data = await AuthService.googleLogin(credential);
            await fetchUser();
            return { success: true, needsOnboarding: data.needs_onboarding };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const completeOnboarding = async (data) => {
        try {
            const updated = await AuthService.completeOnboarding(data);
            setUser(updated);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = useCallback(() => {
        const token = AuthService.getToken();   // token'ı temizlemeden önce yakala
        AuthService.logout();                   // storage'ı hemen temizle
        setUser(null);
        setIsAuthenticated(false);
        if (token) {
            axiosInstance.post('/auth/logout', null, {
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
    }, []);

    const value = {
        user,
        isAuthenticated,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        logout,
        register,
        googleLogin,
        completeOnboarding,
        refreshUser: fetchUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
