import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import AdminSecurity from './pages/AdminSecurity';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Gundem from './pages/Gundem';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
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
                            <Route path="profile" element={
                                <RequireAuth><Profile /></RequireAuth>
                            } />

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

                            <Route path="*" element={<NotFound />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
