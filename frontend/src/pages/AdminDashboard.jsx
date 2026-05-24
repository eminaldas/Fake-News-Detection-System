import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, AlertTriangle, BarChart2, FileWarning,
  RefreshCw, TrendingUp, Shield, Clock,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from '../services/toast';

const C = {
  bg:     '#070f12',
  card:   '#0d1a1f',
  border: '#1a2f38',
  neon:   '#00e5a0',
  red:    '#ff5555',
  yellow: '#ffcc00',
  blue:   '#38bdf8',
  text:   '#c8e6f0',
  muted:  '#5a7a88',
};

const cardStyle = {
  background:   C.card,
  border:       `1px solid ${C.border}`,
  borderRadius:  8,
  padding:       20,
};

function MetricCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div style={{ ...cardStyle, borderTop: `2px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={15} color={color} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      </div>
      {loading ? (
        <div style={{ height: 32, background: C.border, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: C.muted }}>
              {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecentAnalyticsFeed({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 36, background: C.border, borderRadius: 4, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.75rem', padding: '20px 0' }}>
        Son 24 saatte analiz yok
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: C.bg, borderRadius: 4 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.text }}>
            {d.day}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.neon, fontWeight: 600 }}>
            {d.total} analiz
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [daily, setDaily]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, dailyRes] = await Promise.all([
        axiosInstance.get('/admin/stats/overview'),
        axiosInstance.get('/admin/logs/analytics/daily?days=7'),
      ]);
      setStats(statsRes.data);
      setDaily(dailyRes.data.data?.slice(-5).reverse() ?? []);
      setLastUpdate(new Date());
    } catch (err) {
      toast.error('Dashboard verileri yüklenemedi', { sub: err.response?.data?.detail ?? err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 30_000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const fakeRatePct = stats ? `%${(stats.fake_rate_24h * 100).toFixed(1)}` : '—';
  const fakeColor   = stats?.fake_rate_24h > 0.4 ? C.red : stats?.fake_rate_24h > 0.2 ? C.yellow : C.neon;

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: 24, color: C.text }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: C.text, margin: 0 }}>
            Admin Paneli
          </h1>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: C.muted, margin: '4px 0 0' }}>
            {lastUpdate ? `Güncellendi: ${lastUpdate.toLocaleTimeString('tr-TR')}` : 'Yükleniyor…'}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.muted, cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Inter, sans-serif',
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Yenile
        </button>
      </div>

      {/* Metrik kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard
          icon={Activity}
          label="24s Analiz"
          value={loading ? '…' : (stats?.total_analyses_24h ?? 0)}
          sub="Son 24 saatte yapılan analiz"
          color={C.neon}
          loading={loading}
        />
        <MetricCard
          icon={TrendingUp}
          label="Dezinformasyon Oranı"
          value={loading ? '…' : fakeRatePct}
          sub={loading ? '' : `${stats?.fake_count_24h ?? 0} sahte / ${stats?.total_analyses_24h ?? 0} toplam`}
          color={fakeColor}
          loading={loading}
        />
        <MetricCard
          icon={FileWarning}
          label="Bekleyen İhbar"
          value={loading ? '…' : (stats?.pending_reports ?? 0)}
          sub="Açık kullanıcı ihbarları"
          color={stats?.pending_reports > 0 ? C.yellow : C.neon}
          loading={loading}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Kritik Uyarı"
          value={loading ? '…' : (stats?.critical_alerts ?? 0)}
          sub="Redis'teki aktif alert'ler"
          color={stats?.critical_alerts > 0 ? C.red : C.neon}
          loading={loading}
        />
      </div>

      {/* Alt bölüm */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Son 5 gün analiz */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={14} color={C.neon} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Son 5 Gün
            </span>
          </div>
          <RecentAnalyticsFeed data={daily} loading={loading} />
        </div>

        {/* Hızlı erişim */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={14} color={C.neon} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hızlı Erişim
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Kullanıcı Yönetimi',    href: '/admin/users',    color: C.neon   },
              { label: 'Güvenlik Logları',       href: '/admin/security', color: C.blue   },
              { label: 'Forum Moderasyonu',      href: '/admin/forum',    color: C.yellow },
              { label: 'Dataset / Override',     href: '/admin/dataset',  color: C.muted  },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 4,
                  background: C.bg, textDecoration: 'none',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.75rem',
                  color: item.color, fontWeight: 500,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                {item.label}
              </a>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
