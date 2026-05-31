import React from 'react';
import { Globe } from 'lucide-react';

export default function SourceCredibilitySection({ text }) {
    if (!text) return null;
    return (
        <div className="p-4 border border-brutal-border bg-surface-solid flex gap-3">
            <Globe
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: 'var(--color-text-muted-accent)' }}
            />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {text}
            </p>
        </div>
    );
}
