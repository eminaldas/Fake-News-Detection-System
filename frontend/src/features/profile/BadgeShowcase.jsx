import React, { useEffect, useState } from 'react';
import Tooltip from '../../components/ui/Tooltip';
import GamificationService from '../../services/gamification.service';

const SLOT_COUNT = 3; // backend max is 3

export default function BadgeShowcase({ showcase = [] }) {
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

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => showcase[i] ?? null);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {slots.map((badge, i) =>
        badge ? (
          <Tooltip
            key={badge.key}
            content={descMap[badge.key] ?? badge.name}
            side="top"
            maxWidth={200}
          >
            <div
              className="badge-slot relative flex items-center gap-1.5 px-2.5 py-1 border overflow-hidden cursor-default"
              style={{ borderColor: badge.color, color: badge.color }}
            >
              <div className="badge-shine-layer" />
              <span className="font-mono text-[10px] font-black relative z-10">
                {badge.name[0]}
              </span>
              <span className="font-mono text-[10px] relative z-10">
                {badge.name}
              </span>
            </div>
          </Tooltip>
        ) : (
          <div
            key={`empty-${i}`}
            className="flex items-center px-2.5 py-1 border border-dashed"
            style={{
              borderColor: 'var(--color-terminal-border-raw)',
              color: 'var(--color-text-muted)',
              opacity: 0.3,
            }}
          >
            <span className="font-mono text-[10px]">//—</span>
          </div>
        )
      )}
    </div>
  );
}
