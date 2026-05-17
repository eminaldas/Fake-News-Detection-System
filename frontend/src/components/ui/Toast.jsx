// frontend/src/components/ui/Toast.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, AlertCircle, Info, AlertTriangle,
  Zap, Award, X,
} from 'lucide-react';

const TYPE_CONFIG = {
  success: { color: '#10b981', Icon: CheckCircle },
  xp:      { color: '#10b981', Icon: Zap         },
  badge:   { color: '#f59e0b', Icon: Award        },
  error:   { color: '#ef4444', Icon: AlertCircle  },
  info:    { color: '#3b82f6', Icon: Info         },
  warning: { color: '#f59e0b', Icon: AlertTriangle },
};

export default function Toast({ item, onRemove }) {
  const { color, Icon } = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const dismiss = () => {
    setExiting(true);
    setTimeout(onRemove, 220);
  };

  useEffect(() => {
    if (!item.duration) return;
    timerRef.current = setTimeout(dismiss, item.duration);
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.duration]);

  return (
    <div
      style={{
        background:  '#1c2128',
        borderLeft:  `3px solid ${color}`,
        borderRadius: 4,
        padding:     '10px 12px',
        display:     'flex',
        alignItems:  'flex-start',
        gap:          8,
        boxShadow:   '0 2px 12px rgba(0,0,0,0.35)',
        width:        300,
        position:    'relative',
        overflow:    'hidden',
        opacity:      exiting ? 0 : 1,
        transform:    exiting ? 'translateX(110%)' : 'translateX(0)',
        transition:  'opacity 0.22s ease-out, transform 0.22s ease-out',
      }}
    >
      {/* İkon */}
      <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />

      {/* İçerik */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#eef2f7', lineHeight: 1.4 }}>
          {item.title}
        </div>
        {item.sub && (
          <div style={{ fontSize: '0.68rem', color: '#8b949e', marginTop: 2 }}>
            {item.sub}
          </div>
        )}
      </div>

      {/* Kapat */}
      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#484f58', padding: 0, flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Kapat"
      >
        <X size={13} />
      </button>

      {/* Progress bar — sadece otomatik kapananlarda */}
      {item.duration > 0 && (
        <div
          style={{
            position:        'absolute',
            bottom:          0,
            left:            0,
            height:          2,
            background:      color,
            opacity:         0.35,
            borderRadius:    '0 2px 2px 0',
            width:           '100%',
            animation:       `toast-progress ${item.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
