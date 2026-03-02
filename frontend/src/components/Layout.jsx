import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Database, LogIn, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Layout = () => {
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();

    const getLinkClass = (path) => {
        const baseClass = "flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium ";
        if (location.pathname === path) {
            return baseClass + "bg-app-burgundy text-white";
        }
        return baseClass + "text-app-charcoal hover:bg-app-gray";
    };

    return (
        <div className="min-h-screen bg-app-bg flex flex-col font-sans transition-colors duration-300">
            {/* Navbar */}
            <header className="bg-app-surface border-b border-app-gray shadow-sm sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8 text-app-burgundy" />
                            <span className="text-xl font-bold text-app-charcoal tracking-tight">FNDS <span className="text-app-gray mx-1">|</span> Analyzer</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-2">
                            <Link to="/" className={getLinkClass("/")}>
                                <ShieldCheck className="w-5 h-5" />
                                Analyze
                            </Link>
                            <Link to="/archive" className={getLinkClass("/archive")}>
                                <Database className="w-5 h-5" />
                                Knowledge Base
                            </Link>
                        </nav>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full text-app-charcoal hover:bg-app-gray transition-colors"
                                aria-label="Toggle Dark Mode"
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <Link to="/login" className="flex items-center gap-2 text-app-charcoal hover:text-app-burgundy font-medium px-4 py-2 border border-transparent hover:border-app-burgundy rounded-md transition-all">
                                <LogIn className="w-5 h-5" />
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Simple Footer */}
            <footer className="bg-app-surface border-t border-app-gray mt-auto transition-colors duration-300">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-center text-sm font-medium text-app-charcoal opacity-70">
                    Fake News Detection System &copy; {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
};

export default Layout;
