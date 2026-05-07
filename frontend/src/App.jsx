import { useEffect } from 'react';
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
import ProfileBookmarks    from './features/profile/ProfileBookmarks';
import ProfileThreads     from './features/profile/ProfileThreads';
import AdminUsers from './pages/AdminUsers';
import AdminSecurity from './pages/AdminSecurity';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminForum from './pages/AdminForum';
import AdminABTest from './pages/AdminABTest';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Gundem from './pages/Gundem';
import ForumLayout        from './features/forum/ForumLayout';
import ForumFeed          from './features/forum/ForumFeed';
import ForumThread        from './features/forum/ForumThread';
import ForumCreateThread  from './features/forum/ForumCreateThread';
import SharedAnalysis    from './pages/SharedAnalysis';
import Profile          from './pages/Profile';
import UserProfile      from './pages/UserProfile';
import ProfileSettings  from './pages/ProfileSettings';
import Bookmarks        from './pages/Bookmarks';
import EmailVerification from './pages/EmailVerification';
import Onboarding       from './pages/Onboarding';
import Messages         from './pages/Messages';
import ForumSearch      from './pages/ForumSearch';
import AdminModeration  from './pages/AdminModeration';
import AdminDataset from './pages/AdminDataset';
import AnalysisReport from './pages/AnalysisReport';

// /profile → kendi profiline yönlendir
function ProfileRedirect() {
    const { user } = useAuth();
    if (!user) return null;
    return <Navigate to={`/users/${user.id}`} replace />;
}

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
                            <Route path="register"          element={<Register />} />
                            <Route path="email-verification" element={<EmailVerification />} />
                            <Route path="verify-email"       element={<EmailVerification />} />
                            <Route path="onboarding"         element={<RequireAuth><Onboarding /></RequireAuth>} />

                            {/* Kendi profili */}
                            <Route path="profile" element={<RequireAuth><ProfileRedirect /></RequireAuth>} />
                            <Route path="profile/settings" element={<RequireAuth><ProfileSettings /></RequireAuth>} />
                            <Route path="profile/bookmarks" element={<RequireAuth><ProfileLayout /></RequireAuth>}>
                                <Route index element={<ProfileBookmarks />} />
                            </Route>
                            <Route path="profile/threads" element={<RequireAuth><ProfileLayout /></RequireAuth>}>
                                <Route index element={<ProfileThreads />} />
                            </Route>

                            {/* Forum */}
                            <Route path="forum" element={<ForumLayout />}>
                                <Route index element={<ForumFeed />} />
                                <Route path="new"       element={<ForumCreateThread />} />
                                <Route path="search"    element={<ForumSearch />} />
                                <Route path=":threadId" element={<ForumThread />} />
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
                            <Route path="admin/forum" element={
                                <RequireAuth><AdminForum /></RequireAuth>
                            } />
                            <Route path="admin/ab-test" element={
                                <RequireAuth><AdminABTest /></RequireAuth>
                            } />
                            <Route path="admin/moderation" element={
                                <RequireAuth><AdminModeration /></RequireAuth>
                            } />
                            <Route path="admin/dataset" element={
                                <RequireAuth><AdminDataset /></RequireAuth>
                            } />

                            {/* Kullanıcı profili */}
                            <Route path="users/:userId" element={<UserProfile />} />

                            {/* Kaydedilenler */}
                            <Route path="bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />

                            {/* Mesajlar */}
                            <Route path="messages"          element={<RequireAuth><Messages /></RequireAuth>} />
                            <Route path="messages/:userId"  element={<RequireAuth><Messages /></RequireAuth>} />

                            {/* Paylaşılan analiz — auth gerekmez */}
                            <Route path="analysis/share/:articleId" element={<SharedAnalysis />} />

                            {/* Derin analiz raporu */}
                            <Route path="analysis/report/:taskId" element={
                                <RequireAuth><AnalysisReport /></RequireAuth>
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
