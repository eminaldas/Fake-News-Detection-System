import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag, Database, CheckCircle, XCircle, MessageSquare,
  Loader2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import popup from '../services/popup';
import toast from '../services/toast';
import { A, pageWrap, tableWrap, thead, th, td, badge, ghostBtn, card, cardHead, ANIM } from './adminTheme';

const TABS = [
  { key: 'reports',  label: 'İhbar Havuzu',    icon: Flag },
  { key: 'dataset',  label: 'Dataset Override', icon: Database },
];

const STATUS_COLORS = {
  open:      { color: A.amber, dim: A.amberDim, label: 'Bekliyor'  },
  in_review: { color: A.blue,  dim: A.blueDim,  label: 'İncelendi' },
  resolved:  { color: A.brand, dim: A.brandDim, label: 'Çözüldü'  },
};

const PAGE_SIZE = 20;

/* ── İhbar Havuzu ────────────────────────────────────────────────────────── */
function ReportsTab() {
  const [reports,  setReports]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [replyId,  setReplyId]  = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('resolved');
  const [acting,   setActing]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/reports/admin?page=${page}&size=${PAGE_SIZE}`);
      setReports(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setActing(true);
    try {
      await axiosInstance.post(`/reports/admin/${replyId}/reply`, {
        reply: replyText,
        status: replyStatus,
      });
      toast.success('Yanıt gönderildi');
      setReplyId(null);
      setReplyText('');
      fetch();
    } catch (e) {
      toast.error('Yanıt gönderilemedi', { sub: e.message });
    } finally { setActing(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <>
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
                  {['Raporlayan', 'İçerik Türü', 'Sebep', 'Durum', 'Tarih', 'İşlem'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>
                      İhbar bulunamadı
                    </td>
                  </tr>
                ) : reports.map(r => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                  return (
                    <tr key={r.id}
                      style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = A.card}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...td, color: A.text1, fontWeight: 600 }}>
                        {r.reporter_username || '—'}
                      </td>
                      <td style={{ ...td, color: A.text3 }}>
                        {r.type === 'article'    ? 'Makale'
                        : r.type === 'forum'     ? 'Forum'
                        : r.type === 'user'      ? 'Kullanıcı'
                        : r.type || '—'}
                      </td>
                      <td style={{ ...td, color: A.text2, maxWidth: 220 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.subject}
                        </span>
                      </td>
                      <td style={{ ...td }}>
                        <span style={{ ...badge(sc.color, sc.dim) }}>{sc.label}</span>
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td style={{ ...td }}>
                        {r.status === 'open' && (
                          <button
                            onClick={() => { setReplyId(r.id); setReplyText(''); setReplyStatus('resolved'); }}
                            style={{
                              padding: '5px 12px', borderRadius: 6, border: 'none',
                              background: A.brandDim, color: A.brand,
                              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Yanıtla
                          </button>
                        )}
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

      {/* Yanıt modal */}
      {replyId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ ...card, width: 460, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: A.text1, marginBottom: 16 }}>
              İhbara Yanıt Ver
            </h3>

            <label style={{ fontSize: 12, color: A.text3, display: 'block', marginBottom: 4 }}>Durum</label>
            <select
              value={replyStatus}
              onChange={e => setReplyStatus(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${A.border}`, background: A.card, color: A.text1,
                fontSize: 13, fontFamily: 'inherit', marginBottom: 12,
              }}
            >
              <option value="resolved">Çözüldü</option>
              <option value="in_review">İnceleniyor</option>
            </select>

            <label style={{ fontSize: 12, color: A.text3, display: 'block', marginBottom: 4 }}>Yanıt Notu</label>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="İhbar sahibine iletilecek not..."
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${A.border}`, background: A.card, color: A.text1,
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setReplyId(null)}
                style={{ ...ghostBtn, padding: '8px 16px' }}>İptal</button>
              <button onClick={handleReply} disabled={acting || !replyText.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: acting ? A.brandDim : A.brand, color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}>
                {acting ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Dataset Override ────────────────────────────────────────────────────── */
function DatasetTab() {
  const [articles, setArticles] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [filter,   setFilter]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: PAGE_SIZE });
      if (filter) params.set('status', filter);
      const res = await axiosInstance.get(`/admin/articles?${params}`);
      setArticles(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const classify = async (articleId, newStatus) => {
    const key = `${articleId}_${newStatus}`;
    setActing(key);
    try {
      await axiosInstance.patch(`/admin/articles/${articleId}/classify`, { status: newStatus });
      toast.success('Sınıflandırma güncellendi');
      fetch();
    } catch (e) {
      toast.error('Güncelleme başarısız', { sub: e.message });
    } finally { setActing(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const STATUS_PILL = {
    AUTHENTIC: { color: A.brand, dim: A.brandDim },
    FAKE:      { color: A.red,   dim: A.redDim   },
  };

  return (
    <>
      {/* Filtre */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['', 'Tümü'], ['AUTHENTIC', 'Doğru'], ['FAKE', 'Yanlış']].map(([v, l]) => (
          <button key={v} onClick={() => { setFilter(v); setPage(1); }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit',
              border: `1px solid ${filter === v ? A.brand : A.border}`,
              background: filter === v ? A.brandDim : 'transparent',
              color: filter === v ? A.brand : A.text3,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            {l}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: A.text3, alignSelf: 'center' }}>
          {total} makale
        </span>
      </div>

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
                  {['Başlık', 'Kaynak', 'Mevcut Durum', 'Override'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>
                      Makale bulunamadı
                    </td>
                  </tr>
                ) : articles.map(a => {
                  const sp = STATUS_PILL[a.status] || { color: A.text3, dim: A.card };
                  return (
                    <tr key={a.id}
                      style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = A.card}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...td, color: A.text1, maxWidth: 300 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {a.title}
                        </span>
                      </td>
                      <td style={{ ...td, color: A.text3, fontSize: 12 }}>{a.source || '—'}</td>
                      <td style={{ ...td }}>
                        <span style={{ ...badge(sp.color, sp.dim) }}>{a.status || '—'}</span>
                      </td>
                      <td style={{ ...td }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['AUTHENTIC', 'FAKE'].map(s => {
                            const isCurrent = a.status === s;
                            const key = `${a.id}_${s}`;
                            return (
                              <button key={s}
                                onClick={() => !isCurrent && classify(a.id, s)}
                                disabled={isCurrent || acting === key}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: isCurrent
                                    ? (s === 'AUTHENTIC' ? A.brandDim : A.redDim)
                                    : A.card,
                                  color: isCurrent
                                    ? (s === 'AUTHENTIC' ? A.brand : A.red)
                                    : A.text3,
                                  fontSize: 11, fontWeight: 700, cursor: isCurrent ? 'default' : 'pointer',
                                  fontFamily: 'inherit', opacity: acting === key ? 0.5 : 1,
                                }}>
                                {s === 'AUTHENTIC'
                                  ? <CheckCircle size={11} />
                                  : <XCircle size={11} />}
                                {s === 'AUTHENTIC' ? 'Doğru' : 'Yanlış'}
                              </button>
                            );
                          })}
                        </div>
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
    </>
  );
}

/* ── Ana Bileşen ─────────────────────────────────────────────────────────── */
export default function AdminContent() {
  const [tab, setTab] = useState('reports');

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flag size={20} color={A.brand} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>İçerik Yönetimi</h1>
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${A.border}`, paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
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

      {tab === 'reports' && <ReportsTab />}
      {tab === 'dataset' && <DatasetTab />}

      <style>{ANIM}</style>
    </div>
  );
}
