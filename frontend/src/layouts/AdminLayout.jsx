import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

const SIDEBAR_KEY = 'admin_sidebar_open';

const A = {
  bg:      '#0f1419',
  surface: '#161c22',
  border:  '#2d343d',
  text1:   '#eef2f7',
  text2:   '#c9d1d9',
  text3:   '#7d8896',
  brand:   '#10b981',
  red:     '#ef4444',
};

const BREADCRUMBS = {
  '/admin':            'Ana Panel',
  '/admin/users':      'Kullanıcılar',
  '/admin/analytics':  'Analitik',
  '/admin/moderation': 'Moderasyon',
  '/admin/forum':      'Forum Kuyruğu',
  '/admin/dataset':    'Dataset',
  '/admin/security':   'Güvenlik',
  '/admin/ab-test':    'A/B Test',
};

const AdminLayout = () => {
  const [open, setOpen] = useState(() => {
    try {
      const s = localStorage.getItem(SIDEBAR_KEY);
      return s === null ? true : s === 'true';
    } catch { return true; }
  });
  const location = useLocation();

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch {}
    return next;
  });

  const currentPage = BREADCRUMBS[location.pathname] ?? 'Admin';

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      background: A.bg,
      overflow:   'hidden',
      fontFamily: 'Elms Sans, system-ui, sans-serif',
    }}>
      <AdminSidebar open={open} onToggle={toggle} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{
          background:   A.surface,
          borderBottom: `1px solid ${A.border}`,
          height:       56,
          padding:      '0 24px',
          display:      'flex',
          alignItems:   'center',
          gap:          12,
          flexShrink:   0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: A.text3 }}>
            <span>Admin</span>
            <span style={{ opacity: 0.4 }}>›</span>
            <span style={{ color: A.text1, fontWeight: 600 }}>{currentPage}</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* System status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: A.brand,
                boxShadow: `0 0 6px rgba(16,185,129,0.5)`,
                display: 'inline-block',
                animation: 'dot-blink 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: A.brand }}>Sistem Aktif</span>
            </div>

            <div style={{ width: 1, height: 18, background: A.border }} />

            {/* Notification bell */}
            <button
              title="Bildirimler"
              style={{
                position:       'relative',
                width: 34, height: 34,
                background:     A.bg,
                border:         `1px solid ${A.border}`,
                borderRadius:   8,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
                color:          A.text2,
              }}
            >
              <Bell size={15} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: A.bg }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes dot-blink { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
};

export default AdminLayout;
