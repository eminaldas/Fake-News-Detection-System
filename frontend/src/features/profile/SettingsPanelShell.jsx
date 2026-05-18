import React from 'react';

export default function SettingsPanelShell({ children, contextCard, title, subtitle }) {
  return (
    <div className="space-y-5">
      {(title || subtitle) && (
        <div>
          {title && (
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
               style={{ color: 'var(--color-brand-primary)' }}>
              // {title.toUpperCase()}
            </p>
          )}
          {subtitle && (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">
        <div className="space-y-5">{children}</div>
        {contextCard && (
          <div className="hidden lg:block lg:sticky lg:top-24">
            {contextCard}
          </div>
        )}
      </div>
    </div>
  );
}
