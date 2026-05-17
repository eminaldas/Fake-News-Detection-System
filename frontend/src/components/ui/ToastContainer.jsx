// frontend/src/components/ui/ToastContainer.jsx
import React, { useCallback, useEffect, useState } from 'react';
import toast from '../../services/toast';
import Toast from './Toast';

const MAX_TOASTS = 5;

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const emit = (item) => {
      setItems(prev => {
        // Aynı id varsa replace et
        const exists = prev.findIndex(t => t.id === item.id);
        if (exists !== -1) {
          const next = [...prev];
          next[exists] = item;
          return next;
        }
        // Max 5: en eskiyi at
        const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
        return [...next, item];
      });
    };

    toast._register(emit);
    return () => toast._unregister();
  }, []);

  return (
    <div
      style={{
        position:      'fixed',
        bottom:         20,
        right:          20,
        zIndex:         9000,
        display:       'flex',
        flexDirection: 'column',
        gap:            8,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <div key={item.id} style={{ pointerEvents: 'auto' }}>
          <Toast item={item} onRemove={() => remove(item.id)} />
        </div>
      ))}
    </div>
  );
}
