import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import axiosInstance from '../api/axios';

const RecoverAccount = () => {
    const [searchParams]         = useSearchParams();
    const token                   = searchParams.get('token') || '';
    const [status, setStatus]     = useState('loading'); // loading | success | error | no_token
    const [message, setMessage]   = useState('');
    const { isDarkMode }          = useTheme();

    useEffect(() => {
        if (!token) { setStatus('no_token'); return; }
        axiosInstance.post('/auth/recover', { token })
            .then(() => setStatus('success'))
            .catch(err => {
                setMessage(err.message || 'Bağlantı geçersiz veya süresi dolmuş.');
                setStatus('error');
            });
    }, [token]);

    return (
        <div className="relative -mt-32 md:-mt-36 min-h-screen flex items-center justify-center px-6">
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
                <span className="font-manrope font-black uppercase tracking-tighter"
                      style={{ fontSize:'clamp(80px,18vw,220px)', lineHeight:1, opacity: isDarkMode ? 0.022 : 0.04, color:'var(--color-text-primary)' }}>
                    GERİ DÖN
                </span>
            </div>

            <div className="relative z-10 w-full max-w-md animate-fade-up">
                <div className="relative overflow-hidden p-8 md:p-9 text-center"
                     style={{ background:'var(--color-terminal-surface)', border:'1px solid var(--color-terminal-border-raw)', borderRight:'3px solid var(--color-brand-primary)', boxShadow:'0 24px 64px rgba(0,0,0,0.55)' }}>

                    <div className="absolute top-0 left-0 w-5 h-[2px]" style={{ background:'var(--color-brand-primary)', opacity:0.5 }} />
                    <div className="absolute top-0 left-0 h-5 w-[2px]" style={{ background:'var(--color-brand-primary)', opacity:0.5 }} />

                    <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em] mb-6"
                       style={{ color:'var(--color-brand-primary)' }}>// Hesap Geri Yükleme</p>

                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <Loader2 className="w-10 h-10 animate-spin" style={{ color:'var(--color-brand-primary)' }} />
                            <p className="font-mono text-sm" style={{ color:'var(--color-text-muted)' }}>
                                Hesabınız geri yükleniyor…
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 flex items-center justify-center"
                                 style={{ border:'2px solid var(--color-brand-primary)', background:'rgba(16,185,129,0.08)' }}>
                                <CheckCircle2 className="w-7 h-7" style={{ color:'var(--color-brand-primary)' }} />
                            </div>
                            <div>
                                <p className="font-manrope font-bold text-base mb-1" style={{ color:'var(--color-text-primary)' }}>
                                    Hesabınız geri yüklendi!
                                </p>
                                <p className="font-mono text-xs" style={{ color:'var(--color-text-muted)' }}>
                                    Tekrar aramızdasınız. Giriş yapabilirsiniz.
                                </p>
                            </div>
                            <Link to="/login"
                                  className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest px-5 py-2.5 mt-2 transition-all hover:brightness-110"
                                  style={{ background:'var(--color-brand-primary)', color:'#070f12' }}>
                                Giriş Yap <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}

                    {(status === 'error' || status === 'no_token') && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <AlertCircle className="w-10 h-10" style={{ color:'#ef4444' }} />
                            <div>
                                <p className="font-manrope font-bold text-base mb-1" style={{ color:'var(--color-text-primary)' }}>
                                    Bağlantı Geçersiz
                                </p>
                                <p className="font-mono text-xs leading-relaxed" style={{ color:'var(--color-text-muted)' }}>
                                    {message || 'Bu bağlantı geçersiz veya 30 günlük süresi dolmuş.'}
                                </p>
                            </div>
                            <Link to="/login"
                                  className="font-mono text-xs underline transition-opacity hover:opacity-70"
                                  style={{ color:'var(--color-brand-primary)' }}>
                                Giriş Sayfasına Dön
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecoverAccount;
