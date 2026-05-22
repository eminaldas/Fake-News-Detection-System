import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MessageSquare, ShieldCheck } from 'lucide-react';

/**
 * Forum giriş duvarı.
 * Kapatma butonu yok — kullanıcı giriş yapana kadar içerik engellenir.
 */
export default function LoginNudgeModal() {
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
            <div
                className="w-full max-w-sm p-8 relative"
                style={{
                    background: 'var(--color-terminal-surface)',
                    border: '1px solid var(--color-terminal-border-raw)',
                    borderLeft: '3px solid var(--color-brand-primary)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                }}
            >
                {/* Köşe aksanları */}
                <div className="absolute top-0 right-0 w-5 h-0.5 pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />
                <div className="absolute top-0 right-0 h-5 w-0.5 pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.5 }} />

                <div className="flex items-center gap-2 mb-6">
                    <MessageSquare className="w-5 h-5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                    <p className="text-[10px] font-manrope font-black uppercase tracking-[0.22em]"
                       style={{ color: 'var(--color-brand-primary)' }}>
                        // Forum Erişimi
                    </p>
                </div>

                <h2 className="text-lg font-manrope font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Forum için giriş gerekiyor.
                </h2>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-primary)', opacity: 0.65 }}>
                    Tartışmalara katılmak, oy vermek ve içerik paylaşmak için hesabınıza giriş yapın.
                </p>

                <div className="space-y-3 mb-6">
                    {['Sınırsız forum erişimi', 'Oy ver ve yorum yap', 'İçerik paylaş'].map((f) => (
                        <div key={f} className="flex items-center gap-2.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                            <span className="text-xs" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>{f}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/login"
                        className="w-full py-3.5 font-manrope font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center transition-opacity hover:opacity-90"
                        style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                    >
                        Giriş Yap
                    </Link>
                    <Link
                        to="/register"
                        className="w-full py-3 font-manrope font-bold text-[11px] uppercase tracking-[0.15em] flex items-center justify-center transition-opacity hover:opacity-80"
                        style={{
                            border: '1px solid var(--color-terminal-border-raw)',
                            color: 'var(--color-text-primary)',
                        }}
                    >
                        Ücretsiz Kayıt Ol
                    </Link>
                </div>
            </div>
        </div>,
        document.body
    );
}
