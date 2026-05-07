import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

let _setter = null;

const XPToast = () => {
    const [toast, setToast] = useState(null);
    _setter = setToast;

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    if (!toast) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
            {toast.xpGained > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border font-mono text-sm animate-fade-up"
                     style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                    <Star className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-black">+{toast.xpGained} XP</span>
                    <span className="opacity-60">· {toast.label}</span>
                </div>
            )}
            {(toast.newBadges || []).map(b => (
                <div key={b.key}
                     className="flex items-center gap-2 px-4 py-2 border font-mono text-sm animate-fade-up"
                     style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-accent-amber)', color: 'var(--color-accent-amber)' }}>
                    <span>🏅</span>
                    <span className="font-black">Yeni Rozet:</span>
                    <span>{b.name}</span>
                </div>
            ))}
        </div>
    );
};

XPToast.show = ({ xpGained = 0, label = '', newBadges = [] }) => {
    if (_setter && (xpGained > 0 || newBadges.length > 0)) {
        _setter({ xpGained, label, newBadges });
    }
};

export default XPToast;
