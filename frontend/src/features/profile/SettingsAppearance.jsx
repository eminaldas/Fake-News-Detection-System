import React, { useState } from 'react';
import { Check, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import SettingsPanelShell from './SettingsPanelShell';

const SCALES = [
  { id: 'sm', label: 'Küçük', px: '14px', aaSize: 'text-lg'  },
  { id: 'md', label: 'Orta',  px: '16px', aaSize: 'text-2xl' },
  { id: 'lg', label: 'Büyük', px: '18px', aaSize: 'text-3xl' },
];

/* Framer Motion fontSize animasyonu için px cinsinden değerler kullan */
const PREVIEW_TITLE = { sm: '18px', md: '22px', lg: '26px' };
const PREVIEW_BODY  = { sm: '13px', md: '15px', lg: '17px' };
const PREVIEW_META  = { sm: '11px', md: '12px', lg: '13px' };

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

function AppearancePreview({ fontScale }) {
  return (
    <div className="relative border overflow-hidden" style={S}>
      {/* Köşe çentikler */}
      <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

      <div className="px-4 py-3 border-b flex items-center gap-2" style={BD}>
        <div className="w-1.5 h-1.5 bg-brand" />
        <span className="font-mono font-bold text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-text-primary)' }}>// ÖNİZLEME</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-1.5 py-0.5 border"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#ff7351', borderColor: 'rgba(239,68,68,0.28)' }}>
            YANILTICI
          </span>
          <motion.span
            className="font-manrope font-black"
            animate={{ fontSize: PREVIEW_TITLE[fontScale] }}
            transition={{ type: 'spring', damping: 18, stiffness: 150 }}
            style={{ color: 'var(--color-text-primary)' }}
          >
            Başlık Örneği
          </motion.span>
        </div>

        <motion.p
          animate={{ fontSize: PREVIEW_BODY[fontScale] }}
          transition={{ type: 'spring', damping: 18, stiffness: 150 }}
          className="font-mono leading-relaxed"
          style={{ color: 'var(--color-text-primary)', opacity: 0.8 }}
        >
          Analiz açıklaması metni burada görünür.
        </motion.p>

        <motion.p
          animate={{ fontSize: PREVIEW_META[fontScale] }}
          transition={{ type: 'spring', damping: 18, stiffness: 150 }}
          className="font-mono"
          style={{ color: 'var(--color-text-muted)' }}
        >
          meta · kaynak · 2sa önce
        </motion.p>

        <div className="border-t pt-2 font-mono text-xs" style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-brand-primary)' }}>
          Seçili: {SCALES.find(s => s.id === fontScale)?.px}
          <span className="ml-2 font-mono text-xs"
                style={{ color: 'var(--color-text-muted)' }}>
            — Tüm sayfa bu boyuta göre ölçeklenir
          </span>
        </div>
      </div>
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
      <div className="relative border overflow-hidden" style={S}>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

        <div className="px-4 py-3 border-b flex items-center gap-2" style={BD}>
          <div className="w-1.5 h-1.5 bg-brand shrink-0" />
          <span className="font-mono font-bold text-xs uppercase tracking-widest"
                style={{ color: 'var(--color-text-primary)' }}>// YAZI BOYUTU</span>
        </div>

        <div className="p-5 space-y-4">
          <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Tüm sayfada yazı ölçeğini ayarla. Tercih tarayıcıda saklanır.
          </p>

          <div className="flex gap-3 flex-wrap">
            {SCALES.map(({ id, label, px, aaSize }) => {
              const active = fontScale === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => handleFontChange(id)}
                  whileHover={{ scale: 1.02 }}
                  className="relative flex flex-col items-center gap-2 px-6 py-4 border font-mono transition-colors"
                  style={active ? {
                    borderColor: 'var(--color-brand-primary)',
                    background:  'rgba(16,185,129,0.07)',
                    boxShadow:   '0 0 18px rgba(16,185,129,0.22)',
                  } : {
                    borderColor: 'var(--color-terminal-border-raw)',
                    background:  'transparent',
                  }}
                >
                  {active && (
                    <Check className="w-3.5 h-3.5 absolute top-2 right-2"
                           style={{ color: 'var(--color-brand-primary)' }} />
                  )}
                  <span className={`font-black ${aaSize}`}
                        style={{ color: active ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                    Aa
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider"
                        style={{ color: active ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                    {label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {px}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tema */}
      <div className="relative border overflow-hidden" style={S}>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

        <div className="px-4 py-3 border-b flex items-center gap-2" style={BD}>
          <div className="w-1.5 h-1.5 bg-brand shrink-0" />
          <span className="font-mono font-bold text-xs uppercase tracking-widest"
                style={{ color: 'var(--color-text-primary)' }}>// TEMA</span>
        </div>

        <div className="p-5">
          <div className="flex gap-3">
            {[
              { val: false, label: 'Açık Mod',  Icon: Sun  },
              { val: true,  label: 'Koyu Mod',  Icon: Moon },
            ].map(({ val, label, Icon }) => {
              const active = isDarkMode === val;
              return (
                <button
                  key={label}
                  onClick={() => { if (!active) handleThemeToggle(); }}
                  className="flex items-center gap-2 px-5 py-3 border font-mono text-sm font-bold uppercase tracking-wider transition-all"
                  style={active ? {
                    borderColor: 'var(--color-brand-primary)',
                    background:  'rgba(16,185,129,0.08)',
                    color:       'var(--color-brand-primary)',
                  } : {
                    borderColor: 'var(--color-terminal-border-raw)',
                    color:       'var(--color-text-primary)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auto-save logu */}
      <AnimatePresence>
        {saved && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-sm flex items-center gap-2"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            <span style={{ opacity: 0.5 }}>{'>'}</span> tercihler tarayıcıya yazıldı ✓
          </motion.p>
        )}
      </AnimatePresence>

    </SettingsPanelShell>
  );
}
