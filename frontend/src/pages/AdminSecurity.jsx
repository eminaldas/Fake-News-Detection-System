import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert, AlertTriangle, RefreshCw,
  ChevronLeft, ChevronRight, Loader2,
  Terminal, Circle, Shield, X,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { useWebSocket } from '../contexts/WebSocketContext';
import { A, pageWrap, tableWrap, thead, th, td, badge, ghostBtn, card, cardHead, ANIM } from './adminTheme';

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
const MAX_LIVE  = 200;

/* ── Canlı Terminal ──────────────────────────────────────────────────────── */
function LiveTerminal({ events }) {
  const bottomRef    = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (isAtBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const sev2color = (sev) => {
    if (sev === 'CRITICAL') return A.red;
    if (sev === 'WARNING')  return A.amber;
    return A.blue;
  };

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ ...cardHead }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={14} color={A.brand} />
          <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Canlı Güvenlik Akışı</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: A.brand, marginLeft: 4 }}>
            <Circle size={6} fill={A.brand} style={{ animation: 'dot-blink 1.5s ease-in-out infinite' }} />
            Canlı
          </span>
        </div>
        <span style={{ fontSize: 12, color: A.text3 }}>{events.length} event (son {MAX_LIVE})</span>
      </div>
      <div ref={containerRef} style={{
        height: 220, overflowY: 'auto', background: '#0a1014',
        padding: '10px 14px', fontFamily: 'JetBrains Mono, Consolas, monospace',
        fontSize: 12, lineHeight: 1.7,
      }}>
        {events.length === 0 ? (
          <span style={{ color: A.text3 }}>
            {'>'} Bağlantı bekleniyor — WARNING/CRITICAL eventler burada görünür…
          </span>
        ) : events.map((e, i) => {
          const color = sev2color(e.severity);
          const ts    = e.created_at ? new Date(e.created_at).toLocaleTimeString('tr-TR') : '—';
          const label = EVENT_LABELS[e.event_name] || e.event_name;
          const ip    = e.ip_hash ? e.ip_hash.slice(0, 12) + '…' : '—';
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ color: A.text3, flexShrink: 0, width: 54 }}>{ts}</span>
              <span style={{ color, fontWeight: 700, flexShrink: 0, width: 68 }}>[{e.severity}]</span>
              <span style={{ color: A.text1, flex: 1 }}>
                {label}
                {e.ip_hash && <span style={{ color: A.text3 }}> ip={ip}</span>}
                {e.details?.count && <span style={{ color: A.amber }}> ×{e.details.count}</span>}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* ── IP Tehdit Listesi ───────────────────────────────────────────────────── */
function IPThreatPanel({ onSelectIP }) {
  const [threats,  setThreats]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/security/ip-threats?hours=24&min_events=2');
      setThreats(res.data.items || []);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ ...cardHead }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} color={A.brand} />
          <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>IP Tehdit Listesi</span>
          <span style={{ fontSize: 11, color: A.text3 }}>Son 24s — min. 2 olay</span>
        </div>
        <button onClick={fetch} style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <RefreshCw size={11} /> Yenile
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Loader2 size={22} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : threats.length === 0 ? (
        <p style={{ padding: '20px 16px', fontSize: 13, color: A.text3, textAlign: 'center', margin: 0 }}>
          Şüpheli IP bulunamadı
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ ...thead }}>
              <tr>
                {['IP Hash', 'Tehdit', 'Olay', 'Son Görülme', 'Event Türleri', 'Detay'].map(h => (
                  <th key={h} style={{ ...th }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threats.map(t => {
                const sc = SEVERITY_COLORS[t.threat_level] || SEVERITY_COLORS.INFO;
                return (
                  <tr key={t.ip_hash}
                    style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = A.card}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: A.text2 }}>
                      {t.ip_hash.slice(0, 18)}…
                    </td>
                    <td style={{ ...td }}>
                      <span style={{ ...badge(sc.color, sc.dim) }}>{t.threat_level}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: t.threat_level === 'CRITICAL' ? A.red : A.text1 }}>
                      {t.event_count}
                    </td>
                    <td style={{ ...td, color: A.text3, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {t.last_seen ? new Date(t.last_seen).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td style={{ ...td, color: A.text3, fontSize: 11, maxWidth: 180 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(t.event_types || []).map(et => EVENT_LABELS[et] || et).join(', ')}
                      </span>
                    </td>
                    <td style={{ ...td }}>
                      <button onClick={() => onSelectIP(t.ip_hash)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: A.brandDim, color: A.brand,
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        İncele
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── IP Detay Modal ──────────────────────────────────────────────────────── */
function IPDetailModal({ ipHash, onClose }) {
  const [events,  setEvents]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `/admin/security/ip-threats/${encodeURIComponent(ipHash)}/events?page=${page}&size=50`
      );
      setEvents(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [ipHash, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ ...card, width: '80vw', maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...cardHead }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} color={A.brand} />
            <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>IP Profil</span>
            <code style={{ fontSize: 11, color: A.text3, background: A.card, padding: '2px 8px', borderRadius: 4 }}>
              {ipHash.slice(0, 24)}…
            </code>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.text3, padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={24} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ ...thead, position: 'sticky', top: 0 }}>
                <tr>
                  {['Olay', 'Önem', 'Kullanıcı', 'Path', 'Detay', 'Zaman'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>
                      Olay bulunamadı
                    </td>
                  </tr>
                ) : events.map(e => {
                  const sc = SEVERITY_COLORS[e.severity] || SEVERITY_COLORS.INFO;
                  return (
                    <tr key={e.id} style={{ borderTop: `1px solid ${A.border}` }}>
                      <td style={{ ...td, fontWeight: 600, color: A.text1 }}>
                        {EVENT_LABELS[e.event_name] || e.event_name}
                      </td>
                      <td style={{ ...td }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.dim, color: sc.color }}>
                          {e.severity}
                        </span>
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, fontFamily: 'monospace' }}>
                        {e.user_id ? e.user_id.slice(0, 8) + '…' : '—'}
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, maxWidth: 140 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.path || '—'}
                        </span>
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, maxWidth: 180 }}>
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
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${A.border}` }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Önceki
          </button>
          <span style={{ fontSize: 12, color: A.text3 }}>{total} olay — sayfa {page} / {totalPages}</span>
          <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page * 50 >= total ? 'not-allowed' : 'pointer', color: page * 50 >= total ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page * 50 >= total ? 0.4 : 1 }}>
            Sonraki <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Ana Bileşen ─────────────────────────────────────────────────────────── */
export default function AdminSecurity() {
  const { subscribe } = useWebSocket();
  const [events,   setEvents]   = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [liveLog,  setLiveLog]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [severity, setSeverity] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [selectedIP, setSelectedIP] = useState(null);

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
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [page, severity]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const unsub = subscribe('admin_alert', (payload) => {
      const event = {
        event_name: payload.event_name || 'admin_alert',
        severity:   payload.severity  || 'CRITICAL',
        ip_hash:    payload.ip_hash,
        details:    payload.details || { message: payload.message },
        created_at: payload.created_at || new Date().toISOString(),
      };
      setAlerts(prev => [event, ...prev]);
      setLiveLog(prev => [event, ...prev].slice(0, MAX_LIVE));
    });
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    const unsub = subscribe('security_log', (payload) => {
      setLiveLog(prev => [payload, ...prev].slice(0, MAX_LIVE));
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
        <button onClick={() => { fetchAlerts(); fetchEvents(); }}
          style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Yenile
        </button>
      </div>

      {/* Critical alert banner */}
      {alerts.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 10,
          border: `1px solid rgba(239,68,68,0.30)`, background: A.redDim,
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
                <span style={{ color: A.red, fontWeight: 600 }}>
                  {EVENT_LABELS[a.event_name] || a.event_name}
                </span>
                {a.ip_hash && ` — IP: ${a.ip_hash.slice(0, 14)}…`}
                {a.details?.subnet_hash && ` (subnet: ${a.details.subnet_hash.slice(0, 8)}…)`}
              </div>
            ))}
            {alerts.length > 3 && (
              <div style={{ fontSize: 12, color: A.text3 }}>+{alerts.length - 3} daha…</div>
            )}
          </div>
        </div>
      )}

      {/* Canlı terminal */}
      <LiveTerminal events={liveLog} />

      {/* IP Tehdit Listesi */}
      <IPThreatPanel onSelectIP={setSelectedIP} />

      {/* Audit log filtreler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {['', 'CRITICAL', 'WARNING', 'INFO'].map(s => {
          const active = severity === s;
          const sc = s ? SEVERITY_COLORS[s] : null;
          return (
            <button key={s}
              onClick={() => { setSeverity(s); setPage(1); }}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${active ? (sc?.color ?? A.brand) : A.border}`,
                background: active ? (sc?.dim ?? A.brandDim) : 'transparent',
                color: active ? (sc?.color ?? A.brand) : A.text3,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.12s',
              }}>
              {s || 'Tümü'}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: A.text3 }}>
          {total} olay (son 24s)
        </span>
      </div>

      {/* Audit log tablosu */}
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
                        <button
                          onClick={() => e.ip_hash && setSelectedIP(e.ip_hash)}
                          style={{ background: 'none', border: 'none', cursor: e.ip_hash ? 'pointer' : 'default', color: e.ip_hash ? A.brand : A.text3, fontFamily: 'monospace', fontSize: 12, padding: 0 }}
                        >
                          {e.ip_hash?.slice(0, 16)}…
                        </button>
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

      {/* IP Detay Modal */}
      {selectedIP && (
        <IPDetailModal ipHash={selectedIP} onClose={() => setSelectedIP(null)} />
      )}

      <style>{ANIM}</style>
    </div>
  );
}
