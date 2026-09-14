import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsiblePanel({
    icon: Icon, title, count, badge, storageKey, defaultOpen = true, children,
}) {
    const [open, setOpen] = useState(() => {
        try {
            const v = localStorage.getItem(`forum_panel_${storageKey}`);
            return v == null ? defaultOpen : v !== '0';
        } catch { return defaultOpen; }
    });

    const toggle = useCallback(() => {
        setOpen(prev => {
            const next = !prev;
            try { localStorage.setItem(`forum_panel_${storageKey}`, next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    }, [storageKey]);

    return (
        <div className="rounded-2xl p-6 transition-shadow hover:shadow-md" style={{ background: 'var(--color-navbar-bg)', border: '1px solid var(--color-border)' }}>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="w-full flex items-center gap-2 group"
                style={{ marginBottom: open ? 14 : 0 }}
            >
                {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
                <span className="text-[12px] font-extrabold uppercase tracking-wider flex-1 text-left" style={{ color: 'var(--color-text-muted)' }}>
                    {title}
                </span>
                {count != null && (
                    <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                        {count}
                    </span>
                )}
                {badge}
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:opacity-70"
                             style={{ color: 'var(--color-text-muted)', transform: open ? 'none' : 'rotate(-90deg)' }} />
            </button>
            <div className="grid transition-all duration-200 ease-out"
                 style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}>
                <div className="overflow-hidden">{children}</div>
            </div>
        </div>
    );
}
