// frontend/src/components/ui/MilestoneContainer.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import wsService from '../../services/websocket';
import MilestoneNotification from './MilestoneNotification';
import { playBadgeSound, playLevelSound } from '../../utils/milestoneSound';

const MAX = 5;
let _counter = 0;

function makeId() { return `ms-${++_counter}`; }

export default function MilestoneContainer() {
  const [items, setItems] = useState([]);
  const addRef = useRef(null);

  const add = useCallback((item) => {
    setItems(prev => {
      const next = prev.length >= MAX ? prev.slice(1) : prev;
      return [...next, item];
    });
  }, []);

  // ref'e kaydet ki event handler'da stale closure olmasın
  addRef.current = add;

  const remove = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  useEffect(() => {
    const unsub = wsService.subscribe('xp_milestone', (payload) => {
      // Level-up bildirimi
      if (payload.level_up) {
        playLevelSound();
        addRef.current({
          id:    makeId(),
          kind:  'level_up',
          title: `Seviye ${payload.level_up}'e Ulaştın`,
          sub:   payload.xp_gained ? `+${payload.xp_gained} XP` : undefined,
        });
      }
      // Her rozet ayrı kart
      (payload.badges ?? []).forEach((badge) => {
        playBadgeSound();
        addRef.current({
          id:    makeId(),
          kind:  'badge',
          title: badge.name,
          sub:   badge.description ?? undefined,
        });
      });
    });
    return unsub;
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position:      'fixed',
        bottom:         20,
        right:          328,
        zIndex:         9100,
        display:       'flex',
        flexDirection: 'column-reverse',
        gap:            8,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <MilestoneNotification
          key={item.id}
          item={item}
          onRemove={() => remove(item.id)}
        />
      ))}
    </div>
  );
}
