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
                        className="flex flex-col items-center gap-1 px-6 py-4 border font-mono transition-colors"
                        style={{
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
                        <Monitor className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                        <span className="text-[10px] opacity-60">{desc}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 border" style={{
                borderColor: 'var(--color-terminal-border-raw)',
                background:  'var(--color-terminal-surface)',
            }}>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-2"
                   style={{ color: 'var(--color-market-sys)', opacity: 0.6 }}>// ÖNİZLEME</p>
                <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                    Başlık örneği
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875em' }}>
                    İkincil metin — analiz sonucu açıklaması burada görünür.
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>
                    Meta bilgi · kaynak · zaman damgası
                </p>
            </div>
        </div>
    );
}
