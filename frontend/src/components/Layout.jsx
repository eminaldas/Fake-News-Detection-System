import React from 'react';
import { Outlet } from 'react-router-dom';
import { Github } from 'lucide-react';
import Navbar from './common/Navbar';

const FOOTER_LINKS = ['Hakkımızda', 'Gizlilik', 'İletişim', 'Kullanım Koşulları'];

const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col transition-colors duration-300">
            <Navbar />

            <main className="flex-grow pt-24 md:pt-28">
                <Outlet />
            </main>

            <footer className="mt-24 border-t border-brutal-border dark:border-es-primary/10 bg-surface dark:bg-es-surface">
                <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">

                    {/* Marka */}
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <span className="text-base font-manrope font-extrabold tracking-tight text-tx-primary dark:text-es-primary">
                            Ne Haber
                        </span>
                        <p className="text-xs text-tx-secondary">
                            © {new Date().getFullYear()} Fake News Detection System
                        </p>
                    </div>

                    {/* Linkler */}
                    <div className="flex flex-wrap justify-center gap-6">
                        {FOOTER_LINKS.map((link) => (
                            <a
                                key={link}
                                href="#"
                                className="text-xs text-tx-secondary hover:text-tx-primary transition-colors"
                            >
                                {link}
                            </a>
                        ))}
                    </div>

                    {/* Sosyal */}
                    <div className="flex gap-3">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full border border-brutal-border flex items-center justify-center text-tx-secondary hover:text-tx-primary hover:border-tx-primary transition-all"
                        >
                            <Github size={14} />
                        </a>
                    </div>

                </div>
            </footer>
        </div>
    );
};

export default Layout;
