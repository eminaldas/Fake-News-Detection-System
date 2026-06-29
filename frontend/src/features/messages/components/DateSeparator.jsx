// frontend/src/features/messages/components/DateSeparator.jsx
import React from 'react';

export default function DateSeparator({ label }) {
    return (
        <div className="flex items-center gap-3 my-4 px-4">
            <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
            <span className="font-mono text-[10px] tracking-widest uppercase shrink-0"
                  style={{ color: 'var(--color-text-muted)', opacity: 0.55 }}>
                {label}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
        </div>
    );
}
