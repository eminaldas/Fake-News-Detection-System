import React from 'react';
import { Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const SCALES = [
    { id: 'sm', label: 'Küçük',  desc: '14px' },
    { id: 'md', label: 'Orta',   desc: '16px' },
    { id: 'lg', label: 'Büyük',  desc: '18px' },
];

export default function ProfileAppearance() {
    const { fontScale, setFontScale } = useTheme();

    return (
        <div className="space-y-6">
            <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                   style={{ color: 'var(--color-brand-primary)' }}>// GÖRÜNÜM</p>
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                    Yazı Boyutu
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Tüm sayfada yazı ölçeğini ayarla. Tercih tarayıcıda saklanır.
                </p>
            </div>

            <div className="flex gap-3 flex-wrap">
                {SCALES.map(({ id, label, desc }) => (
                    <button
                        key={id}
                        onClick={() => setFontScale(id)}
                        className="flex flex-col items-center gap-1 border font-mono transition-colors"
                        style={{
                            padding:     '1rem 1.5rem',
                            borderColor: fontScale === id
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-terminal-border-raw)',
                            background: fontScale === id
                                ? 'rgba(16,185,129,0.08)'
                                : 'transparent',
                            color: fontScale === id
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-text-muted)',
                        }}
                    >
                        <Monitor style={{ width: '1rem', height: '1rem' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                        <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>{desc}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 border overflow-hidden" style={{
                borderColor: 'var(--color-terminal-border-raw)',
                background:  'var(--color-terminal-surface)',
            }}>
                <p className="font-mono uppercase tracking-widest mb-2"
                   style={{ fontSize: '0.625rem', color: 'var(--color-market-sys)', opacity: 0.6 }}>// ÖNİZLEME</p>
                <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '1rem' }}>
                    Başlık örneği
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    İkincil metin — analiz sonucu açıklaması burada görünür.
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                    Meta bilgi · kaynak · zaman damgası
                </p>
            </div>
        </div>
    );
}
