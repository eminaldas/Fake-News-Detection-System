import React from 'react';
import { ShieldCheck, LogOut, FileText, Settings, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b border-app-gray pb-6 transition-colors duration-300">
                <div>
                    <h1 className="text-3xl font-extrabold text-app-charcoal tracking-tight">Admin Operations</h1>
                    <p className="text-app-charcoal opacity-70 mt-1">Manage the core parameters of the FNDS engine.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-gray rounded-md text-app-charcoal hover:bg-app-gray transition-colors shadow-sm font-medium focus:ring-2 focus:ring-app-burgundy"
                >
                    <LogOut className="w-4 h-4" />
                    Secure Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Dataset Manager */}
                <div
                    onClick={() => navigate('/admin/dataset')}
                    className="bg-app-surface p-6 rounded-2xl shadow-sm border border-app-gray hover:border-app-plum transition-colors group cursor-pointer duration-300"
                >
                    <div className="w-12 h-12 bg-app-plum bg-opacity-10 text-app-plum rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-app-charcoal mb-2">Dataset Manager</h3>
                    <p className="text-app-charcoal opacity-70 text-sm">Makale veri tabanını gözden geçir, iddiaları manuel olarak sınıflandır.</p>
                </div>

                {/* Engine Configs — Yakında */}
                <div className="bg-app-surface p-6 rounded-2xl shadow-sm border border-app-gray opacity-60 cursor-not-allowed duration-300 relative">
                    <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        Yakında
                    </span>
                    <div className="w-12 h-12 bg-app-burgundy bg-opacity-10 text-app-burgundy rounded-xl flex items-center justify-center mb-4">
                        <Settings className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-app-charcoal mb-2">Engine Configs</h3>
                    <p className="text-app-charcoal opacity-70 text-sm">Vektör eşleşme eşiği, Celery hız limiti ve NLP parametreleri.</p>
                </div>

                {/* Access Control */}
                <div
                    onClick={() => navigate('/admin/users')}
                    className="bg-app-surface p-6 rounded-2xl shadow-sm border border-app-gray hover:border-app-charcoal transition-colors group cursor-pointer duration-300"
                >
                    <div className="w-12 h-12 bg-app-charcoal bg-opacity-10 text-app-charcoal rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-app-charcoal mb-2">Access Control</h3>
                    <p className="text-app-charcoal opacity-70 text-sm">Araştırmacı hesapları yönet, kullanıcı rollerini düzenle.</p>
                </div>

            </div>

            <div className="mt-12 bg-app-bg border border-app-gray rounded-2xl p-8 text-center shadow-inner transition-colors duration-300">
                <ShieldCheck className="w-16 h-16 text-app-gray mx-auto mb-4" />
                <h4 className="text-lg font-bold text-app-charcoal">System Secured</h4>
                <p className="text-app-charcoal opacity-60">You are browsing in a protected session managed by JWT Interceptors.</p>
            </div>
        </div>
    );
};

export default Dashboard;
