import React from 'react';
import { motion } from 'framer-motion';

export default function SettingsSidebar({ tabs, activeTab, onSelect, user }) {
  const TIER_COLOR = {
    yeni_uye:    'var(--color-text-muted)',
    dogrulayici: 'var(--color-accent-blue)',
    analist:     'var(--color-accent-amber)',
    dedektif:    'var(--color-brand-primary)',
  };
  const PAL_BG   = ['rgba(16,185,129,0.20)','rgba(59,130,246,0.20)','rgba(245,158,11,0.20)','rgba(239,68,68,0.20)','rgba(168,85,247,0.20)'];
  const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];
  const idx       = (user?.username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  const tierColor = TIER_COLOR[user?.trust_tier ?? 'yeni_uye'];

  return (
    <aside className="lg:sticky lg:top-24 space-y-1">

      {/* Kullanıcı özeti */}
      {user && (
        <div className="settings-glass border rounded-lg px-4 py-4 mb-4 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-black text-lg shrink-0"
            style={{ border: `2px solid ${tierColor}`, background: PAL_BG[idx], color: PAL_TEXT[idx] }}
          >
            {user.avatar_url
              ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
              : (user.username?.[0] ?? 'U').toUpperCase()
            }
          </div>
          <div className="min-w-0">
            <p className="font-manrope font-black text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user.username}
            </p>
            <p className="font-mono text-[10px]" style={{ color: tierColor }}>
              {user.trust_label ?? 'Yeni Üye'}
            </p>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="space-y-0.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="relative flex items-center gap-3 w-full px-3 py-2.5 rounded-md font-mono text-sm transition-colors text-left"
              style={{ color: active ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
            >
              {active && (
                <motion.div
                  layoutId="settings-active-pill"
                  className="absolute inset-0 rounded-md"
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    borderLeft: '2px solid var(--color-brand-primary)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10 shrink-0" />
              <span className="relative z-10 text-xs font-semibold tracking-wide">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
