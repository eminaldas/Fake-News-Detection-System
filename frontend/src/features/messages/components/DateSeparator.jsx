// frontend/src/features/messages/components/DateSeparator.jsx
import React from 'react';
import { RADIUS, C } from '../shared/ui';

export default function DateSeparator({ label }) {
    return (
        <div className="flex items-center gap-3 my-4 px-4">
            <div className="flex-1 h-px" style={{ background: C.border }} />
            <span className="font-mono text-[11px] tracking-widest uppercase shrink-0 px-3 py-0.5"
                  style={{ color: C.textSecondary, background: C.greenSoft, borderRadius: RADIUS.pill }}>
                {label}
            </span>
            <div className="flex-1 h-px" style={{ background: C.border }} />
        </div>
    );
}
