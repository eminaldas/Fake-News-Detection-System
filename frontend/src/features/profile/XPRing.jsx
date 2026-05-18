import React, { useEffect, useState } from 'react';

const RADIUS       = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // 251.33

export default function XPRing({ score = 0, label = 'HİJYEN SKORU' }) {
  const clamped    = Math.min(100, Math.max(0, Math.round(score)));
  const finalOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const [offset, setOffset] = useState(CIRCUMFERENCE); // start empty

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(finalOffset));
    return () => cancelAnimationFrame(id);
  }, [finalOffset]);

  const color =
    clamped >= 70 ? 'var(--color-brand-primary)' :
    clamped >= 40 ? 'var(--color-accent-amber)'  :
                   'var(--color-fake-fill)';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[88px] h-[88px]">
        <svg width="88" height="88" viewBox="0 0 100 100"
             style={{ transform: 'rotate(-90deg)' }}>
          {/* Track ring */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="var(--color-terminal-border-raw)"
            strokeWidth="8"
          />
          {/* Animated fill ring */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.85s ease-out' }}
          />
        </svg>
        {/* Centred score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-black leading-none"
                style={{ color }}>{clamped}</span>
          <span className="font-mono text-[9px] leading-none mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}>/100</span>
        </div>
      </div>
      <span className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}
