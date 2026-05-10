// frontend/src/layouts/AdminSidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldAlert, BarChart2,
  MessageSquare, Flag, Database, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';

const NAV_SECTIONS = [
  {
    label: 'Genel',
    items: [
      { to: '/admin',            end: true,  icon: LayoutDashboard, label: 'Dashboard'    },
      { to: '/admin/users',                  icon: Users,           label: 'Kullanıcılar' },
      { to: '/admin/security',               icon: ShieldAlert,     label: 'Güvenlik', badge: true },
      { to: '/admin/analytics',              icon: BarChart2,       label: 'Analitik'    },
    ],
  },
  {
    label: 'İçerik',
    items: [
      { to: '/admin/forum',      icon: MessageSquare, label: 'Forum'       },
      { to: '/admin/moderation', icon: Flag,          label: 'Moderasyon'  },
      { to: '/admin/dataset',    icon: Database,      label: 'Dataset'     },
    ],
  },
];

const AdminSidebar = ({ open, onToggle }) => {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    axiosInstance
      .get('/admin/logs/alerts')
      .then(res => setAlertCount(res.data?.alerts?.length ?? 0))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      style={{ width: open ? 188 : 52 }}
      className="flex flex-col h-full bg-[var(--color-bg-surface)] border-r border-[var(--color-border)] transition-[width] duration-200 overflow-hidden shrink-0"
    >
      {/* Marka + toggle */}
      <div className="flex items-center gap-2 px-3 py-4 shrink-0">
        <div className="w-6 h-6 rounded-md bg-[var(--color-brand-primary)] shrink-0" />
        {open && (
          <span className="text-[10px] font-extrabold tracking-widest text-[var(--color-text-primary)] uppercase">
            Admin
          </span>
        )}
        <button
          onClick={onToggle}
          title={open ? 'Daralt' : 'Genişlet'}
          className="ml-auto w-5 h-5 flex items-center justify-center rounded bg-[var(--color-bg-base)] border border-[var(--color-border)] hover:bg-[var(--color-brand-accent)] transition-colors shrink-0"
        >
          {open
            ? <ChevronLeft  className="w-3 h-3 text-[var(--color-text-secondary)]" />
            : <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
          }
        </button>
      </div>

      <div className="h-px bg-[var(--color-border)] mx-3 mb-1 shrink-0" />

      {/* Navigasyon */}
      <nav className="flex flex-col gap-0.5 flex-1 px-1.5 overflow-y-auto overflow-x-hidden">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {open
              ? (
                <p className="px-2 pt-3 pb-1 text-[7px] font-bold font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                  {section.label}
                </p>
              )
              : <div className="h-3" />
            }
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={!open ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-2 py-[7px] text-[9px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--color-brand-primary)]' : ''}`}
                    />
                    {open && (
                      <>
                        <span className="truncate font-mono">{item.label}</span>
                        {item.badge && alertCount > 0 && (
                          <span className="ml-auto text-[7px] font-bold px-1 py-0.5 rounded bg-[var(--color-fake-bg)] text-[var(--color-fake-text)]">
                            {alertCount}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Cikis */}
      <div className="shrink-0">
        <div className="h-px bg-[var(--color-border)] mx-3 my-2" />
        <div className="px-1.5 pb-3">
          <button
            onClick={handleLogout}
            title={!open ? 'Çıkış' : undefined}
            className="flex items-center gap-2 w-full rounded-md px-2 py-[7px] text-[9px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-base)] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {open && <span className="font-mono">Çıkış</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
