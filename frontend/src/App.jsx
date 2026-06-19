import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CookieProvider } from './contexts/CookieContext';
import { BackgroundJobsProvider } from './contexts/BackgroundJobsContext';
import ActiveJobsPill from './features/jobs/ActiveJobsPill';
import { useAuth } from './contexts/AuthContext';
import AuthService from './services/auth.service';
import wsService from './services/websocket';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import AdminLayout  from './layouts/AdminLayout';
import Layout from './components/Layout';
import Popup from './components/ui/Popup';

import Home     from './pages/Home';
import Login    from './pages/Login';
import Register from './pages/Register';

const Archive            = lazy(() => import('./pages/Archive'));
const ProfileLayout      = lazy(() => import('./features/profile/ProfileLayout'));
const ProfileOverview    = lazy(() => import('./features/profile/ProfileOverview'));
const ProfileBookmarks   = lazy(() => import('./features/profile/ProfileBookmarks'));
const ProfileThreads     = lazy(() => import('./features/profile/ProfileThreads'));
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers      = lazy(() => import('./pages/AdminUsers'));
const AdminSecurity   = lazy(() => import('./pages/AdminSecurity'));
const AdminContent    = lazy(() => import('./pages/AdminContent'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const AdminCommunity  = lazy(() => import('./pages/AdminCommunity'));
const AdminAIControl  = lazy(() => import('./pages/AdminAIControl'));
const AdminAnalytics  = lazy(() => import('./pages/AdminAnalytics'));
const AdminForum      = lazy(() => import('./pages/AdminForum'));
const AdminABTest     = lazy(() => import('./pages/AdminABTest'));
const AdminModeration = lazy(() => import('./pages/AdminModeration'));
const AdminDataset    = lazy(() => import('./pages/AdminDataset'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const NotFound           = lazy(() => import('./pages/NotFound'));
const About              = lazy(() => import('./pages/About'));
const Legal              = lazy(() => import('./pages/Legal'));
const Gundem             = lazy(() => import('./pages/Gundem'));
const Borsa              = lazy(() => import('./pages/Borsa'));
const Report             = lazy(() => import('./pages/Report'));
const ForumLayout        = lazy(() => import('./features/forum/ForumLayout'));
const ForumFeed          = lazy(() => import('./features/forum/ForumFeed'));
const ForumThread        = lazy(() => import('./features/forum/ForumThread'));
const ForumCreateThread  = lazy(() => import('./features/forum/ForumCreateThread'));
const SharedAnalysis     = lazy(() => import('./pages/SharedAnalysis'));
const Profile            = lazy(() => import('./pages/Profile'));
const UserProfile        = lazy(() => import('./pages/UserProfile'));
const ProfileSettings    = lazy(() => import('./pages/ProfileSettings'));
const Bookmarks          = lazy(() => import('./pages/Bookmarks'));
const EmailVerification  = lazy(() => import('./pages/EmailVerification'));
const Onboarding         = lazy(() => import('./pages/Onboarding'));
const Messages           = lazy(() => import('./pages/Messages'));
const ForumSearch        = lazy(() => import('./pages/ForumSearch'));
const AnalysisReport     = lazy(() => import('./pages/AnalysisReport'));
const Badges             = lazy(() => import('./pages/Badges'));
const ForgotPassword     = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword      = lazy(() => import('./pages/ResetPassword'));
const RecoverAccount     = lazy(() => import('./pages/RecoverAccount'));

function ProfileRedirect() {
    const { user } = useAuth();
    if (!user) return null;
    return <Navigate to={`/users/${user.id}`} replace />;
}

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
            <CookieProvider>
                <AuthProvider>
                <WebSocketProvider>
                <WsLifecycle />
                <BrowserRouter>
                  <BackgroundJobsProvider>
                    <Popup />
                    <ActiveJobsPill />
                    <Suspense fallback={
                        <div style={{
                            minHeight: '100vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--color-bg-base)',
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                border: '2px solid rgba(16,185,129,0.2)',
                                borderTopColor: 'var(--color-brand-primary)',
                                animation: 'spin 0.7s linear infinite',
                            }} />
                        </div>
                    }>
                        <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Home />} />
                            <Route path="archive"    element={<Archive />} />
                            <Route path="hakkimizda" element={<About />} />
                            <Route path="legal"      element={<Legal />} />
                            <Route path="gundem"     element={<Gundem />} />
                            <Route path="borsa"      element={<Borsa />} />
                            <Route path="report"     element={<RequireAuth><Report /></RequireAuth>} />
                            <Route path="login"      element={<Login />} />
                            <Route path="register"          element={<Register />} />
                            <Route path="forgot-password"   element={<ForgotPassword />} />
                            <Route path="reset-password"    element={<ResetPassword />} />
                            <Route path="recover-account"   element={<RecoverAccount />} />
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

                            {/* Kullanıcı profili */}
                            <Route path="users/:userId" element={<Profile />} />

                            {/* Kaydedilenler */}
                            <Route path="bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />

                            {/* Rozetler */}
                            <Route path="badges" element={<Badges />} />

                            {/* Mesajlar */}
                            <Route path="messages"          element={<RequireAuth><Messages /></RequireAuth>} />
                            <Route path="messages/:userId"  element={<RequireAuth><Messages /></RequireAuth>} />

                            {/* Paylaşılan analiz — auth gerekmez */}
                            <Route path="analysis/share/:articleId" element={<SharedAnalysis />} />

                            {/* Derin analiz raporu */}
                            <Route path="analysis/report/:taskId" element={
                                <RequireAuth><AnalysisReport /></RequireAuth>
                            } />

                        </Route>
                        {/* Admin — ayri layout, RequireAdmin sadece bir kez */}
                        <Route
                          path="admin"
                          element={<RequireAdmin><AdminLayout /></RequireAdmin>}
                        >
                          <Route index                  element={<AdminDashboard />}  />
                          <Route path="users"           element={<AdminUsers />}      />
                          <Route path="content"         element={<AdminContent />}    />
                          <Route path="categories"      element={<AdminCategories />} />
                          <Route path="community"       element={<AdminCommunity />}  />
                          <Route path="ai-control"      element={<AdminAIControl />}  />
                          <Route path="security"        element={<AdminSecurity />}   />
                          {/* Eski URL'ler — yönlendirme */}
                          <Route path="analytics"       element={<AdminAnalytics />}  />
                          <Route path="forum"           element={<AdminForum />}      />
                          <Route path="ab-test"         element={<AdminABTest />}     />
                          <Route path="moderation"      element={<AdminModeration />} />
                          <Route path="dataset"         element={<AdminDataset />}    />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                  </BackgroundJobsProvider>
                </BrowserRouter>
                </WebSocketProvider>
                </AuthProvider>
            </CookieProvider>
        </ThemeProvider>
    );
}

export default App;
