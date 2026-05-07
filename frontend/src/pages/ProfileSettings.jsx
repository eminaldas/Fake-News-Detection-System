import React, { useState } from 'react';
import { SlidersHorizontal, ShieldCheck, Bell, ThumbsUp } from 'lucide-react';
import ProfileAiLab         from '../features/profile/ProfileAiLab';
import ProfileSecurity      from '../features/profile/ProfileSecurity';
import ProfileNotifications from '../features/profile/ProfileNotifications';
import ProfileFeedback      from '../features/profile/ProfileFeedback';

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const TABS = [
    { id: 'ai-lab',        label: 'AI Lab',             icon: SlidersHorizontal, Component: ProfileAiLab },
    { id: 'security',      label: 'Güvenlik',           icon: ShieldCheck,       Component: ProfileSecurity },
    { id: 'notifications', label: 'Bildirimler',        icon: Bell,              Component: ProfileNotifications },
    { id: 'feedback',      label: 'Geri Bildirimlerim', icon: ThumbsUp,          Component: ProfileFeedback },
];

export default function ProfileSettings() {
    const [active, setActive] = useState('ai-lab');
    const current = TABS.find(t => t.id === active);

    return (
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-16 space-y-5">

            {/* Başlık */}
            <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                   style={{ color: 'var(--color-brand-primary)' }}>// AYARLAR</p>
                <h1 className="font-manrope font-extrabold text-3xl" style={{ color: 'var(--color-text-primary)' }}>
                    Hesap Ayarları
                </h1>
            </div>

            {/* Tab bar */}
            <div className="flex flex-wrap gap-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActive(id)}
                        className="flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider border transition-colors"
                        style={{
                            borderColor:  active === id ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                            background:   active === id ? 'rgba(16,185,129,0.08)' : 'transparent',
                            color:        active === id ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                        }}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* İçerik */}
            {current && <current.Component />}
        </div>
    );
}
