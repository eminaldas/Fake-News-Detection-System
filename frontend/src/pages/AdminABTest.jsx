import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, CheckCircle, Loader2, TrendingUp } from 'lucide-react';
import axiosInstance from '../api/axios';
import popup from '../services/popup';
import toast from '../services/toast';
import { A, pageWrap, card, cardHead, tableWrap, thead, th, td, badge, ANIM } from './adminTheme';

const VARIANT_NAMES = { 0: 'Kontrol', 1: 'Recency-Heavy', 2: 'Category-Heavy' };
const STATUS_COLORS = {
  active:     { color: A.brand, dim: A.brandDim },
  concluded:  { color: A.blue,  dim: A.blueDim  },
  paused:     { color: A.amber, dim: A.amberDim },
};

export default function AdminABTest() {
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
    } catch { /* sessiz */ } finally {
      setLoading(false);
    }
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
      message:      `Varyant ${variantId} (${VARIANT_NAMES[variantId]}) kazanan olarak uygulanacak ve deney sonlandırılacak.`,
      danger:       false,
      confirmLabel: 'Uygula',
      onConfirm:    async () => {
        setConcluding(true);
        try {
          await axiosInstance.post(`/admin/ab/experiments/${selected.id}/conclude`, { winner_variant: variantId });
          toast.success('Deney sonlandırıldı', { sub: `Kazanan: Varyant ${variantId} — ${VARIANT_NAMES[variantId]}` });
          await fetchExperiments();
          await fetchResults(selected.id);
        } catch (e) {
          toast.error('Sonlandırma başarısız', { sub: e.message });
        } finally {
          setConcluding(false);
        }
      },
    });
  };

  const bestCtr = results
    ? Math.max(...(results.variants || []).map(v => v.ctr))
    : 0;

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <FlaskConical size={20} color={A.blue} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>A/B Test Sonuçları</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Experiment list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: A.text3, marginBottom: 4 }}>
              Deneyler
            </p>
            {experiments.length === 0 && (
              <p style={{ fontSize: 13, color: A.text3 }}>Deney bulunamadı</p>
            )}
            {experiments.map(exp => {
              const sc  = STATUS_COLORS[exp.status] || STATUS_COLORS.paused;
              const active = selected?.id === exp.id;
              return (
                <button
                  key={exp.id}
                  onClick={() => handleSelect(exp)}
                  style={{
                    textAlign:    'left',
                    padding:      '12px 16px',
                    borderRadius: 10,
                    border:       `1px solid ${active ? A.brand : A.border}`,
                    background:   active ? A.brandDim : A.surface,
                    cursor:       'pointer',
                    transition:   'border-color 0.12s, background 0.12s',
                    fontFamily:   'inherit',
                  }}
                >
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

          {/* Results panel */}
          <div>
            {!selected && (
              <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
                Soldan bir deney seçin
              </div>
            )}
            {selected && !results && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: A.text3, fontSize: 13 }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Sonuçlar yükleniyor…
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
                    <span style={{ fontSize: 12, color: A.text3 }}>
                      Min. tıklama: {results.min_clicks}
                    </span>
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
                            borderTop:  `1px solid ${A.border}`,
                            background: isBest ? A.brandDim : 'transparent',
                          }}>
                            <td style={{ ...td, fontWeight: 700, color: A.text1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {v.variant} — {v.name ?? VARIANT_NAMES[v.variant]}
                                {v.variant === results.winner_variant && (
                                  <CheckCircle size={13} color={A.brand} />
                                )}
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
                                : <span style={{ fontSize: 11, color: A.text3 }}>{v.clicks}/{results.min_clicks}</span>
                              }
                            </td>
                            {results.status === 'active' && (
                              <td style={{ ...td, textAlign: 'center' }}>
                                <button
                                  onClick={() => handleConclude(v.variant)}
                                  disabled={!v.ready || concluding}
                                  style={{
                                    padding:    '5px 12px',
                                    borderRadius: 6, border: 'none',
                                    background: v.ready ? A.brandDim : A.card,
                                    color:      v.ready ? A.brand : A.text3,
                                    fontSize:   11, fontWeight: 700,
                                    cursor:     v.ready && !concluding ? 'pointer' : 'not-allowed',
                                    fontFamily: 'inherit',
                                    opacity:    v.ready ? 1 : 0.5,
                                  }}
                                >
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
      )}

      <style>{ANIM}</style>
    </div>
  );
}
