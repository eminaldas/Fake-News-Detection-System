import React, { useState, useEffect } from 'react';
import { Bell, Zap, Mail } from 'lucide-react';
import axiosInstance from '../../api/axios';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Block = ({ title, sub, children, footer }) => (
    <div className="relative border" style={S}>
        <span
            className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
        >
            {title}
        </span>
        <div className="px-5 pt-6 pb-5">
            {sub && (
                <p className="font-mono text-xs mb-5 opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                    {sub}
                </p>
            )}
            {children}
        </div>
        {footer && (
            <div className="border-t px-5 py-2 flex items-center justify-between" style={BD}>
                {footer}
            </div>
        )}
    </div>
);

/* Blok-style ON/OFF toggle — AI Lab ile aynı dil */
const BlockToggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className="font-mono text-xs font-black tracking-wider px-3 py-1.5 border shrink-0 transition-all"
        style={{
            borderColor: checked ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
            color:       checked ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
            background:  checked ? 'rgba(16,185,129,0.08)'      : 'transparent',
            minWidth: '3.5rem',
        }}
    >
        {checked ? ' ON' : 'OFF'}
    </button>
);

const ITEMS = [
    {
        key:   'high_risk_alert',
        icon:  Zap,
        title: 'Anlık Uyarı',
        sub:   'Analiz ettiğin bir içerik yanıltıcı çıkınca bildirim al',
        tag:   'PUSH',
    },
    {
        key:   'email_digest',
        icon:  Mail,
        title: 'Haftalık Özet',
        sub:   'Her Pazartesi haber hijyeni raporun e-postana gelir',
        tag:   'E-POSTA',
    },
];

const ProfileNotifications = () => {
    const [prefs, setPrefs]   = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    useEffect(() => {
        axiosInstance.get('/notifications/prefs').then(r => setPrefs(r.data)).catch(() => {});
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
            setPrefs(prefs);
        } finally {
            setSaving(false);
        }
    };

    if (!prefs) return (
        <div className="relative border" style={S}>
            <div className="px-5 py-8 space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-40 animate-pulse" style={{ background: 'var(--color-terminal-border-raw)' }} />
                            <div className="h-3 w-64 animate-pulse" style={{ background: 'var(--color-terminal-border-raw)', opacity: 0.5 }} />
                        </div>
                        <div className="h-8 w-14 animate-pulse" style={{ background: 'var(--color-terminal-border-raw)' }} />
                    </div>
                ))}
            </div>
        </div>
    );

    const activeCount = ITEMS.filter(item => !!prefs[item.key]).length;

    return (
        <div className="space-y-6">
            <Block
                title="// notification_config"
                sub="bildirim tercihlerini buradan yönet — değişiklikler anında kaydedilir"
                footer={
                    <>
                        <span className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
                            // PREFS_SYNC
                        </span>
                        <span
                            className="font-mono text-[10px] tracking-widest transition-opacity"
                            style={{
                                color:   saved ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                                opacity: saved ? 1 : 0.5,
                            }}
                        >
                            {saved ? '[ OK ] kaydedildi' : saving ? '// kaydediliyor...' : `${activeCount}/${ITEMS.length} aktif`}
                        </span>
                    </>
                }
            >
                <div className="space-y-1">
                    {ITEMS.map(({ key, icon: Icon, title, sub, tag }, idx) => (
                        <div key={key}>
                            <div className="flex items-center gap-4 py-4">
                                {/* İkon + tip etiketi */}
                                <div className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                                    <Icon
                                        className="w-5 h-5"
                                        style={{ color: prefs[key] ? 'var(--color-brand-primary)' : 'var(--color-text-muted)', opacity: prefs[key] ? 1 : 0.4 }}
                                    />
                                    <span
                                        className="font-mono text-[9px] tracking-widest uppercase"
                                        style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
                                    >
                                        {tag}
                                    </span>
                                </div>

                                {/* Metin */}
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="font-mono text-sm font-semibold mb-1"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {title}
                                    </p>
                                    <p
                                        className="font-mono text-xs"
                                        style={{ color: 'var(--color-text-secondary)', opacity: 0.8 }}
                                    >
                                        {sub}
                                    </p>
                                </div>

                                {/* Toggle */}
                                <BlockToggle
                                    checked={!!prefs[key]}
                                    onChange={val => updatePref(key, val)}
                                />
                            </div>
                            {idx < ITEMS.length - 1 && (
                                <div className="border-b" style={BD} />
                            )}
                        </div>
                    ))}
                </div>
            </Block>
        </div>
    );
};

export default ProfileNotifications;
