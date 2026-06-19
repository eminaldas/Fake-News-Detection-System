import React, { useState } from 'react';
import { Monitor, SlidersHorizontal, ShieldCheck, Bell, ThumbsUp, Shield, TrendingUp, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

import SettingsSidebar      from '../features/profile/SettingsSidebar';
import SettingsAccount      from '../features/profile/SettingsAccount';
import SettingsAppearance   from '../features/profile/SettingsAppearance';
import ProfileAiLab         from '../features/profile/ProfileAiLab';
import ProfileSecurity      from '../features/profile/ProfileSecurity';
import ProfileNotifications from '../features/profile/ProfileNotifications';
import ProfileFeedback      from '../features/profile/ProfileFeedback';
import ProfilePrivacy       from '../features/profile/ProfilePrivacy';
import ProfileMarket        from '../features/profile/ProfileMarket';

const TABS = [
  { id: 'account',       label: 'Hesap',             icon: User,              Component: SettingsAccount      },
  { id: 'appearance',    label: 'Görünüm',            icon: Monitor,           Component: SettingsAppearance   },
  { id: 'ai-lab',        label: 'AI Lab',             icon: SlidersHorizontal, Component: ProfileAiLab         },
  { id: 'market',        label: 'Piyasalar',          icon: TrendingUp,        Component: ProfileMarket        },
  { id: 'security',      label: 'Güvenlik',           icon: ShieldCheck,       Component: ProfileSecurity      },
  { id: 'notifications', label: 'Bildirimler',        icon: Bell,              Component: ProfileNotifications },
  { id: 'feedback',      label: 'Geri Bildirimlerim', icon: ThumbsUp,          Component: ProfileFeedback      },
  { id: 'privacy',       label: 'Gizlilik',           icon: Shield,            Component: ProfilePrivacy       },
];

const SIDEBAR_BG  = 'var(--color-navbar-bg)';
const CONTENT_BG  = 'var(--color-navbar-bg)';
const DIVIDER     = 'var(--color-navbar-border)';

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const { user }                  = useAuth();
  const current                   = TABS.find(t => t.id === activeTab);

  return (
    <>
      {/* ── Mobil ── */}
      <div className="lg:hidden" style={{ paddingTop: '8rem', paddingBottom: '4rem', paddingLeft: '1rem', paddingRight: '1rem', background: CONTENT_BG, minHeight: '100vh' }}>
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value)}
          className="w-full border text-sm px-3 py-2.5 outline-none font-semibold mb-4"
          style={{
            borderColor: DIVIDER,
            color:       'var(--color-text-primary)',
            background:  'var(--color-terminal-surface)',
            fontFamily:  "'Elms Sans', sans-serif",
          }}
        >
          {TABS.map(t => <option key={t.id} value={t.id} style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-text-primary)' }}>{t.label}</option>)}
        </select>
        <AnimatePresence mode="wait">
          {current && (
            <motion.div key={activeTab}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <current.Component />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop: tam viewport, scroll yok ── */}
      <div
        className="hidden lg:flex"
        style={{ height: '100vh', overflow: 'hidden', background: CONTENT_BG }}
      >

        {/* ═══ 1/5 SIDEBAR — sabit, tam yükseklik ═══ */}
        <div
          style={{
            position:    'fixed',
            top:         0,
            left:        0,
            width:       '20%',
            height:      '100vh',
            background:  SIDEBAR_BG,
            borderRight: `1px solid ${DIVIDER}`,
            zIndex:      40,
            display:     'flex',
            flexDirection: 'column',
            overflowY:   'auto',
            overflowX:   'hidden',
          }}
        >
          {/* Navbar boşluğu */}
          <div style={{ flexShrink: 0, height: '8rem' }} />

          {/* Sidebar içeriği */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <SettingsSidebar
              tabs={TABS}
              activeTab={activeTab}
              onSelect={setActiveTab}
              user={user}
              compact
            />
          </div>
        </div>

        {/* ═══ İçerik wrapper — sidebar genişliği kadar margin ═══ */}
        <div
          style={{
            marginLeft: '20%',
            flex:       1,
            display:    'flex',
            height:     '100vh',
            overflow:   'hidden',
          }}
        >

          {/* ── 3/4 Ana içerik — bağımsız scroll, scrollbar en sağda ── */}
          <div
            className="settings-content-scroll"
            style={{
              flex:       3,
              overflowY:  'auto',
              overflowX:  'hidden',
              background: CONTENT_BG,
              paddingTop: '8rem',
            }}
          >
            <div style={{ padding: '1.5rem 2.5rem 6rem', maxWidth: '100%' }}>
              <AnimatePresence mode="wait">
                {current && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{    opacity: 0, x: -18 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <current.Component />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── 1/4 Sağ panel — boş, ileride dolacak ── */}
          <div
            style={{
              flex:        1,
              borderLeft:  `1px solid ${DIVIDER}`,
              background:  SIDEBAR_BG,
              paddingTop:  '8rem',
              flexShrink:  0,
            }}
          >
            {/* Gelecek: bağlamsal bilgi */}
          </div>

        </div>
      </div>
    </>
  );
}
