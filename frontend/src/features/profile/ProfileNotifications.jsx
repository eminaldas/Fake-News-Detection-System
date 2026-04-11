import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import axiosInstance from '../../api/axios';

const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200"
        style={{ background: checked ? 'var(--color-brand-primary)' : 'var(--color-border)' }}
    >
        <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm"
            style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
    </button>
);

const ProfileNotifications = () => {
    const [prefs, setPrefs]   = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved]   = useState(false);

    useEffect(() => {
        axiosInstance.get('/notifications/prefs')
            .then(r => setPrefs(r.data))
            .catch(() => {});
    }, []);

    const updatePref = async (key, value) => {
        if (!prefs) return;
        const updated = { ...prefs, [key]: value };
        setPrefs(updated);
        setSaving(true);
        try {
            await axiosInstance.patch('/notifications/prefs', { [key]: value });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setPrefs(prefs); // geri al
        } finally {
            setSaving(false);
        }
    };

    if (!prefs) return <div className="text-sm text-muted p-4">Yükleniyor...</div>;

    const items = [
        {
            key:   'high_risk_alert',
            title: 'Analiz ettiğin içerik yanıltıcı çıkınca bildir',
            sub:   'Her analiz sonrasında anlık bildirim alırsın',
        },
        {
            key:   'email_digest',
            title: 'Her Pazartesi geçen haftanın özetini e-posta ile gönder',
            sub:   'Haftalık haber hijyeni raporun e-postana gelir',
        },
    ];

    return (
        <div className="space-y-4 max-w-lg">
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-muted" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted">Bildirim Ayarları</p>
                    </div>
                    {saved && <p className="text-[10px]" style={{ color: 'var(--color-brand-primary)' }}>Kaydedildi</p>}
                </div>
                <div className="space-y-4">
                    {items.map(({ key, title, sub }) => (
                        <div key={key}>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-tx-primary">{title}</p>
                                    <p className="text-[11px] text-muted mt-0.5">{sub}</p>
                                </div>
                                <Toggle
                                    checked={!!prefs[key]}
                                    onChange={val => updatePref(key, val)}
                                />
                            </div>
                            <div className="mt-3 border-b" style={{ borderColor: 'var(--color-border)' }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileNotifications;
