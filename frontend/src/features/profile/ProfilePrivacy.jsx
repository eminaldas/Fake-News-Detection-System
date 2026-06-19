import { useState, useRef, useEffect } from 'react';
import { useCookie } from '../../contexts/CookieContext';
import SettingsPanelShell from './SettingsPanelShell';

const S = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Block = ({ title, children }) => (
    <div className="relative border" style={S}>
        <span
            className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
        >
            {title}
        </span>
        <div className="px-5 pt-6 pb-5">{children}</div>
    </div>
);

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
    <div className="border" style={{ ...BD, background: 'var(--color-bg-base)', padding: '10px 14px', marginBottom: 8 }}>
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

export default function ProfilePrivacy() {
    const { consent, saveConsent } = useCookie();
    const [analytics, setAnalytics] = useState(consent.analytics);
    const [personalization, setPersonalization] = useState(consent.personalization);
    const [saved, setSaved] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        setAnalytics(consent.analytics);
        setPersonalization(consent.personalization);
    }, [consent.analytics, consent.personalization]);

    const handleSave = () => {
        saveConsent({ analytics, personalization });
        setSaved(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaved(false), 2500);
    };

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <SettingsPanelShell contextCard={
            <div className="settings-glass border rounded-lg p-4 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-widest"
                   style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>// GİZLİLİK</p>
                <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    Gizlilik ayarlarınız yalnızca sizin için geçerlidir. Çerez tercihlerini sıfırlamak için tarayıcı önbelleğini temizleyin.
                </p>
            </div>
        }>
        <div className="space-y-6">
            <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                   style={{ color: 'var(--color-brand-primary)' }}>// GİZLİLİK</p>
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                    Çerez Tercihleri
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    KVKK kapsamında hangi çerezlerin kullanılacağını kontrol edin.
                </p>
            </div>

            <Block title="Çerez Kategorileri">
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
                    desc="Öneri sistemi, davranış takibi, kullanıcı tercihleri."
                    value={personalization}
                    onChange={setPersonalization}
                />

                <div className="flex items-center justify-between mt-5">
                    {saved && (
                        <span className="font-mono text-xs" style={{ color: 'var(--color-brand-primary)' }}>
                            ✓ Tercihler kaydedildi
                        </span>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                        <button
                            onClick={handleSave}
                            className="font-mono text-xs uppercase tracking-wider font-bold px-4 py-2 transition-opacity hover:opacity-80"
                            style={{ background: 'var(--color-brand-primary)', color: '#000' }}
                        >
                            Kaydet
                        </button>
                    </div>
                </div>
            </Block>
        </div>
        </SettingsPanelShell>
    );
}
