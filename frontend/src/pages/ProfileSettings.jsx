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
    <div className="max-w-7xl mx-auto px-4 pt-3 pb-16">

      {/* Mobil dropdown — başlık yok, direkt menü */}
      <div className="lg:hidden mb-4">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value)}
          className="w-full bg-transparent border font-mono text-sm px-3 py-2.5 outline-none font-bold"
          style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
        >
          {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Ana grid: geniş sidebar (280px) + panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

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
