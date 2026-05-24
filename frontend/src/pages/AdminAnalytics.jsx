import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Users, Activity, Loader2, Server, AlertTriangle } from 'lucide-react';
import axiosInstance from '../api/axios';
import { A, pageWrap, card, cardHead, ANIM } from './adminTheme';

const TYPE_COLORS = {
  text:  { color: A.blue,   dim: A.blueDim   },
  url:   { color: A.purple, dim: A.purpleDim },
  image: { color: A.brand,  dim: A.brandDim  },
};
const TYPE_LABELS = { text: 'Metin', url: 'URL', image: 'Görsel' };

function HealthRow({ label, value, color }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '12px 20px',
      borderBottom:   `1px solid ${A.border}`,
    }}>
      <span style={{ fontSize: 13, color: A.text2 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default function AdminAnalytics() {
  const [dailyData, setDailyData] = useState([]);
  const [typeData,  setTypeData]  = useState([]);
  const [topUsers,  setTopUsers]  = useState([]);
  const [health,    setHealth]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [days,      setDays]      = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [daily, types, users, sys] = await Promise.all([
        axiosInstance.get(`/admin/logs/analytics/daily?days=${days}`),
        axiosInstance.get(`/admin/logs/analytics/analysis-types?days=${days}`),
        axiosInstance.get('/admin/logs/analytics/top-users?days=7'),
        axiosInstance.get('/admin/logs/system/health'),
      ]);
      setDailyData(daily.data.data  || []);
      setTypeData(types.data.data   || []);
      setTopUsers(users.data.data   || []);
      setHealth(sys.data);
    } catch { /* sessiz */ } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalAnalyses = dailyData.reduce((s, d) => s + d.total, 0);
  const maxDaily      = Math.max(...dailyData.map(d => d.total), 1);
  const typeTotal     = typeData.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={20} color={A.brand} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Kullanım Analitiği</h1>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding:    '7px 16px',
                borderRadius: 8,
                border:     `1px solid ${days === d ? A.brand : A.border}`,
                background: days === d ? A.brandDim : 'transparent',
                color:      days === d ? A.brand : A.text3,
                fontSize:   12,
                fontWeight: 600,
                cursor:     'pointer',
                fontFamily: 'inherit',
              }}
            >
              {d}g
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          {health && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { icon: Activity,      label: `Toplam Analiz (${days}g)`, value: totalAnalyses, color: A.brand },
                { icon: AlertTriangle, label: 'Worker Hatası (son 1s)',   value: health.errors_last_1h,   color: health.errors_last_1h > 0 ? A.red : A.brand },
                { icon: Server,        label: 'Kritik Alert (son 1s)',    value: health.critical_last_1h, color: health.critical_last_1h > 0 ? A.red : A.brand },
              ].map(item => (
                <div key={item.label} style={{
                  ...card,
                  borderTop: `2px solid ${item.color}`,
                  padding:   '18px 22px',
                  display:   'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <item.icon size={14} color={item.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3 }}>
                      {item.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: item.color, lineHeight: 1 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Daily chart */}
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ ...cardHead }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Günlük Analiz Hacmi</span>
              <span style={{ fontSize: 12, color: A.text3 }}>{totalAnalyses} toplam</span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {dailyData.length === 0 ? (
                <p style={{ textAlign: 'center', color: A.text3, fontSize: 13, padding: '24px 0' }}>Veri yok</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                  {dailyData.slice(-days).map(d => (
                    <div
                      key={d.day}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}
                      title={`${d.day?.slice(5)}: ${d.total}`}
                    >
                      <div style={{
                        width:        '100%',
                        height:       `${Math.max(4, (d.total / maxDaily) * 100)}%`,
                        background:   A.brand,
                        opacity:      0.7,
                        borderRadius: '3px 3px 0 0',
                        transition:   'opacity 0.12s',
                        cursor:       'default',
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type distribution + top users */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Type distribution */}
            <div style={{ ...card }}>
              <div style={{ ...cardHead }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Analiz Tipi Dağılımı</span>
                <span style={{ fontSize: 12, color: A.text3 }}>{days}g</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {typeData.length === 0 ? (
                  <p style={{ color: A.text3, fontSize: 13 }}>Veri yok</p>
                ) : typeData.map(t => {
                  const pct = typeTotal > 0 ? Math.round((t.count / typeTotal) * 100) : 0;
                  const tc  = TYPE_COLORS[t.type] || { color: A.text3, dim: A.card };
                  return (
                    <div key={t.type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.color }}>
                          {TYPE_LABELS[t.type] || t.type}
                        </span>
                        <span style={{ fontSize: 12, color: A.text3 }}>{t.count} (%{pct})</span>
                      </div>
                      <div style={{ height: 6, background: A.card, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height:     '100%',
                          width:      `${pct}%`,
                          background: tc.color,
                          borderRadius: 3,
                          opacity:    0.8,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top users */}
            <div style={{ ...card }}>
              <div style={{ ...cardHead }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={14} color={A.brand} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>En Aktif Kullanıcılar</span>
                </div>
                <span style={{ fontSize: 12, color: A.text3 }}>7g</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {topUsers.length === 0 ? (
                  <p style={{ padding: '16px 20px', color: A.text3, fontSize: 13 }}>Veri yok</p>
                ) : topUsers.map((u, i) => (
                  <div key={u.user_id} style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '10px 20px',
                    borderBottom:   `1px solid ${A.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: i < 3 ? A.amber : A.text3, textAlign: 'right' }}>
                        {i + 1}.
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: A.text1 }}>{u.username}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: A.brand }}>{u.count} analiz</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}

      <style>{ANIM}</style>
    </div>
  );
}
