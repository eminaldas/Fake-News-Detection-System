import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCookie } from '../../contexts/CookieContext';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

function Toggle({ value, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className="focus-visible:outline focus-visible:outline-2"
            style={{
                position: 'relative',
                width: 36, height: 18,
                background: value ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
            }}
            aria-checked={value}
            role="switch"
        >
            <span style={{
                position: 'absolute',
                top: 2, left: value ? 18 : 2,
                width: 14, height: 14,
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
            }} />
        </button>
    );
}

const Row = ({ title, desc, locked = false, value = false, onChange = () => {} }) => (
    <div
        className="border"
        style={{
            ...BD,
            background: 'var(--color-bg-base)',
            padding: '10px 14px',
            marginBottom: 8,
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {title}
            </span>
            {locked
                ? <span className="font-mono text-[10px] border px-2 py-0.5"
                        style={{ color: 'var(--color-brand-primary)', borderColor: 'rgba(16,185,129,0.3)' }}>
                    Her zaman açık
                  </span>
                : <Toggle value={value} onChange={onChange} />
            }
        </div>
        <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
    </div>
);

export default function CookieConsentModal({ isOpen, onClose }) {
    const { consent, saveConsent, rejectAll } = useCookie();
    const [analytics, setAnalytics] = useState(consent.analytics);
    const [personalization, setPersonalization] = useState(consent.personalization);

    useEffect(() => {
        if (isOpen) {
            setAnalytics(consent.analytics);
            setPersonalization(consent.personalization);
        }
    }, [isOpen, consent.analytics, consent.personalization]);

    if (!isOpen) return null;

    const handleSave = () => {
        saveConsent({ analytics, personalization });
        onClose();
    };

    const handleOnlyRequired = () => {
        rejectAll();
        onClose();
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.70)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
        }}>
            <div onClick={e => e.stopPropagation()} className="border w-full max-w-md" style={{
                background: 'var(--color-terminal-surface)',
                borderColor: 'var(--color-brand-primary)',
            }}>
                {/* Başlık */}
                <div className="flex items-center justify-between px-5 py-4 border-b" style={BD}>
                    <span className="font-mono text-xs font-bold uppercase tracking-widest"
                          style={{ color: 'var(--color-brand-primary)' }}>
                    </span>
                    <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity">
                        <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                </div>

                {/* Gövde */}
                <div className="px-5 py-4">
                    <p className="font-mono text-xs mb-5" style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        KVKK kapsamında hangi çerezlerin kullanılacağını seçin.
                    </p>

                    <Row
                        title="Zorunlu Çerezler"
                        desc="Oturum yönetimi, kimlik doğrulama, güvenlik. Devre dışı bırakılamaz."
                        locked
                    />
                    <Row
                        title="Analitik Çerezler"
                        desc="Kullanım istatistikleri, sayfa görüntüleme verileri."
                        value={analytics}
                        onChange={setAnalytics}
                    />
                    <Row
                        title="Kişiselleştirme"
                        desc="Öneri motoru, davranış takibi, kullanıcı tercihleri."
                        value={personalization}
                        onChange={setPersonalization}
                    />

                    {/* Butonlar */}
                    <div className="flex gap-3 justify-end mt-5">
                        <button
                            onClick={handleOnlyRequired}
                            className="font-mono text-xs uppercase tracking-wider border px-4 py-2 transition-opacity hover:opacity-70"
                            style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                        >
                            Sadece Zorunlu
                        </button>
                        <button
                            onClick={handleSave}
                            className="font-mono text-xs uppercase tracking-wider font-bold px-4 py-2 transition-opacity hover:opacity-80"
                            style={{ background: 'var(--color-brand-primary)', color: '#000' }}
                        >
                            Tercihleri Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
