import React from 'react';

/* İkon + kalın başlık — keskin köşe aksanlı kutuda. // mono etiket yerine. */
export default function SectionHeading({ icon: Icon, title, accent = 'var(--color-brand-primary)', subtitle }) {
    return (
        <div className="flex items-start gap-2.5 mb-3">
            <span className="shrink-0 flex items-center justify-center w-7 h-7"
                  style={{
                      background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${accent} 33%, transparent)`,
                      color: accent,
                  }}>
                {Icon && <Icon className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
                <h3 className="font-bold text-[15px] leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted-accent)' }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
