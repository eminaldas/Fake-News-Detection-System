import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldAlert, BarChart2,
  MessageSquare, Flag, Database, LogOut,
  ChevronLeft, ChevronRight, FlaskConical, Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';

const A = {
  bg:       '#0f1419',
  surface:  '#161c22',
  card:     '#1d2329',
  border:   '#2d343d',
  text1:    '#eef2f7',
  text2:    '#c9d1d9',
  text3:    '#7d8896',
  brand:    '#10b981',
  brandDim: 'rgba(16,185,129,0.12)',
  red:      '#ef4444',
  redDim:   'rgba(239,68,68,0.12)',
  amber:    '#f59e0b',
  amberDim: 'rgba(245,158,11,0.12)',
  blue:     '#3b82f6',
  blueDim:  'rgba(59,130,246,0.12)',
};

const SECTIONS = [
  {
    label: 'Genel',
    items: [
      { to: '/admin',           end: true,  icon: LayoutDashboard, label: 'Ana Panel'      },
      { to: '/admin/users',                 icon: Users,           label: 'Kullanıcılar', badgeKey: 'users'    },
      { to: '/admin/analytics',             icon: BarChart2,       label: 'Analitik'       },
    ],
  },
  {
    label: 'İçerik & Moderasyon',
    items: [
      { to: '/admin/moderation', icon: Flag,         label: 'Moderasyon',  badgeKey: 'reports'  },
      { to: '/admin/forum',      icon: MessageSquare,label: 'Forum',       badgeKey: 'forum'    },
      { to: '/admin/dataset',    icon: Database,     label: 'Dataset'      },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/admin/security',   icon: ShieldAlert,  label: 'Güvenlik',   badgeKey: 'alerts'   },
      { to: '/admin/ab-test',    icon: FlaskConical, label: 'A/B Test'    },
    ],
  },
];

const BADGE_COLORS = {
  alerts:  { color: A.red,   dim: A.redDim  },
  reports: { color: A.red,   dim: A.redDim  },
  forum:   { color: A.amber, dim: A.amberDim },
  users:   { color: A.brand, dim: A.brandDim },
};

const AdminSidebar = ({ open, onToggle }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState({ alerts: 0, reports: 0, forum: 0 });

  useEffect(() => {
    axiosInstance.get('/admin/stats/overview').then(res => {
      const d = res.data;
      setBadges(prev => ({
        ...prev,
        alerts:  d.critical_alerts ?? 0,
        reports: d.pending_reports ?? 0,
      }));
    }).catch(() => {});

    axiosInstance.get('/admin/forum/queue?page=1&size=1').then(res => {
      setBadges(prev => ({ ...prev, forum: res.data.total ?? 0 }));
    }).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'A';

  return (
    <aside style={{
      width:        open ? 260 : 56,
      minWidth:     open ? 260 : 56,
      background:   A.surface,
      borderRight:  `1px solid ${A.border}`,
      display:      'flex',
      flexDirection:'column',
      height:       '100vh',
      overflow:     'hidden',
      transition:   'width 0.2s ease, min-width 0.2s ease',
      flexShrink:   0,
    }}>

      {/* Logo */}
      <div style={{
        padding:     '20px 16px 16px',
        display:     'flex',
        alignItems:  'center',
        gap:         12,
        borderBottom:`1px solid ${A.border}`,
        flexShrink:  0,
      }}>
        <div style={{
          width: 34, height: 34,
          background:   A.brand,
          borderRadius: 9,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          flexShrink:   0,
          boxShadow:    `0 0 14px rgba(16,185,129,0.30)`,
        }}>
          <Activity size={17} color="#fff" />
        </div>
        {open && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: A.text1, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              NëHaber
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: A.brand, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 2 }}>
              Admin Paneli
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          title={open ? 'Daralt' : 'Genişlet'}
          style={{
            marginLeft:     open ? 0 : 'auto',
            width: 24, height: 24,
            background:     'transparent',
            border:         `1px solid ${A.border}`,
            borderRadius:   6,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            color:          A.text3,
            flexShrink:     0,
          }}
        >
          {open
            ? <ChevronLeft  size={12} />
            : <ChevronRight size={12} />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {SECTIONS.map(section => (
          <div key={section.label}>
            {open && (
              <div style={{
                padding:       '14px 20px 5px',
                fontSize:      10,
                fontWeight:    700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color:         A.text3,
              }}>
                {section.label}
              </div>
            )}
            {!open && <div style={{ height: 8 }} />}

            {section.items.map(item => {
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
              const bc = item.badgeKey ? BADGE_COLORS[item.badgeKey] : null;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={!open ? item.label : undefined}
                  style={({ isActive }) => ({
                    display:        'flex',
                    alignItems:     'center',
                    gap:            10,
                    margin:         '1px 8px',
                    padding:        open ? '9px 12px' : '9px 0',
                    justifyContent: open ? 'flex-start' : 'center',
                    borderRadius:   8,
                    textDecoration: 'none',
                    fontSize:       13,
                    fontWeight:     600,
                    color:          isActive ? A.brand : A.text2,
                    background:     isActive ? A.brandDim : 'transparent',
                    transition:     'background 0.12s, color 0.12s',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} style={{ flexShrink: 0, color: isActive ? A.brand : A.text3 }} />
                      {open && (
                        <>
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </span>
                          {badgeCount > 0 && bc && (
                            <span style={{
                              background:   bc.dim,
                              color:        bc.color,
                              fontSize:     10,
                              fontWeight:   700,
                              padding:      '2px 7px',
                              borderRadius: 20,
                              flexShrink:   0,
                            }}>
                              {badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: `1px solid ${A.border}`, flexShrink: 0 }}>
        <div style={{
          padding:     '14px 16px',
          display:     'flex',
          alignItems:  'center',
          gap:         10,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background:   `linear-gradient(135deg, ${A.brand}, #059669)`,
            display:      'flex',
            alignItems:   'center',
            justifyContent:'center',
            fontSize:     12,
            fontWeight:   700,
            color:        '#fff',
            flexShrink:   0,
          }}>
            {initials}
          </div>
          {open && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: A.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.username || 'admin'}
                </div>
                <div style={{ fontSize: 10, color: A.brand, fontWeight: 600 }}>Süper Admin</div>
              </div>
              <button
                onClick={handleLogout}
                title="Çıkış"
                style={{
                  width: 28, height: 28,
                  background:     'transparent',
                  border:         `1px solid ${A.border}`,
                  borderRadius:   6,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  color:          A.text3,
                  flexShrink:     0,
                  transition:     'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = A.red; e.currentTarget.style.color = A.red; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = A.border; e.currentTarget.style.color = A.text3; }}
              >
                <LogOut size={12} />
              </button>
            </>
          )}
          {!open && (
            <button
              onClick={handleLogout}
              title="Çıkış"
              style={{
                display: 'none',
              }}
            />
          )}
        </div>
        {!open && (
          <div style={{ padding: '0 12px 12px' }}>
            <button
              onClick={handleLogout}
              title="Çıkış"
              style={{
                width:          '100%',
                height:         28,
                background:     'transparent',
                border:         `1px solid ${A.border}`,
                borderRadius:   6,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
                color:          A.text3,
              }}
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
