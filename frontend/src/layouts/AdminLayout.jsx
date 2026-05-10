// frontend/src/layouts/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const SIDEBAR_KEY = 'admin_sidebar_open';

const AdminLayout = () => {
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      // eslint-disable-next-line no-empty
      try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-base)] overflow-hidden">
      <AdminSidebar open={open} onToggle={toggle} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
