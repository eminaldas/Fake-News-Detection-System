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

  // Başkasının profilinde rozet yoksa hiç gösterme
  if (!isOwnProfile && showcase.length === 0) return null;

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => showcase[i] ?? null);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {slots.map((badge, i) =>
        badge ? (
          <Tooltip
            key={badge.key}
            content={descMap[badge.key] ?? badge.name}
            side="top"
            maxWidth={220}
          >
            <div
              className="badge-slot relative flex items-center gap-1.5 px-2.5 py-1 border overflow-hidden cursor-default select-none"
              style={{ borderColor: badge.color, color: badge.color }}
            >
              <div className="badge-shine-layer" />
              <span className="font-mono text-[11px] font-black relative z-10">
                {badge.name[0]}
              </span>
              <span className="font-mono text-[11px] relative z-10">
                {badge.name}
              </span>
            </div>
          </Tooltip>
        ) : isOwnProfile ? (
          <Link
            key={`empty-${i}`}
            to="/badges"
            className="flex items-center px-2.5 py-1 border border-dashed transition-all hover:border-solid"
            style={{
              borderColor: 'var(--color-brand-primary)',
              color: 'var(--color-brand-primary)',
              opacity: 0.6,
            }}
          >
            <span className="font-mono text-[11px] font-bold">+ Rozet</span>
          </Link>
        ) : null
      )}
    </div>
  );
}
