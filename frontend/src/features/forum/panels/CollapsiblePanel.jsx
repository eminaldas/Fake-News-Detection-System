import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

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
        <div className="border" style={{ ...TS, borderLeft: '3px solid rgba(63,255,139,0.55)' }}>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="w-full flex items-center gap-2.5 px-4 py-3"
                style={{ borderBottom: open ? '1px solid var(--color-terminal-border-raw)' : 'none' }}
            >
                {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />}
                <span className="text-sm font-bold flex-1 text-left" style={{ color: 'var(--color-text-primary)' }}>
                    {title}
                </span>
                {count != null && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 border"
                          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                        {count}
                    </span>
                )}
                {badge}
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200"
                             style={{ color: 'var(--color-text-muted)', transform: open ? 'none' : 'rotate(-90deg)' }} />
            </button>
            {open && <div>{children}</div>}
        </div>
    );
}
