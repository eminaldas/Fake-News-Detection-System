import { useState } from 'react';
import { useCookie } from '../../contexts/CookieContext';
import CookieConsentModal from './CookieConsentModal';

export default function CookieConsentBanner() {
    const { consent, acceptAll, rejectAll } = useCookie();
    const [modalOpen, setModalOpen] = useState(false);

    if (consent.decided) return null;

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    background: 'var(--color-terminal-surface)',
                    borderTop: '1px solid var(--color-brand-primary)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem 1.5rem',
                }}
            >
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    🍪{' '}
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                        Bu site KVKK kapsamında çerez kullanır.
                    </span>{' '}
                    <a
                        href="/hakkimizda"
                        className="underline hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--color-brand-primary)' }}
                    >
                        Gizlilik Politikası
                    </a>
                </span>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="font-mono text-xs uppercase tracking-wider border px-3 py-1.5 transition-opacity hover:opacity-70"
                        style={{
                            borderColor: 'var(--color-terminal-border-raw)',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        [ Ayarları Özelleştir ]
                    </button>
                    <button
                        onClick={rejectAll}
                        className="font-mono text-xs uppercase tracking-wider border px-3 py-1.5 transition-opacity hover:opacity-70"
                        style={{
                            borderColor: 'var(--color-terminal-border-raw)',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        [ Reddet ]
                    </button>
                    <button
                        onClick={acceptAll}
                        className="font-mono text-xs uppercase tracking-wider font-bold px-3 py-1.5 transition-opacity hover:opacity-80"
                        style={{
                            background: 'var(--color-brand-primary)',
                            color: '#000',
                            border: 'none',
                        }}
                    >
                        [ Tümünü Kabul Et ]
                    </button>
                </div>
            </div>

            <CookieConsentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    );
}
