// frontend/src/components/ui/MilestoneNotification.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Award, TrendingUp, X } from 'lucide-react';

const CONFIG = {
  badge:    { color: '#f59e0b', Icon: Award,      label: 'YENİ ROZET'      },
  level_up: { color: '#10b981', Icon: TrendingUp,  label: 'SEVİYE ATLADIN' },
};

export default function MilestoneNotification({ item, onRemove }) {
  const { color, Icon, label } = CONFIG[item.kind] ?? CONFIG.badge;
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const dismiss = () => {
    setExiting(true);
    setTimeout(onRemove, 200);
  };

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, 6000);
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        background:    '#1c2128',
        borderLeft:    `3px solid ${color}`,
        borderRadius:   4,
        padding:       '9px 12px',
        display:       'flex',
        alignItems:    'center',
        gap:            9,
        width:          280,
        boxShadow:     '0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        position:      'relative',
        overflow:      'hidden',
        animation:      exiting ? 'milestone-slide-out 0.2s ease-in forwards' : 'milestone-slide-in 0.25s ease-out',
        pointerEvents: 'auto',
      }}
    >
      {/* Üst gradient çizgi */}
      <div style={{
        position:   'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        opacity:     0.5,
      }} />

      {/* İkon kare */}
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `rgba(${hexToRgb(color)}, 0.12)`,
        border:     `1px solid rgba(${hexToRgb(color)}, 0.25)`,
      }}>
        <Icon size={14} color={color} />
      </div>

      {/* Metin */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color, fontFamily: 'monospace', marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#eef2f7', lineHeight: 1.3 }}>
          {item.title}
        </div>
        {item.sub && (
          <div style={{ fontSize: '0.67rem', color: '#8b949e', marginTop: 1 }}>
            {item.sub}
          </div>
        )}
      </div>

      {/* Kapat */}
      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#484f58', padding: 0, flexShrink: 0, display: 'flex',
        }}
        aria-label="Kapat"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
