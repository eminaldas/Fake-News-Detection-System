import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag, Database, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Loader2, ChevronLeft, ChevronRight, ExternalLink, MessageSquare,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from '../services/toast';
import { A, pageWrap, tableWrap, thead, th, td, badge, ghostBtn, card, ANIM } from './adminTheme';

const TABS = [
  { key: 'reports', label: 'İhbar Havuzu',    icon: Flag     },
  { key: 'dataset', label: 'Dataset Override', icon: Database },
];

const STATUS_COLORS = {
  open:      { color: A.amber, dim: A.amberDim, label: 'Bekliyor'    },
  in_review: { color: A.blue,  dim: A.blueDim,  label: 'İnceleniyor' },
  resolved:  { color: A.brand, dim: A.brandDim, label: 'Çözüldü'    },
};

const TYPE_LABEL = {
  article: 'Makale',
  forum:   'Forum',
  user:    'Kullanıcı',
  url:     'URL',
  content: 'İçerik',
};

const PAGE_SIZE = 20;

/* ── İhbar Havuzu ────────────────────────────────────────────────────────── */
function ReportsTab() {
  const [reports,     setReports]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);   // satır detayı
  const [replyId,     setReplyId]     = useState(null);
  const [replyText,   setReplyText]   = useState('');
  const [replyStatus, setReplyStatus] = useState('resolved');
  const [acting,      setActing]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/reports/admin?page=${page}&size=${PAGE_SIZE}`);
      setReports(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setActing(true);
    try {
      await axiosInstance.post(`/reports/admin/${replyId}/reply`, {
        reply: replyText, status: replyStatus,
      });
      toast.success('Yanıt gönderildi');
      setReplyId(null);
      setReplyText('');
      load();
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
                  {['', 'Raporlayan', 'Tür', 'Konu', 'Durum', 'Tarih', 'İşlem'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>
                      İhbar bulunamadı
                    </td>
                  </tr>
                ) : reports.map(r => {
                  const sc       = STATUS_COLORS[r.status] || STATUS_COLORS.open;
                  const isOpen   = expanded === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      {/* Ana satır */}
                      <tr
                        style={{ borderTop: `1px solid ${A.border}`, cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = A.card}
                        onMouseLeave={e => e.currentTarget.style.background = isOpen ? A.card : 'transparent'}
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                      >
                        <td style={{ ...td, width: 32, paddingRight: 0 }}>
                          {isOpen
                            ? <ChevronUp  size={14} color={A.brand} />
                            : <ChevronDown size={14} color={A.text3} />}
                        </td>
                        <td style={{ ...td, color: A.text1, fontWeight: 600 }}>
                          {r.reporter_username || '—'}
                          <div style={{ fontSize: 11, color: A.text3, fontWeight: 400 }}>{r.reporter_email}</div>
                        </td>
                        <td style={{ ...td, color: A.text3, whiteSpace: 'nowrap' }}>
                          {TYPE_LABEL[r.type] || r.type || '—'}
                        </td>
                        <td style={{ ...td, color: A.text2, maxWidth: 200 }}>
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
                        <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                          {r.status === 'open' && (
                            <button
                              onClick={() => { setReplyId(r.id); setReplyText(''); setReplyStatus('resolved'); setExpanded(r.id); }}
                              style={{
                                padding: '5px 12px', borderRadius: 6, border: 'none',
                                background: A.brandDim, color: A.brand,
                                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 5,
                              }}
                            >
                              <MessageSquare size={11} /> Yanıtla
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Detay satırı */}
                      {isOpen && (
                        <tr style={{ background: A.card }}>
                          <td colSpan={7} style={{ padding: '16px 20px 20px 52px', borderTop: `1px solid ${A.border}` }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                              {/* Sol: İçerik */}
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3, marginBottom: 6 }}>
                                  Açıklama
                                </p>
                                <p style={{ fontSize: 13, color: A.text2, lineHeight: 1.6, margin: 0 }}>
                                  {r.description || '—'}
                                </p>

                                {r.url_or_ref && (
                                  <div style={{ marginTop: 12 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3, marginBottom: 4 }}>
                                      Bağlantı / Referans
                                    </p>
                                    <a
                                      href={r.url_or_ref.startsWith('http') ? r.url_or_ref : undefined}
                                      target="_blank" rel="noreferrer"
                                      style={{ fontSize: 12, color: A.blue, display: 'flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}
                                    >
                                      <ExternalLink size={11} /> {r.url_or_ref}
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Sağ: Admin yanıtı ya da yanıt formu */}
                              <div>
                                {r.admin_reply ? (
                                  <>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3, marginBottom: 6 }}>
                                      Admin Yanıtı
                                    </p>
                                    <div style={{ padding: '10px 14px', background: A.surface, borderRadius: 8, border: `1px solid ${A.border}` }}>
                                      <p style={{ fontSize: 13, color: A.text2, lineHeight: 1.6, margin: '0 0 6px' }}>
                                        {r.admin_reply}
                                      </p>
                                      {r.replied_at && (
                                        <p style={{ fontSize: 11, color: A.text3, margin: 0 }}>
                                          {new Date(r.replied_at).toLocaleString('tr-TR')}
                                        </p>
                                      )}
                                    </div>
                                  </>
                                ) : replyId === r.id ? (
                                  <>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3, marginBottom: 6 }}>
                                      Yanıt Yaz
                                    </p>
                                    <select
                                      value={replyStatus}
                                      onChange={e => setReplyStatus(e.target.value)}
                                      style={{
                                        width: '100%', padding: '7px 10px', borderRadius: 7,
                                        border: `1px solid ${A.border}`, background: A.surface, color: A.text1,
                                        fontSize: 12, fontFamily: 'inherit', marginBottom: 8,
                                      }}
                                    >
                                      <option value="resolved">Çözüldü</option>
                                      <option value="in_review">İnceleniyor</option>
                                    </select>
                                    <textarea
                                      value={replyText}
                                      onChange={e => setReplyText(e.target.value)}
                                      placeholder="Kullanıcıya iletilecek yanıt..."
                                      rows={3}
                                      style={{
                                        width: '100%', padding: '8px 10px', borderRadius: 7,
                                        border: `1px solid ${A.border}`, background: A.surface, color: A.text1,
                                        fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
                                        boxSizing: 'border-box', marginBottom: 8,
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button onClick={() => setReplyId(null)}
                                        style={{ ...ghostBtn, padding: '6px 14px', fontSize: 12 }}>İptal</button>
                                      <button onClick={handleReply} disabled={acting || !replyText.trim()}
                                        style={{
                                          flex: 1, padding: '6px 14px', borderRadius: 7, border: 'none',
                                          background: acting ? A.brandDim : A.brand, color: '#fff',
                                          fontSize: 12, fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer',
                                          fontFamily: 'inherit',
                                        }}>
                                        {acting ? 'Gönderiliyor…' : 'Gönder'}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <p style={{ fontSize: 12, color: A.text3, fontStyle: 'italic' }}>
                                    Henüz yanıt verilmedi.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${A.border}` }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Önceki
          </button>
          <span style={{ fontSize: 12, color: A.text3 }}>{page} / {totalPages} ({total} kayıt)</span>
          <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page * PAGE_SIZE >= total ? 'not-allowed' : 'pointer', color: page * PAGE_SIZE >= total ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page * PAGE_SIZE >= total ? 0.4 : 1 }}>
            Sonraki <ChevronRight size={14} />
          </button>
        </div>
      </div>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: PAGE_SIZE });
      if (filter) params.set('status', filter);
      const res = await axiosInstance.get(`/admin/articles?${params}`);
      setArticles(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const classify = async (articleId, newStatus) => {
    const key = `${articleId}_${newStatus}`;
    setActing(key);
    try {
      await axiosInstance.patch(`/admin/articles/${articleId}/classify`, { status: newStatus });
      toast.success('Etiket güncellendi');
      load();
    } catch (e) {
      toast.error('Güncelleme başarısız', { sub: e.message });
    } finally { setActing(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const STATUS_PILL = {
    AUTHENTIC:            { color: A.brand, dim: A.brandDim },
    FAKE:                 { color: A.red,   dim: A.redDim   },
    'Doğru':              { color: A.brand, dim: A.brandDim },
    'Yanlış':             { color: A.red,   dim: A.redDim   },
    completed:            { color: A.blue,  dim: A.blueDim  },
    'Karma':              { color: A.amber, dim: A.amberDim },
    'Sonuçlandırılamadı': { color: A.text3, dim: A.card     },
  };

  const FILTER_OPTIONS = [
    ['', 'Tümü'],
    ['Doğru', 'Doğru'],
    ['Yanlış', 'Yanlış'],
    ['AUTHENTIC', 'AUTHENTIC'],
    ['FAKE', 'FAKE'],
    ['completed', 'Tamamlandı'],
  ];

  return (
    <>
      {/* Açıklama kartı */}
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: A.blueDim, border: `1px solid ${A.blue}22`,
        fontSize: 13, color: A.text2, lineHeight: 1.6,
      }}>
        <strong style={{ color: A.blue }}>Dataset Override</strong> — Bilgi tabanındaki makalelerin etiketini elle düzeltir.
        {' '}<strong style={{ color: A.brand }}>Doğru</strong>/<strong style={{ color: A.red }}>Yanlış</strong>: Teyit/Hoax kaynağından.
        {' '}<strong style={{ color: A.blue }}>Tamamlandı</strong>: AI analiz sonucu — <em>AI Kararı</em> sütununda AI'ın verdiği verdict görünür.
        {' '}<strong style={{ color: A.amber }}>AUTHENTIC/FAKE olarak işaretlediğiniz haberler bir sonraki model eğitimine doğrudan girer.</strong>
      </div>

      {/* Filtreler */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTER_OPTIONS.map(([v, l]) => (
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
        <span style={{ marginLeft: 'auto', fontSize: 12, color: A.text3 }}>
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
                  {['Başlık', 'Mevcut Etiket', 'AI Kararı', 'Override'].map(h => (
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
                  const sp  = STATUS_PILL[a.status] || { color: A.text3, dim: A.card };
                  const aip = a.ai_verdict ? (STATUS_PILL[a.ai_verdict] || { color: A.text3, dim: A.card }) : null;
                  return (
                    <tr key={a.id}
                      style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = A.card}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...td, color: A.text1, maxWidth: 420 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {a.title}
                        </span>
                      </td>
                      <td style={{ ...td }}>
                        <span style={{ ...badge(sp.color, sp.dim) }}>{a.status || '—'}</span>
                      </td>
                      {/* AI Kararı */}
                      <td style={{ ...td }}>
                        {aip ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ ...badge(aip.color, aip.dim) }}>{a.ai_verdict}</span>
                            {a.confidence && (
                              <span style={{ fontSize: 10, color: A.text3 }}>%{Math.round(a.confidence * 100)}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: A.text3, fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ ...td }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[['AUTHENTIC', 'Doğru', A.brand, A.brandDim], ['FAKE', 'Yanlış', A.red, A.redDim]].map(([s, lbl, col, dim]) => {
                            const isCurrent = a.status === s;
                            const key = `${a.id}_${s}`;
                            return (
                              <button key={s}
                                onClick={() => !isCurrent && classify(a.id, s)}
                                disabled={isCurrent || acting === key}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: isCurrent ? dim : A.card,
                                  color: isCurrent ? col : A.text3,
                                  fontSize: 11, fontWeight: 700,
                                  cursor: isCurrent ? 'default' : 'pointer',
                                  fontFamily: 'inherit', opacity: acting === key ? 0.5 : 1,
                                  transition: 'all 0.1s',
                                }}
                                onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.background = dim; e.currentTarget.style.color = col; } }}
                                onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.background = A.card; e.currentTarget.style.color = A.text3; } }}
                              >
                                {s === 'AUTHENTIC' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                {lbl}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Flag size={20} color={A.brand} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>İçerik Yönetimi</h1>
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

      {tab === 'reports' && <ReportsTab />}
      {tab === 'dataset' && <DatasetTab />}

      <style>{ANIM}</style>
    </div>
  );
}
