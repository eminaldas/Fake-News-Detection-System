import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true); // For initial token check

    // On mount, check if token exists
    useEffect(() => {
        const checkAuth = () => {
            const hasToken = AuthService.isAuthenticated();
            setIsAuthenticated(hasToken);
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (username, password) => {
        try {
            await AuthService.login(username, password);
            setIsAuthenticated(true);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        AuthService.logout();
        setIsAuthenticated(false);
    };

    const value = {
        isAuthenticated,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
