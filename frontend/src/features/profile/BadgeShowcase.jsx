import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Tooltip from '../../components/ui/Tooltip';
import GamificationService from '../../services/gamification.service';

const SLOT_COUNT = 3;

export default function BadgeShowcase({ showcase = [], isOwnProfile = false }) {
  const [descMap, setDescMap] = useState({});

  useEffect(() => {
    GamificationService.getBadgeCatalog()
      .then(catalog => {
        const map = {};
        catalog.forEach(b => { map[b.key] = b.description; });
        setDescMap(map);
      })
      .catch(() => {});
  }, []);

  if (!isOwnProfile && showcase.length === 0) return null;

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => showcase[i] ?? null);

  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-widest mb-3"
         style={{ color: 'var(--color-text-muted)' }}>// rozetler</p>
      <div className="flex items-start gap-3 flex-wrap">
        {slots.map((badge, i) =>
          badge ? (
            <Tooltip key={badge.key} content={descMap[badge.key] ?? badge.name} side="top" maxWidth={220}>
              <div
                className="badge-slot relative flex flex-col items-center justify-center border overflow-hidden cursor-default select-none transition-transform hover:scale-105"
                style={{ width: 76, height: 76, borderColor: badge.color, background: badge.color + '12' }}
              >
                <div className="badge-shine-layer" />
                <span className="font-mono text-2xl font-black leading-none relative z-10"
                      style={{ color: badge.color }}>
                  {badge.name[0]}
                </span>
                <span className="font-mono text-[9px] font-bold mt-1.5 text-center px-1 leading-tight relative z-10 w-full truncate"
                      style={{ color: badge.color }}>
                  {badge.name}
                </span>
              </div>
            </Tooltip>
          ) : isOwnProfile ? (
            <Link
              key={`empty-${i}`}
              to="/badges"
              className="flex flex-col items-center justify-center border border-dashed transition-all hover:border-solid hover:scale-105"
              style={{ width: 76, height: 76, borderColor: 'var(--color-brand-primary)',
                       color: 'var(--color-brand-primary)', opacity: 0.5 }}
            >
              <span className="font-mono text-2xl font-bold leading-none">+</span>
              <span className="font-mono text-[9px] mt-1.5">Rozet</span>
            </Link>
          ) : null
        )}
      </div>
    </div>
  );
}
