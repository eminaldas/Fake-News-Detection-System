import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, X, Trash2 } from 'lucide-react';
import popup from '../../services/popup';

export default function Popup() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    popup._register(setDialog);
    return () => popup._unregister();
  }, []);

  useEffect(() => {
    if (dialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handler = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialog]);

  const close   = () => setDialog(null);
  const confirm = async () => {
    close();
    try { await dialog?.onConfirm?.(); } catch { /* onConfirm kendi catch'ini yönetir */ }
  };

  if (!dialog) return null;

  const isConfirm = dialog.type === 'confirm';
  const accentColor = isConfirm
    ? (dialog.danger !== false ? '#ef4444' : '#10b981')
    : '#3b82f6';

  const TitleIcon = isConfirm
    ? (dialog.danger !== false ? AlertTriangle : CheckCircle)
    : Info;

  return (
    <div
      onClick={isConfirm ? undefined : close}
      style={{
        position:       'fixed',
        inset:           0,
        background:     'rgba(0,0,0,0.6)',
        zIndex:          9500,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:         16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   '#1c2128',
          border:       '1px solid #30363d',
          borderTop:    `2px solid ${accentColor}`,
          borderRadius:  6,
          padding:       20,
          maxWidth:      420,
          width:        '100%',
          boxShadow:    '0 4px 32px rgba(0,0,0,0.55)',
          animation:    'popup-enter 0.2s ease-out',
        }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TitleIcon size={17} color={accentColor} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#eef2f7' }}>
              {dialog.title}
            </span>
          </div>
          {!isConfirm && (
            <button
              onClick={close}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: 0, display: 'flex' }}
              aria-label="Kapat"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* İçerik */}
        {dialog.message && (
          <p style={{ fontSize: '0.78rem', color: '#8b949e', lineHeight: 1.65, margin: '0 0 14px' }}>
            {dialog.message}
          </p>
        )}
        {dialog.content && (
          <div style={{ marginBottom: 14 }}>{dialog.content}</div>
        )}

        {/* Aksiyonlar — sadece confirm */}
        {isConfirm && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={close}
              style={{
                fontSize: '0.74rem', padding: '6px 16px', borderRadius: 4,
                background: 'transparent', color: '#8b949e',
                border: '1px solid #30363d', cursor: 'pointer', fontWeight: 500,
              }}
            >
              {dialog.cancelLabel ?? 'İptal'}
            </button>
            <button
              onClick={confirm}
              style={{
                fontSize: '0.74rem', padding: '6px 16px', borderRadius: 4,
                background: accentColor, color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {dialog.danger !== false && <Trash2 size={12} />}
              {dialog.confirmLabel ?? 'Onayla'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
