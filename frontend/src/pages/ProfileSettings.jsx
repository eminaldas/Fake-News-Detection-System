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

const BD = { borderColor: 'var(--color-terminal-border-raw)' };

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const { user }                  = useAuth();
  const current                   = TABS.find(t => t.id === activeTab);

  return (
    <>
      {/* ── Mobil: normal scroll layout ── */}
      <div className="lg:hidden px-4 pt-2 pb-16 space-y-5">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value)}
          className="w-full bg-transparent border font-mono text-sm px-3 py-2.5 outline-none font-bold"
          style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
        >
          {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <AnimatePresence mode="wait">
          {current && (
            <motion.div key={activeTab}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <current.Component />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop: 3-kolon bağımsız scroll layout ── */}
      {/* -mt-32: main'in pt-32'sini iptal et → tam viewport doldur */}
      <div
        className="hidden lg:flex"
        style={{
          marginTop:  '-8rem',   /* pt-32 iptal */
          marginLeft: '-1rem',   /* Layout padding iptal */
          marginRight: '-1rem',
          height:      '100vh',
          overflow:    'hidden',
        }}
      >

        {/* ── 1/4 Sidebar — sabit, kaymaz ── */}
        <div
          style={{
            width:       '25%',
            flexShrink:  0,
            overflowY:   'auto',
            overflowX:   'hidden',
            borderRight: '1px solid var(--color-terminal-border-raw)',
            paddingTop:  '8rem',    /* navbar için mesafe */
          }}
        >
          <SettingsSidebar
            tabs={TABS}
            activeTab={activeTab}
            onSelect={setActiveTab}
            user={user}
          />
        </div>

        {/* ── 2/4 İçerik — bağımsız scroll, düz arka plan ── */}
        <div
          style={{
            flex:       1,
            overflowY:  'auto',
            overflowX:  'hidden',
            background: 'var(--color-bg-surface)',
            paddingTop: '8rem',    /* navbar için mesafe */
          }}
        >
          <div style={{ padding: '1.5rem 2rem 4rem' }}>
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{    opacity: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <current.Component />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── 1/4 Sağ panel — şimdilik boş ── */}
        <div
          style={{
            width:       '25%',
            flexShrink:  0,
            borderLeft:  '1px solid var(--color-terminal-border-raw)',
            background:  'var(--color-bg-surface)',
            paddingTop:  '8rem',
            overflowY:   'auto',
          }}
        >
          {/* İçeriğe göre doldurulacak */}
        </div>

      </div>
    </>
  );
}
