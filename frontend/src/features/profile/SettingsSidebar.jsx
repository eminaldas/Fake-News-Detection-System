import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
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

/* Terminal kart stili — HotAnalysesCard ile aynı */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

export default function SettingsSidebar({ tabs, activeTab, onSelect, user }) {
  const [xpStats, setXpStats] = useState(null);

  useEffect(() => {
    GamificationService.getMyStats().then(setXpStats).catch(() => {});
  }, []);

  const idx       = (user?.username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  const tier      = xpStats?.tier ?? 'yeni_uye';
  const tierColor = TIER_COLOR[tier];
  const tierLabel = TIER_LABEL[tier];

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="relative border overflow-hidden" style={S}>

        {/* Köşe çentik aksanları */}
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

        {/* Başlık */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={BD}>
          <span className="font-mono font-bold text-xs uppercase tracking-widest"
                style={{ color: 'var(--color-text-primary)' }}>
            // HESAP_AYARLARI
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-brand animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold tracking-widest"
                  style={{ color: 'var(--color-brand-primary)' }}>LIVE</span>
          </div>
        </div>

        {/* Kullanıcı kartı */}
        {user && (
          <div className="px-4 py-4 border-b" style={BD}>
            <div className="flex items-center gap-3 mb-3">

              {/* Kare avatar — köşe çentikler */}
              <div
                className="w-14 h-14 overflow-hidden flex items-center justify-center font-black text-xl shrink-0 relative"
                style={{ border: `2px solid ${tierColor}`, background: PAL_BG[idx], color: PAL_TEXT[idx] }}
              >
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.username}
                         className="w-full h-full object-cover"
                         referrerPolicy="no-referrer"
                         onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : (user.username?.[0] ?? 'U').toUpperCase()
                }
                <div className="absolute top-0 left-0 w-2.5 h-[1.5px] bg-brand pointer-events-none" />
                <div className="absolute top-0 left-0 h-2.5 w-[1.5px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2.5 h-[1.5px] bg-brand pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-2.5 w-[1.5px] bg-brand pointer-events-none" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-manrope font-black text-base truncate"
                   style={{ color: 'var(--color-text-primary)' }}>
                  {user.username}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span
                    className="font-mono text-xs font-bold px-1.5 py-0.5 border tracking-wider"
                    style={{ borderColor: tierColor + '60', color: tierColor, background: tierColor + '12' }}
                  >
                    {tierLabel}
                  </span>
                  {user.role === 'admin' && (
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 border"
                          style={{ borderColor: 'rgba(245,158,11,0.40)', color: 'var(--color-accent-amber)', background: 'rgba(245,158,11,0.08)' }}>
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Segmented XP bar */}
            {xpStats && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold"
                        style={{ color: 'var(--color-brand-primary)' }}>
                    SEVİYE {xpStats.level}
                  </span>
                  <span className="font-mono text-xs"
                        style={{ color: 'var(--color-text-muted)' }}>
                    {xpStats.xp_to_next_level} XP kaldı
                  </span>
                </div>
                <div className="flex gap-[2px]">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const filled = (xpStats.xp_progress_pct / 100) * 10 > i;
                    return (
                      <div key={i} className="flex-1 h-[3px] transition-all duration-300"
                           style={{ background: filled ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)' }} />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav bölüm başlığı */}
        <div className="px-4 py-2 border-b flex items-center justify-between" style={BD}>
          <span className="font-mono text-xs tracking-widest"
                style={{ color: 'var(--color-text-muted)' }}>// NAV_MENU</span>
          <span className="font-mono text-xs"
                style={{ color: 'var(--color-text-muted)' }}>{tabs.length} mod</span>
        </div>

        {/* Nav öğeleri */}
        <nav>
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className="relative flex items-center gap-3 w-full px-4 py-3 font-mono text-left transition-colors border-b"
                style={{
                  borderColor: 'var(--color-terminal-border-raw)',
                  color: active ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                  borderLeft: active ? '3px solid var(--color-brand-primary)' : '3px solid transparent',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="settings-active-pill"
                    className="absolute inset-0"
                    style={{ background: 'rgba(16,185,129,0.07)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10 shrink-0" />
                <span className="relative z-10 text-sm font-bold tracking-wide flex-1">
                  {label}
                </span>
                {active && (
                  <span className="relative z-10 font-mono text-sm font-black"
                        style={{ color: 'var(--color-brand-primary)' }}>▸</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <span className="font-mono text-xs"
                style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>// SYS_MONITOR</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }} />
            <span className="font-mono text-xs font-bold"
                  style={{ color: 'var(--color-brand-primary)', opacity: 0.7 }}>v2.4</span>
          </div>
        </div>

      </div>
    </aside>
  );
}
