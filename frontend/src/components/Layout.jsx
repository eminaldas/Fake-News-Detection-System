import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './common/Navbar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-app-bg flex flex-col font-sans transition-colors duration-300">
            <Navbar />

            {/* Main Content Area */}
            {/* Main Content Area */}
            {/* Added pt-28 to account for absolute navbar */}
            <main className="flex-grow pt-28">
                <Outlet />
            </main>
            <footer className="border-t-0 border-app-gray mt-auto transition-colors duration-300 relative z-10 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center text-sm font-medium text-app-charcoal dark:text-gray-400 opacity-70">
                    Fake News Detection System &copy; {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
};

export default Layout;
