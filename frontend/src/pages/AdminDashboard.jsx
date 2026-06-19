import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, AlertTriangle, BarChart2, FileWarning,
  RefreshCw, TrendingUp, Users, Shield, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import toast from '../services/toast';
import { A, pageWrap, card, cardHead, badge, ANIM } from './adminTheme';

function StatCard({ icon: Icon, label, value, sub, color, dim, loading }) {
  return (
    <div style={{
      ...card,
      borderTop:     `2px solid ${color}`,
      padding:       '20px 22px',
      display:       'flex',
      flexDirection: 'column',
      gap:           10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3 }}>
          {label}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: dim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      {loading ? (
        <div style={{ height: 36, background: A.border, borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: A.text3 }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

function QuickLink({ label, href, color, navigate }) {
  return (
    <div
      onClick={() => navigate(href)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        padding:    '10px 14px',
        borderRadius: 8,
        cursor:     'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = A.card}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color }}>{label}</span>
      <ChevronRight size={13} color={A.text3} />
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [daily,   setDaily]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, dailyRes] = await Promise.all([
        axiosInstance.get('/admin/stats/overview'),
        axiosInstance.get('/admin/logs/analytics/daily?days=7'),
      ]);
      setStats(statsRes.data);
      setDaily(dailyRes.data.data?.slice(-5).reverse() ?? []);
      setLastUpd(new Date());
    } catch (err) {
      toast.error('Dashboard verileri yüklenemedi', { sub: err.response?.data?.detail ?? err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const fakeRatePct = stats ? `%${(stats.fake_rate_24h * 100).toFixed(1)}` : '—';
  const fakeColor   = stats?.fake_rate_24h > 0.4 ? A.red : stats?.fake_rate_24h > 0.2 ? A.amber : A.brand;
  const fakeDim     = stats?.fake_rate_24h > 0.4 ? A.redDim : stats?.fake_rate_24h > 0.2 ? A.amberDim : A.brandDim;

  const maxDaily = Math.max(...daily.map(d => d.total), 1);

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Genel Bakış</h1>
          <p style={{ fontSize: 12, color: A.text3, margin: '4px 0 0' }}>
            {lastUpd
              ? `Son güncelleme: ${lastUpd.toLocaleTimeString('tr-TR')}`
              : 'Yükleniyor…'}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${A.border}`,
            borderRadius: 8,
            color: A.text3,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Elms Sans, system-ui, sans-serif',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Yenile
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={Activity}
          label="24s Analiz"
          value={loading ? '…' : (stats?.total_analyses_24h ?? 0)}
          sub="Son 24 saatte yapılan analiz"
          color={A.brand} dim={A.brandDim}
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Dezinformasyon Oranı"
          value={loading ? '…' : fakeRatePct}
          sub={loading ? '' : `${stats?.fake_count_24h ?? 0} sahte / ${stats?.total_analyses_24h ?? 0} toplam`}
          color={fakeColor} dim={fakeDim}
          loading={loading}
        />
        <StatCard
          icon={FileWarning}
          label="Bekleyen İhbar"
          value={loading ? '…' : (stats?.pending_reports ?? 0)}
          sub="Açık kullanıcı raporları"
          color={(stats?.pending_reports ?? 0) > 0 ? A.amber : A.brand}
          dim={(stats?.pending_reports ?? 0) > 0 ? A.amberDim : A.brandDim}
          loading={loading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Kritik Uyarı"
          value={loading ? '…' : (stats?.critical_alerts ?? 0)}
          sub="Redis'teki aktif alertler"
          color={(stats?.critical_alerts ?? 0) > 0 ? A.red : A.brand}
          dim={(stats?.critical_alerts ?? 0) > 0 ? A.redDim : A.brandDim}
          loading={loading}
        />
      </div>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Left: daily chart + quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Daily chart */}
          <div style={card}>
            <div style={{ ...cardHead }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={14} color={A.brand} />
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Son 5 Günlük Analiz Hacmi</span>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {loading ? (
                <div style={{ height: 80, background: A.border, borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
              ) : daily.length === 0 ? (
                <div style={{ textAlign: 'center', color: A.text3, fontSize: 13, padding: '20px 0' }}>
                  Son 5 günde analiz yapılmadı
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {daily.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 70, fontSize: 12, color: A.text3, flexShrink: 0 }}>{d.day}</span>
                      <div style={{ flex: 1, height: 20, background: A.card, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height:     '100%',
                          width:      `${Math.max(4, (d.total / maxDaily) * 100)}%`,
                          background: A.brand,
                          borderRadius: 4,
                          opacity:    0.8,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span style={{ width: 36, fontSize: 12, fontWeight: 700, color: A.brand, textAlign: 'right', flexShrink: 0 }}>
                        {d.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div style={card}>
            <div style={{ ...cardHead }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={14} color={A.brand} />
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Hızlı Erişim</span>
              </div>
            </div>
            <div style={{ padding: '8px 6px' }}>
              {[
                { label: 'Kullanıcı Yönetimi',   href: '/admin/users',      color: A.brand  },
                { label: 'Güvenlik Logları',      href: '/admin/security',   color: A.red    },
                { label: 'Forum Moderasyonu',     href: '/admin/forum',      color: A.amber  },
                { label: 'Moderasyon Kuyruğu',    href: '/admin/moderation', color: A.amber  },
                { label: 'Dataset & Override',    href: '/admin/dataset',    color: A.blue   },
                { label: 'A/B Test Sonuçları',    href: '/admin/ab-test',    color: A.text3  },
              ].map(item => (
                <QuickLink key={item.href} {...item} navigate={navigate} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: alerts + summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Alert summary */}
          <div style={card}>
            <div style={{ ...cardHead }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color={A.red} />
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Sistem Durumu</span>
              </div>
              {(stats?.critical_alerts ?? 0) > 0 && (
                <span style={{ ...badge(A.red, A.redDim) }}>
                  {stats.critical_alerts} kritik
                </span>
              )}
            </div>
            <div>
              {[
                { label: 'Bekleyen Raporlar',    val: stats?.pending_reports ?? 0,  color: (stats?.pending_reports ?? 0) > 0 ? A.amber : A.brand },
                { label: 'Kritik Alertler',      val: stats?.critical_alerts ?? 0,  color: (stats?.critical_alerts ?? 0) > 0 ? A.red : A.brand },
                { label: 'Sahte Tespit (24s)',   val: stats?.fake_count_24h ?? 0,    color: (stats?.fake_count_24h ?? 0) > 10 ? A.amber : A.brand },
              ].map(row => (
                <div key={row.label} style={{
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'space-between',
                  padding:       '12px 20px',
                  borderBottom:  `1px solid ${A.border}`,
                }}>
                  <span style={{ fontSize: 13, color: A.text2 }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{loading ? '…' : row.val}</span>
                </div>
              ))}
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: A.text2 }}>Dezinformasyon Oranı</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: fakeColor }}>{loading ? '…' : fakeRatePct}</span>
              </div>
            </div>
          </div>

          {/* Weekly actions */}
          <div style={card}>
            <div style={{ ...cardHead }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color={A.blue} />
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Hızlı İstatistik</span>
              </div>
            </div>
            <div style={{ padding: '8px 0' }}>
              {[
                { label: 'Toplam Analiz (24s)', val: stats?.total_analyses_24h ?? 0, color: A.text1 },
                { label: 'Doğrulanan İçerik',  val: (stats?.total_analyses_24h ?? 0) - (stats?.fake_count_24h ?? 0), color: A.brand },
                { label: 'Sahte Tespit',        val: stats?.fake_count_24h ?? 0,      color: A.red   },
              ].map(row => (
                <div key={row.label} style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  padding:        '11px 20px',
                  borderBottom:   `1px solid ${A.border}`,
                }}>
                  <span style={{ fontSize: 13, color: A.text2 }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{loading ? '…' : row.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{ANIM}</style>
    </div>
  );
}
