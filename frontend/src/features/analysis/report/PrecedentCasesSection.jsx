import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function PrecedentCasesSection({ cases }) {
    if (!cases?.length) return null;
    return (
        <div className="flex flex-col gap-3">
            {cases.map((c, i) => (
                <div key={i} className="flex flex-col gap-1 py-2"
                     style={{ borderBottom: i < cases.length - 1 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.title}</span>
                        {c.year && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border"
                                  style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>{c.year}</span>
                        )}
                        {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center" style={{ color: 'var(--color-brand-primary)' }}>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                    {c.summary && (
                        <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)', opacity: 0.75 }}>
                            {c.summary}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
