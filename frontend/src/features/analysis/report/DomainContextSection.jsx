import React from 'react';

export default function DomainContextSection({ text }) {
    if (!text) return null;
    return (
        <p className="font-mono text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {text}
        </p>
    );
}
