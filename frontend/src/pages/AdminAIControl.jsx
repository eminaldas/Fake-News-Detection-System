import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, FlaskConical, TrendingUp, CheckCircle,
  Loader2, BarChart3, RefreshCw,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import popup from '../services/popup';
import toast from '../services/toast';
import { A, pageWrap, card, cardHead, tableWrap, thead, th, td, badge, ghostBtn, ANIM } from './adminTheme';

const TABS = [
  { key: 'model', label: 'Model Performansı', icon: BrainCircuit },
  { key: 'ab',    label: 'A/B Testler',        icon: FlaskConical  },
];

const VARIANT_NAMES = { 0: 'Kontrol', 1: 'Recency-Heavy', 2: 'Category-Heavy' };

function ModelTab() {
  const [stats,    setStats]    = useState(null);
  const [health,   setHealth]   = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes, fbRes] = await Promise.all([
        axiosInstance.get('/admin/stats/overview'),
        axiosInstance.get('/admin/logs/system/health'),
        axiosInstance.get('/admin/logs/feedback/stats'),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setFeedback(fbRes.data);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const lastRun = feedback?.last_training_run;

  const METRIC_CARDS = [
    { label: 'Son 24s Analiz',   value: stats?.total_analyses_24h ?? '—',  color: A.brand },
    { label: 'Sahte Oran',       value: stats ? `${(stats.fake_rate_24h * 100).toFixed(1)}%` : '—', color: A.red },
    { label: 'Consensus Hazır',  value: feedback?.consensus_ready ?? '—',   color: A.blue  },
    { label: 'Bekleyen Feedback', value: feedback?.pending_consensus ?? '—', color: A.amber },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Metrik kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {METRIC_CARDS.map(m => (
          <div key={m.label} style={{
            ...card, padding: '20px 20px 18px',
            borderTop: `3px solid ${m.color}`,
          }}>
            <p style={{ fontSize: 11, color: A.text3, margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {m.label}
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: m.color, margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Son eğitim çalışması */}
        <div style={{ ...card }}>
          <div style={{ ...cardHead }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <BarChart3 size={14} color={A.brand} />
              <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Son Model Eğitimi</span>
            </div>
            <button onClick={fetch} style={{ ...ghostBtn, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} /> Yenile
            </button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {!lastRun ? (
              <p style={{ fontSize: 13, color: A.text3 }}>Eğitim kaydı yok</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Durum',       lastRun.status,   lastRun.status === 'success' ? A.brand : A.red],
                  ['Örnek Sayısı', lastRun.sample_count ?? '—', A.text1],
                  ['Accuracy',    lastRun.accuracy ? `${(lastRun.accuracy * 100).toFixed(1)}%` : '—', A.brand],
                  ['Tarih',       lastRun.created_at ? new Date(lastRun.created_at).toLocaleString('tr-TR') : '—', A.text3],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: A.text3 }}>{label}</span>
                    <span style={{ color, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sistem sağlığı */}
        <div style={{ ...card }}>
          <div style={{ ...cardHead }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingUp size={14} color={A.brand} />
              <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Sistem Sağlığı</span>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {!health ? (
              <p style={{ fontSize: 13, color: A.text3 }}>Veri yok</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Son Heartbeat',   health.last_heartbeat
                    ? new Date(health.last_heartbeat).toLocaleString('tr-TR')
                    : 'Bilinmiyor',
                    health.last_heartbeat ? A.brand : A.amber],
                  ['1 Saatte Hata',   health.errors_last_1h ?? 0,
                    (health.errors_last_1h ?? 0) > 0 ? A.red : A.brand],
                  ['Kritik (1 saat)', health.critical_last_1h ?? 0,
                    (health.critical_last_1h ?? 0) > 0 ? A.red : A.brand],
                ].map(([lbl, val, color]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: A.text3 }}>{lbl}</span>
                    <span style={{ color, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback durumu */}
      <div style={{ ...card }}>
        <div style={{ ...cardHead }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Kullanıcı Feedback Durumu</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 40 }}>
          <div>
            <p style={{ fontSize: 11, color: A.text3, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Consensus Bekleyen
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: A.amber, margin: 0 }}>
              {feedback?.pending_consensus ?? '—'}
            </p>
            <p style={{ fontSize: 11, color: A.text3, margin: '4px 0 0' }}>makale henüz yeterli oy yok</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: A.text3, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Eğitime Hazır
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: A.brand, margin: 0 }}>
              {feedback?.consensus_ready ?? '—'}
            </p>
            <p style={{ fontSize: 11, color: A.text3, margin: '4px 0 0' }}>makale yeterli consensus var</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ABTestTab() {
  const [experiments, setExperiments] = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [results,     setResults]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [concluding,  setConcluding]  = useState(false);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/ab/experiments');
      setExperiments(res.data.experiments || []);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, []);

  const fetchResults = useCallback(async (expId) => {
    try {
      const res = await axiosInstance.get(`/admin/ab/experiments/${expId}/results`);
      setResults(res.data);
    } catch { /* sessiz */ }
  }, []);

  useEffect(() => { fetchExperiments(); }, [fetchExperiments]);

  const handleSelect = (exp) => {
    setSelected(exp);
    setResults(null);
    fetchResults(exp.id);
  };

  const handleConclude = (variantId) => {
    if (!selected || concluding) return;
    popup.confirm({
      title:        'Varyantı uygula',
      message:      `Varyant ${variantId} (${VARIANT_NAMES[variantId]}) kazanan olarak uygulanacak.`,
      danger:       false,
      confirmLabel: 'Uygula',
      onConfirm:    async () => {
        setConcluding(true);
        try {
          await axiosInstance.post(`/admin/ab/experiments/${selected.id}/conclude`, { winner_variant: variantId });
          toast.success('Deney sonlandırıldı', { sub: `Kazanan: ${VARIANT_NAMES[variantId]}` });
          await fetchExperiments();
          await fetchResults(selected.id);
        } catch (e) {
          toast.error('Sonlandırma başarısız', { sub: e.message });
        } finally { setConcluding(false); }
      },
    });
  };

  const STATUS_COLORS = {
    active:    { color: A.brand, dim: A.brandDim },
    concluded: { color: A.blue,  dim: A.blueDim  },
    paused:    { color: A.amber, dim: A.amberDim },
  };

  const bestCtr = results ? Math.max(...(results.variants || []).map(v => v.ctr)) : 0;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
      {/* Deney listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: A.text3, marginBottom: 4 }}>
          Deneyler
        </p>
        {experiments.length === 0 && (
          <p style={{ fontSize: 13, color: A.text3 }}>Deney bulunamadı</p>
        )}
        {experiments.map(exp => {
          const sc     = STATUS_COLORS[exp.status] || STATUS_COLORS.paused;
          const active = selected?.id === exp.id;
          return (
            <button key={exp.id} onClick={() => handleSelect(exp)}
              style={{
                textAlign: 'left', padding: '12px 16px', borderRadius: 10,
                border: `1px solid ${active ? A.brand : A.border}`,
                background: active ? A.brandDim : A.surface,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'border-color 0.12s, background 0.12s',
              }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: A.text1, marginBottom: 4 }}>{exp.name}</p>
              <span style={{ ...badge(sc.color, sc.dim) }}>
                {exp.status === 'active'    && '● Aktif'}
                {exp.status === 'concluded' && `✓ Bitti (${VARIANT_NAMES[exp.winner_variant] ?? exp.winner_variant})`}
                {exp.status === 'paused'    && '⏸ Duraklatıldı'}
              </span>
              {exp.min_clicks_reached && exp.status === 'active' && (
                <p style={{ fontSize: 11, color: A.brand, marginTop: 6, fontWeight: 600 }}>
                  ✔ Eşik doldu — sonuç hazır
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Sonuçlar */}
      <div>
        {!selected && (
          <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
            Soldan bir deney seçin
          </div>
        )}
        {selected && !results && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: A.text3, fontSize: 13 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sonuçlar yükleniyor…
          </div>
        )}
        {results && (
          <div style={{ ...card }}>
            <div style={{ ...cardHead }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={14} color={A.brand} />
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>{results.experiment_name}</span>
              </div>
              {results.status === 'active' && (
                <span style={{ fontSize: 12, color: A.text3 }}>Min. tıklama: {results.min_clicks}</span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ ...thead }}>
                  <tr>
                    {['Varyant', 'İzlenim', 'Tıklama', 'CTR', 'Feedback+', 'Durum',
                      ...(results.status === 'active' ? [''] : [])
                    ].map(h => <th key={h} style={{ ...th }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(results.variants || []).map(v => {
                    const isBest = v.ctr === bestCtr && bestCtr > 0;
                    return (
                      <tr key={v.variant} style={{
                        borderTop: `1px solid ${A.border}`,
                        background: isBest ? A.brandDim : 'transparent',
                      }}>
                        <td style={{ ...td, fontWeight: 700, color: A.text1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {v.variant} — {v.name ?? VARIANT_NAMES[v.variant]}
                            {v.variant === results.winner_variant && <CheckCircle size={13} color={A.brand} />}
                          </div>
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: A.text3 }}>{v.impressions}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{v.clicks}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: isBest ? A.brand : A.text1 }}>
                          {v.ctr}%
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: A.text3 }}>{v.feedback_rate}%</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {v.ready
                            ? <span style={{ fontSize: 11, fontWeight: 700, color: A.brand }}>✔ Hazır</span>
                            : <span style={{ fontSize: 11, color: A.text3 }}>{v.clicks}/{results.min_clicks}</span>}
                        </td>
                        {results.status === 'active' && (
                          <td style={{ ...td, textAlign: 'center' }}>
                            <button onClick={() => handleConclude(v.variant)}
                              disabled={!v.ready || concluding}
                              style={{
                                padding: '5px 12px', borderRadius: 6, border: 'none',
                                background: v.ready ? A.brandDim : A.card,
                                color: v.ready ? A.brand : A.text3,
                                fontSize: 11, fontWeight: 700,
                                cursor: v.ready && !concluding ? 'pointer' : 'not-allowed',
                                fontFamily: 'inherit', opacity: v.ready ? 1 : 0.5,
                              }}>
                              Uygula
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${A.border}` }}>
              <p style={{ fontSize: 12, color: A.text3 }}>
                Yeşil satır en yüksek CTR'a sahip varyant. "Uygula" butonu tıklama eşiği ({results.min_clicks}) dolunca aktif olur.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAIControl() {
  const [tab, setTab] = useState('model');

  return (
    <div style={{ ...pageWrap }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <BrainCircuit size={20} color={A.brand} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>AI Kontrol Merkezi</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${A.border}` }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: '8px 8px 0 0', border: 'none',
                borderBottom: active ? `2px solid ${A.brand}` : '2px solid transparent',
                background: active ? A.brandDim : 'transparent',
                color: active ? A.brand : A.text3,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'model' && <ModelTab />}
      {tab === 'ab'    && <ABTestTab />}

      <style>{ANIM}</style>
    </div>
  );
}
