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

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const { user }                  = useAuth();
  const current                   = TABS.find(t => t.id === activeTab);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-16">

      {/* Başlık */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
           style={{ color: 'var(--color-brand-primary)' }}>// AYARLAR</p>
        <h1 className="font-manrope font-extrabold text-3xl"
            style={{ color: 'var(--color-text-primary)' }}>
          Hesap Ayarları
        </h1>
      </div>

      {/* Mobil dropdown */}
      <div className="lg:hidden mb-5">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value)}
          className="w-full bg-transparent border font-mono text-sm px-3 py-2.5 outline-none"
          style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
        >
          {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Ana grid: sidebar + panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">

        {/* Sidebar — yalnızca lg+ */}
        <div className="hidden lg:block">
          <SettingsSidebar
            tabs={TABS}
            activeTab={activeTab}
            onSelect={setActiveTab}
            user={user}
          />
        </div>

        {/* Panel — AnimatePresence x-slide */}
        <div className="min-w-0">
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
    </div>
  );
}
