import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RequireAuth = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user && !user.is_email_verified && location.pathname !== '/email-verification') {
        return <Navigate to="/email-verification" replace />;
    }

    return children;
};

export default RequireAuth;
