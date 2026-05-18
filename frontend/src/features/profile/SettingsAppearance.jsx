import React, { useState } from 'react';
import { Check, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import SettingsPanelShell from './SettingsPanelShell';

const SCALES = [
  { id: 'sm', label: 'Küçük', px: '14px', aaSize: 'text-base'  },
  { id: 'md', label: 'Orta',  px: '16px', aaSize: 'text-xl'   },
  { id: 'lg', label: 'Büyük', px: '18px', aaSize: 'text-2xl'  },
];

const PREVIEW_TITLE = { sm: '0.9rem',  md: '1.05rem', lg: '1.2rem'  };
const PREVIEW_BODY  = { sm: '0.78rem', md: '0.875rem', lg: '1rem'   };
const PREVIEW_META  = { sm: '0.65rem', md: '0.72rem',  lg: '0.78rem' };

function AppearancePreview({ fontScale }) {
  return (
    <div className="settings-glass border rounded-lg p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest"
         style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>
        // ÖNİZLEME
      </p>

      <div className="border rounded p-3 space-y-2"
           style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'var(--color-terminal-surface)' }}>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 border"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#ff7351', borderColor: 'rgba(239,68,68,0.28)' }}>
            YANILTICI
          </span>
          <motion.span
            className="font-manrope font-black"
            animate={{ fontSize: PREVIEW_TITLE[fontScale] }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            style={{ color: 'var(--color-text-primary)' }}
          >
            Başlık Örneği
          </motion.span>
        </div>

        <motion.p
          animate={{ fontSize: PREVIEW_BODY[fontScale] }}
          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
          className="font-mono leading-relaxed"
          style={{ color: 'var(--color-text-secondary)', opacity: 0.85 }}
        >
          Analiz açıklaması metni burada görünür.
        </motion.p>

        <motion.p
          animate={{ fontSize: PREVIEW_META[fontScale] }}
          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
          className="font-mono"
          style={{ color: 'var(--color-text-muted)' }}
        >
          meta · kaynak · 2sa önce
        </motion.p>
      </div>

      <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
        Seçilen boyut: {SCALES.find(s => s.id === fontScale)?.px}
      </p>
    </div>
  );
}

export default function SettingsAppearance() {
  const { fontScale, setFontScale, isDarkMode, toggleTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const handleFontChange = (id) => {
    setFontScale(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingsPanelShell contextCard={<AppearancePreview fontScale={fontScale} />}>

      {/* Yazı Boyutu */}
      <div className="settings-glass border rounded-lg p-5 space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
             style={{ color: 'var(--color-brand-primary)' }}>// YAZI BOYUTU</p>
          <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Tüm sayfada yazı ölçeğini ayarla. Tercih tarayıcıda saklanır.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          {SCALES.map(({ id, label, px, aaSize }) => {
            const active = fontScale === id;
            return (
              <motion.button
                key={id}
                onClick={() => handleFontChange(id)}
                whileHover={{ scale: 1.02 }}
                className="relative flex flex-col items-center gap-2 px-5 py-4 border font-mono transition-colors"
                style={active ? {
                  borderColor: 'var(--color-brand-primary)',
                  background:  'rgba(16,185,129,0.06)',
                  boxShadow:   '0 0 16px rgba(16,185,129,0.20), inset 0 0 8px rgba(16,185,129,0.04)',
                } : {
                  borderColor: 'var(--color-terminal-border-raw)',
                  background:  'transparent',
                }}
              >
                {active && (
                  <Check className="w-3 h-3 absolute top-2 right-2"
                         style={{ color: 'var(--color-brand-primary)' }} />
                )}
                <span className={`font-black ${aaSize}`}
                      style={{ color: active ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}>
                  Aa
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: active ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}>
                  {label}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.55 }}>
                  {px}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tema */}
      <div className="settings-glass border rounded-lg p-5 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest"
           style={{ color: 'var(--color-brand-primary)' }}>// TEMA</p>

        <div className="flex gap-3">
          {[
            { val: false, label: 'Açık',  Icon: Sun  },
            { val: true,  label: 'Koyu',  Icon: Moon },
          ].map(({ val, label, Icon }) => {
            const active = isDarkMode === val;
            return (
              <button
                key={label}
                onClick={() => { if (!active) handleThemeToggle(); }}
                className="flex items-center gap-2 px-4 py-2.5 border font-mono text-xs font-bold uppercase tracking-wider transition-all"
                style={active ? {
                  borderColor: 'var(--color-brand-primary)',
                  background:  'rgba(16,185,129,0.08)',
                  color:       'var(--color-brand-primary)',
                } : {
                  borderColor: 'var(--color-terminal-border-raw)',
                  color:       'var(--color-text-muted)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto-save konsol logu */}
      <AnimatePresence>
        {saved && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-xs flex items-center gap-2"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            <span style={{ opacity: 0.5 }}>{'>'}</span> tercihler tarayıcıya yazıldı ✓
          </motion.p>
        )}
      </AnimatePresence>

    </SettingsPanelShell>
  );
}
