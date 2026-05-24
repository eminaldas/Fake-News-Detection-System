import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useWebSocket } from '../contexts/WebSocketContext';
import { A, pageWrap, tableWrap, thead, th, td, badge, ghostBtn, ANIM } from './adminTheme';

const SEVERITY_COLORS = {
  CRITICAL: { color: A.red,   dim: A.redDim   },
  WARNING:  { color: A.amber, dim: A.amberDim },
  INFO:     { color: A.blue,  dim: A.blueDim  },
};

const EVENT_LABELS = {
  'auth.login_failed':                     'Başarısız Giriş',
  'auth.login_success':                    'Başarılı Giriş',
  'ratelimit.exceeded':                    'Rate Limit Aşımı',
  'security.credential_stuffing_detected': 'Credential Stuffing',
  'security.abuse_pattern':                'Kötüye Kullanım',
  'security.geo_anomaly':                  'Coğrafi Anomali',
  'admin.action':                          'Admin Eylemi',
};

const PAGE_SIZE = 50;

export default function AdminSecurity() {
  const { subscribe } = useWebSocket();
  const [events,   setEvents]   = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [severity, setSeverity] = useState('');
  const [loading,  setLoading]  = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/admin/logs/alerts');
      setAlerts(res.data.alerts || []);
    } catch { /* sessiz */ }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ hours: 24, page, size: PAGE_SIZE });
      if (severity) params.set('severity', severity);
      const res = await axiosInstance.get(`/admin/logs/security?${params}`);
      setEvents(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally {
      setLoading(false);
    }
  }, [page, severity]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const unsub = subscribe('admin_alert', (payload) => {
      setAlerts(prev => [{
        event_name: 'admin_alert',
        severity:   payload.severity || 'CRITICAL',
        details:    { message: payload.message },
        ...payload,
      }, ...prev]);
    });
    return unsub;
  }, [subscribe]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={20} color={A.brand} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Güvenlik Merkezi</h1>
          {alerts.length > 0 && (
            <span style={{ ...badge(A.red, A.redDim) }}>{alerts.length} kritik alert</span>
          )}
        </div>
        <button
          onClick={() => { fetchAlerts(); fetchEvents(); }}
          style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={13} />
          Yenile
        </button>
      </div>

      {/* Critical alert banner */}
      {alerts.length > 0 && (
        <div style={{
          marginBottom: 20,
          padding:      '14px 18px',
          borderRadius: 10,
          border:       `1px solid rgba(239,68,68,0.30)`,
          background:   A.redDim,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color={A.red} />
            <span style={{ fontSize: 13, fontWeight: 700, color: A.red }}>
              {alerts.length} Aktif Kritik Alert
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: A.text2 }}>
                <span style={{ color: A.red, fontWeight: 600 }}>{EVENT_LABELS[a.event_name] || a.event_name}</span>
                {a.ip_hash && ` — IP: ${a.ip_hash.slice(0, 14)}...`}
                {a.details?.subnet_hash && ` (subnet: ${a.details.subnet_hash.slice(0, 8)}...)`}
              </div>
            ))}
            {alerts.length > 3 && (
              <div style={{ fontSize: 12, color: A.text3 }}>+{alerts.length - 3} daha…</div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {['', 'CRITICAL', 'WARNING', 'INFO'].map(s => {
          const active = severity === s;
          const sc = s ? SEVERITY_COLORS[s] : null;
          return (
            <button
              key={s}
              onClick={() => { setSeverity(s); setPage(1); }}
              style={{
                padding:      '6px 14px',
                borderRadius: 8,
                border:       active
                  ? `1px solid ${sc ? sc.color : A.brand}`
                  : `1px solid ${A.border}`,
                background:   active ? (sc ? sc.dim : A.brandDim) : 'transparent',
                color:        active ? (sc ? sc.color : A.brand) : A.text3,
                fontSize:     12,
                fontWeight:   600,
                cursor:       'pointer',
                fontFamily:   'inherit',
                transition:   'all 0.12s',
              }}
            >
              {s || 'Tümü'}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: A.text3 }}>
          {total} olay (son 24s)
        </span>
      </div>

      {/* Table */}
      <div style={{ ...tableWrap }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ ...thead }}>
                <tr>
                  {['Olay', 'Önem', 'IP Hash', 'Kullanıcı', 'Detay', 'Zaman'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
                      Bu zaman aralığında olay bulunamadı
                    </td>
                  </tr>
                ) : events.map(e => {
                  const sc = SEVERITY_COLORS[e.severity];
                  return (
                    <tr key={e.id}
                      style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={el => el.currentTarget.style.background = A.card}
                      onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...td, fontWeight: 600, color: A.text1 }}>
                        {EVENT_LABELS[e.event_name] || e.event_name}
                      </td>
                      <td style={{ ...td }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 9px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: sc?.dim  || A.brandDim,
                          color:      sc?.color || A.brand,
                        }}>
                          {e.severity}
                        </span>
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, fontFamily: 'monospace' }}>
                        {e.ip_hash?.slice(0, 16)}…
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, fontFamily: 'monospace' }}>
                        {e.user_id ? e.user_id.slice(0, 8) + '…' : '—'}
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, maxWidth: 240 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.details && Object.keys(e.details).length > 0
                            ? Object.entries(e.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')
                            : '—'}
                        </span>
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(e.created_at).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${A.border}` }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Önceki
          </button>
          <span style={{ fontSize: 12, color: A.text3 }}>{page} / {totalPages}</span>
          <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page * PAGE_SIZE >= total ? 'not-allowed' : 'pointer', color: page * PAGE_SIZE >= total ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page * PAGE_SIZE >= total ? 0.4 : 1 }}>
            Sonraki <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style>{ANIM}</style>
    </div>
  );
}
