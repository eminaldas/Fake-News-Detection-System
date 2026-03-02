import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(email, password);

        if (result.success) {
            const origin = location.state?.from?.pathname || '/';
            navigate(origin, { replace: true });
        } else {
            setError(result.error || 'Geçersiz kimlik bilgileri.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-app-surface rounded-3xl shadow-2xl border border-app-gray overflow-hidden flex flex-col md:flex-row h-[600px] transition-colors duration-300">

                {/* Left Side - Brand/Graphic */}
                <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-app-charcoal via-app-plum to-app-burgundy text-white p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-20"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <ShieldCheck className="h-10 w-10 text-white" />
                            <span className="text-2xl font-bold tracking-tight">FNDS <span className="opacity-50 mx-1">|</span> Portal</span>
                        </div>

                        <h1 className="text-4xl font-black mb-6 leading-tight">
                            Safeguarding <br /> The Truth.
                        </h1>
                        <p className="text-lg opacity-80 max-w-sm">
                            Secure administrative access for system operators, moderators, and dataset curators.
                        </p>
                    </div>

                    <div className="relative z-10 bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-xl border border-white border-opacity-20">
                        <p className="text-sm font-medium opacity-90">
                            "In an era of information overload, verification is the ultimate currency."
                        </p>
                    </div>

                    <div className="absolute -bottom-24 -left-24 w-64 h-64 border-4 border-white border-opacity-10 rounded-full"></div>
                    <div className="absolute -top-12 -right-12 w-48 h-48 border-4 border-white border-opacity-10 rounded-full"></div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-app-bg relative transition-colors duration-300">

                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-8 right-8 text-sm font-medium text-app-charcoal opacity-60 hover:opacity-100 transition-opacity"
                    >
                        ← Back to Public Analyzer
                    </button>

                    <div className="mb-10">
                        <h2 className="text-3xl font-extrabold text-app-charcoal mb-2">Welcome Back</h2>
                        <p className="text-app-charcoal opacity-70">Please enter your credentials to access the admin portal.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>

                        {error && (
                            <div className="bg-app-burgundy bg-opacity-10 border border-app-burgundy border-opacity-20 p-3 rounded-lg flex items-center gap-2 text-app-burgundy text-sm font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">Email/Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-app-charcoal opacity-40" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                    placeholder="admin@fnds.gov"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-app-charcoal opacity-80 uppercase tracking-wider">Password</label>
                                <a href="#" className="text-sm font-medium text-app-burgundy hover:underline">Forgot?</a>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-app-charcoal opacity-40" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-app-surface rounded-xl border border-app-gray focus:border-app-burgundy focus:ring-2 focus:ring-app-burgundy focus:ring-opacity-20 outline-none transition-all text-app-charcoal font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full bg-app-charcoal hover:opacity-80 disabled:bg-app-gray disabled:text-app-charcoal text-app-surface py-4 rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 mt-4 text-white dark:border dark:border-app-gray"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Sign In to Dashboard
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default Login;
