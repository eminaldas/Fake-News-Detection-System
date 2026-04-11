import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { useAuth } from './contexts/AuthContext';
import AuthService from './services/auth.service';
import wsService from './services/websocket';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileLayout        from './features/profile/ProfileLayout';
import ProfileOverview      from './features/profile/ProfileOverview';
import ProfileAiLab         from './features/profile/ProfileAiLab';
import ProfileSecurity      from './features/profile/ProfileSecurity';
import ProfileNotifications from './features/profile/ProfileNotifications';
import ProfileFeedback      from './features/profile/ProfileFeedback';
import AdminUsers from './pages/AdminUsers';
import AdminSecurity from './pages/AdminSecurity';
import AdminAnalytics from './pages/AdminAnalytics';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Gundem from './pages/Gundem';

// Listens to auth state and manages the WS connection lifecycle
function WsLifecycle() {
    const { isAuthenticated } = useAuth();
    useEffect(() => {
        if (isAuthenticated) {
            const token = AuthService.getToken();
            if (token) wsService.connect(token);
        } else {
            wsService.disconnect();
        }
    }, [isAuthenticated]);
    return null;
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <WebSocketProvider>
                <WsLifecycle />
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Home />} />
                            <Route path="archive"    element={<Archive />} />
                            <Route path="hakkimizda" element={<About />} />
                            <Route path="gundem"     element={<Gundem />} />
                            <Route path="login"      element={<Login />} />
                            <Route path="register"   element={<Register />} />

                            {/* Giriş yapılmış kullanıcı */}
                            <Route path="profile" element={<RequireAuth><ProfileLayout /></RequireAuth>}>
                                <Route index element={<Navigate to="overview" replace />} />
                                <Route path="overview"      element={<ProfileOverview />} />
                                <Route path="ai-lab"        element={<ProfileAiLab />} />
                                <Route path="security"      element={<ProfileSecurity />} />
                                <Route path="notifications" element={<ProfileNotifications />} />
                                <Route path="feedback"      element={<ProfileFeedback />} />
                            </Route>

                            {/* Admin */}
                            <Route path="admin" element={
                                <RequireAuth><Dashboard /></RequireAuth>
                            } />
                            <Route path="admin/users" element={
                                <RequireAuth><AdminUsers /></RequireAuth>
                            } />
                            <Route path="admin/security" element={
                                <RequireAuth><AdminSecurity /></RequireAuth>
                            } />
                            <Route path="admin/analytics" element={
                                <RequireAuth><AdminAnalytics /></RequireAuth>
                            } />

                            <Route path="*" element={<NotFound />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
                </WebSocketProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
