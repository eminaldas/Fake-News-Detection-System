import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Zap } from 'lucide-react';
import GamificationService from '../../services/gamification.service';

const TIER_COLOR = {
  yeni_uye:    '#6b7280',
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

const PAL_BG   = ['rgba(16,185,129,0.22)','rgba(59,130,246,0.22)','rgba(245,158,11,0.22)','rgba(239,68,68,0.22)','rgba(168,85,247,0.22)'];
const PAL_TEXT = ['#10b981','#3b82f6','#f59e0b','#ef4444','#a855f7'];

const DIVIDER     = 'rgba(65,73,77,0.65)';   /* --color-navbar-border */
const DIVIDER_MID = 'rgba(65,73,77,0.30)';
const WHITE       = '#eef2f7';               /* tam opak beyaz */
const WHITE_DIM   = 'rgba(238,242,247,0.75)'; /* hafif soluk ama gri değil */

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Kullanıcı kartı ── */}
      <div style={{ padding: '1.25rem 1rem 1rem', borderBottom: `1px solid ${DIVIDER}` }}>

        {/* Avatar + isim yan yana */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div
            style={{
              width: 44, height: 44, flexShrink: 0,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 18,
              border: `2px solid ${tierColor}`,
              background: PAL_BG[idx],
              color: PAL_TEXT[idx],
              position: 'relative',
            }}
          >
            {user?.avatar_url
              ? <img src={user.avatar_url} alt={user?.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
              : (user?.username?.[0] ?? 'U').toUpperCase()
            }
            {/* mini köşe çentik */}
            <div style={{ position:'absolute',top:0,left:0,width:8,height:1.5,background:'var(--color-brand-primary)' }} />
            <div style={{ position:'absolute',top:0,left:0,width:1.5,height:8,background:'var(--color-brand-primary)' }} />
            <div style={{ position:'absolute',bottom:0,right:0,width:8,height:1.5,background:'var(--color-brand-primary)' }} />
            <div style={{ position:'absolute',bottom:0,right:0,width:1.5,height:8,background:'var(--color-brand-primary)' }} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily:'var(--font-manrope,sans-serif)', fontWeight:900, fontSize:'0.9rem', color: WHITE, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.username ?? '—'}
            </p>
            <span style={{
              display:'inline-block', marginTop:3,
              fontFamily:'monospace', fontSize:'0.625rem', fontWeight:700, letterSpacing:'0.05em',
              padding:'1px 6px', border:`1px solid ${tierColor}40`,
              color: tierColor, background: tierColor + '14',
            }}>
              {tierLabel}
            </span>
          </div>
        </div>

        {/* Segmented XP bar */}
        {xpStats && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontFamily:'monospace', fontSize:'0.68rem', fontWeight:700, color: WHITE }}>
                SEVİYE {xpStats.level}
              </span>
              <span style={{ fontFamily:'monospace', fontSize:'0.68rem', color: WHITE_DIM }}>
                {xpStats.xp_to_next_level} XP
              </span>
            </div>
            <div style={{ display:'flex', gap:2 }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const filled = (xpStats.xp_progress_pct / 100) * 12 > i;
                return (
                  <div key={i} style={{
                    flex: 1, height: 3,
                    background: filled ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.06)',
                    transition: 'background 0.3s',
                  }} />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigasyon bölüm başlığı ── */}
      <div style={{ padding:'0.5rem 1rem 0.375rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:'monospace', fontSize:'0.6rem', letterSpacing:'0.1em', color: WHITE_DIM, textTransform:'uppercase' }}>
          // NAV_MENU
        </span>
        <span style={{ fontFamily:'monospace', fontSize:'0.6rem', color: WHITE_DIM }}>
          {tabs.length}
        </span>
      </div>

      {/* ── Nav öğeleri ── */}
      <nav style={{ flex:1, overflowY:'auto' }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                position:    'relative',
                display:     'flex',
                alignItems:  'center',
                gap:         '0.75rem',
                width:       '100%',
                padding:     '0.7rem 1rem',
                textAlign:   'left',
                fontFamily:  'monospace',
                fontSize:    '0.8rem',
                fontWeight:  active ? 700 : 500,
                color:       active ? WHITE : WHITE_DIM,
                borderLeft:  active ? '2.5px solid var(--color-brand-primary)' : '2.5px solid transparent',
                borderBottom:`1px solid ${DIVIDER_MID}`,
                background:  active ? 'rgba(255,255,255,0.05)' : 'transparent',
                cursor:      'pointer',
                transition:  'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = WHITE; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = WHITE_DIM; e.currentTarget.style.background = 'transparent'; }}}
            >
              {active && (
                <motion.div
                  layoutId="settings-active-pill"
                  style={{ position:'absolute', inset:0, background:'rgba(16,185,129,0.07)', zIndex:0 }}
                  transition={{ type:'spring', stiffness:450, damping:38 }}
                />
              )}
              <Icon style={{ width:15, height:15, flexShrink:0, position:'relative', zIndex:1 }} />
              <span style={{ position:'relative', zIndex:1, letterSpacing:'0.03em' }}>{label}</span>
              {active && (
                <span style={{ marginLeft:'auto', position:'relative', zIndex:1, fontSize:'0.65rem', color:'var(--color-brand-primary)' }}>▸</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: `1px solid ${DIVIDER}`,
        display: 'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <span style={{ fontFamily:'monospace', fontSize:'0.6rem', color: WHITE_DIM, letterSpacing:'0.06em' }}>
          // SYS_MONITOR
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--color-brand-primary)', opacity:0.6 }} />
          <span style={{ fontFamily:'monospace', fontSize:'0.6rem', color: WHITE_DIM }}>v2.4</span>
        </div>
      </div>

    </div>
  );
}
