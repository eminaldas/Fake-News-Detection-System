import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Circle } from 'lucide-react';
import GamificationService from '../../services/gamification.service';

const TIER_COLOR = {
  yeni_uye:    'var(--color-text-muted)',
  dogrulayici: 'var(--color-accent-blue)',
  analist:     'var(--color-accent-amber)',
  dedektif:    'var(--color-brand-primary)',
};
const TIER_LABEL = {
  yeni_uye:    'YENİ_ÜYE',
  dogrulayici: 'DOĞRULAYICI',
  analist:     'ANALİST',
  dedektif:    'DEDEKTİF',
};
const PAL_BG   = ['rgba(16,185,129,0.18)','rgba(59,130,246,0.18)','rgba(245,158,11,0.18)','rgba(239,68,68,0.18)','rgba(168,85,247,0.18)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

export default function SettingsSidebar({ tabs, activeTab, onSelect, user }) {
  const [xpStats, setXpStats] = useState(null);

  useEffect(() => {
    GamificationService.getMyStats().then(setXpStats).catch(() => {});
  }, []);

  const idx      = (user?.username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  const tier     = xpStats?.tier ?? 'yeni_uye';
  const tierColor = TIER_COLOR[tier];
  const tierLabel = TIER_LABEL[tier];

  return (
    <aside className="lg:sticky lg:top-24">

      {/* ── Ana kart — keskin hatlar, köşe aksanları ── */}
      <div className="relative border overflow-hidden" style={S}>

        {/* Köşe çentik aksanları — analiz sayfasıyla aynı */}
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
          <span className="font-mono font-bold text-[11px] uppercase tracking-widest text-tx-primary">
            // HESAP_AYARLARI
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-brand animate-pulse shrink-0" />
            <span className="font-mono text-[10px] text-brand tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Kullanıcı kartı */}
        {user && (
          <div className="px-4 py-4 border-b" style={BD}>

            <div className="flex items-center gap-3 mb-3">
              {/* Avatar — kare, tier renkli çerçeve */}
              <div
                className="w-12 h-12 overflow-hidden flex items-center justify-center font-black text-lg shrink-0 relative"
                style={{ border: `2px solid ${tierColor}`, background: PAL_BG[idx], color: PAL_TEXT[idx] }}
              >
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : (user.username?.[0] ?? 'U').toUpperCase()
                }
                {/* Köşe çentik — avatar üstü */}
                <div className="absolute top-0 left-0 w-2 h-[1.5px] bg-brand pointer-events-none" />
                <div className="absolute top-0 left-0 h-2 w-[1.5px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2 h-[1.5px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-2 w-[1.5px] bg-brand pointer-events-none" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-manrope font-black text-sm truncate text-tx-primary">
                  {user.username}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="font-mono text-[9px] font-bold px-1.5 py-0.5 border tracking-wider"
                    style={{ borderColor: tierColor + '60', color: tierColor, background: tierColor + '12' }}
                  >
                    {tierLabel}
                  </span>
                  {user.role === 'admin' && (
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border"
                          style={{ borderColor: 'rgba(245,158,11,0.40)', color: 'var(--color-accent-amber)', background: 'rgba(245,158,11,0.08)' }}>
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* XP çubuğu */}
            {xpStats && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-brand">
                    SEVİYE {xpStats.level}
                  </span>
                  <span className="font-mono text-[10px] text-tx-secondary">
                    {xpStats.xp_to_next_level} XP kaldı
                  </span>
                </div>
                {/* Segmented XP bar */}
                <div className="flex gap-[2px]">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const filled = (xpStats.xp_progress_pct / 100) * 10 > i;
                    return (
                      <div
                        key={i}
                        className="flex-1 h-[3px] transition-all duration-300"
                        style={{ background: filled ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)' }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav bölümü başlık */}
        <div className="px-4 py-2 border-b flex items-center justify-between" style={BD}>
          <span className="font-mono text-[10px] text-tx-secondary tracking-widest">// NAV_MENU</span>
          <span className="font-mono text-[10px] text-tx-secondary">{tabs.length} mod</span>
        </div>

        {/* Nav items */}
        <nav>
          {tabs.map(({ id, label, icon: Icon }, i) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className="relative flex items-center gap-3 w-full px-4 py-3 font-mono text-left transition-colors border-b"
                style={{
                  borderColor: 'var(--color-terminal-border-raw)',
                  color: active ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                  borderLeft: active ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                }}
              >
                {/* Aktif arka plan */}
                {active && (
                  <motion.div
                    layoutId="settings-active-pill"
                    className="absolute inset-0"
                    style={{ background: 'rgba(16,185,129,0.06)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}

                <Icon className="w-3.5 h-3.5 relative z-10 shrink-0" />
                <span className="relative z-10 text-[11px] font-bold uppercase tracking-wider flex-1">
                  {label}
                </span>

                {/* Aktif ok işareti */}
                {active && (
                  <span className="relative z-10 font-mono text-[10px] text-brand">▸</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={BD}>
          <span className="font-mono text-[10px] text-tx-secondary/60">// SYS_MONITOR_ACTIVE</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-brand/60" />
            <span className="font-mono text-[10px] text-brand/70">v2.4</span>
          </div>
        </div>

      </div>
    </aside>
  );
}
