import React, { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, MessageSquare, Loader2, X } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { A, pageWrap, card, cardHead, badge, ANIM } from './adminTheme';

const STATUS_COLORS = {
  open:      { color: A.amber, dim: A.amberDim },
  in_review: { color: A.blue,  dim: A.blueDim  },
  resolved:  { color: A.brand, dim: A.brandDim },
};
const TYPE_LABELS = { fake_news: 'Sahte Haber', bug: 'Hata', complaint: 'Şikayet', other: 'Diğer' };

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '8px 18px',
        borderRadius: 8,
        border:       `1px solid ${active ? A.brand : A.border}`,
        background:   active ? A.brandDim : 'transparent',
        color:        active ? A.brand : A.text3,
        fontSize:     13,
        fontWeight:   600,
        cursor:       'pointer',
        fontFamily:   'inherit',
        transition:   'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ label, color, dim, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding:      '6px 14px',
        borderRadius: 6,
        border:       'none',
        background:   dim,
        color,
        fontSize:     12,
        fontWeight:   600,
        cursor:       loading ? 'not-allowed' : 'pointer',
        fontFamily:   'inherit',
        opacity:      loading ? 0.5 : 1,
      }}
    >
      {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : label}
    </button>
  );
}

export default function AdminModeration() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [tab, setTab] = useState('comments');

  const [flaggedComments, setFlaggedComments] = useState([]);
  const [flaggedThreads,  setFlaggedThreads]  = useState([]);
  const [reports,         setReports]         = useState([]);
  const [reportsTotal,    setReportsTotal]    = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [acting,          setActing]          = useState(null);

  const [replyModal,  setReplyModal]  = useState(null);
  const [replyText,   setReplyText]   = useState('');
  const [replyStatus, setReplyStatus] = useState('resolved');
  const [replySaving, setReplySaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { navigate('/forum'); return; }
    Promise.all([
      axiosInstance.get('/forum/admin/flagged-comments'),
      axiosInstance.get('/forum/admin/flagged-threads'),
      axiosInstance.get('/reports/admin?size=50'),
    ]).then(([c, t, r]) => {
      setFlaggedComments(c.data);
      setFlaggedThreads(t.data);
      setReports(r.data.items || []);
      setReportsTotal(r.data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, navigate]);

  const approveComment = async (id) => {
    setActing(id + '_approve');
    await axiosInstance.put(`/forum/admin/comments/${id}/approve`).catch(() => {});
    setFlaggedComments(prev => prev.filter(c => c.id !== id));
    setActing(null);
  };

  const removeComment = async (id) => {
    setActing(id + '_remove');
    await axiosInstance.put(`/forum/admin/comments/${id}/remove`).catch(() => {});
    setFlaggedComments(prev => prev.filter(c => c.id !== id));
    setActing(null);
  };

  const resolveThread = async (id) => {
    setActing(id + '_resolve');
    await axiosInstance.put(`/forum/admin/threads/${id}/resolve`).catch(() => {});
    setFlaggedThreads(prev => prev.filter(t => t.id !== id));
    setActing(null);
  };

  const closeThread = async (id) => {
    setActing(id + '_close');
    await axiosInstance.put(`/forum/admin/threads/${id}/close`).catch(() => {});
    setFlaggedThreads(prev => prev.filter(t => t.id !== id));
    setActing(null);
  };

  const submitReply = async () => {
    if (!replyModal) return;
    setReplySaving(true);
    try {
      await axiosInstance.post(`/reports/admin/${replyModal.id}/reply`, {
        reply: replyText.trim(), status: replyStatus,
      });
      setReports(prev => prev.map(r =>
        r.id === replyModal.id
          ? { ...r, status: replyStatus, admin_reply: replyText.trim() || r.admin_reply }
          : r
      ));
      setReplyModal(null);
      setReplyText('');
    } catch { /* sessiz */ } finally {
      setReplySaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Flag size={20} color={A.amber} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Moderasyon Paneli</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <TabBtn active={tab === 'comments'} onClick={() => setTab('comments')}>
          Flagged Yorumlar
          {flaggedComments.length > 0 && (
            <span style={{ ...badge(A.amber, A.amberDim), marginLeft: 8 }}>{flaggedComments.length}</span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'threads'} onClick={() => setTab('threads')}>
          Şüpheli Tartışmalar
          {flaggedThreads.length > 0 && (
            <span style={{ ...badge(A.amber, A.amberDim), marginLeft: 8 }}>{flaggedThreads.length}</span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'reports'} onClick={() => setTab('reports')}>
          Kullanıcı Raporları
          {reportsTotal > 0 && (
            <span style={{ ...badge(A.red, A.redDim), marginLeft: 8 }}>{reportsTotal}</span>
          )}
        </TabBtn>
      </div>

      {/* Flagged comments */}
      {tab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flaggedComments.length === 0 ? (
            <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
              Flagged yorum yok
            </div>
          ) : flaggedComments.map(c => (
            <div key={c.id} style={{
              ...card,
              borderLeft: `3px solid ${A.amber}`,
              padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MessageSquare size={13} color={A.amber} />
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>@{c.username}</span>
                <span style={{ ...badge(A.amber, A.amberDim) }}>{c.moderation_status}</span>
                {c.moderation_note && (
                  <span style={{ fontSize: 12, color: A.text3 }}>— {c.moderation_note}</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: A.text2, lineHeight: 1.6, marginBottom: 14 }}>{c.body}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionBtn label="Onayla" color={A.brand} dim={A.brandDim} onClick={() => approveComment(c.id)} loading={acting === c.id + '_approve'} />
                <ActionBtn label="Kaldır" color={A.red}   dim={A.redDim}   onClick={() => removeComment(c.id)}  loading={acting === c.id + '_remove'}  />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flagged threads */}
      {tab === 'threads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flaggedThreads.length === 0 ? (
            <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
              Şüpheli tartışma yok
            </div>
          ) : flaggedThreads.map(t => (
            <div key={t.id} style={{
              ...card,
              borderLeft: `3px solid ${A.amber}`,
              padding: 18,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: A.text1, marginBottom: 6 }}>{t.title}</p>
              <p style={{ fontSize: 12, color: A.text3, marginBottom: 14 }}>
                @{t.username}
                <span style={{ marginLeft: 10, color: A.red }}>🚩 {t.vote_suspicious}</span>
                <span style={{ marginLeft: 8, color: A.brand }}>✅ {t.vote_authentic}</span>
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionBtn label="Çözüldü İşaretle" color={A.blue}  dim={A.blueDim}  onClick={() => resolveThread(t.id)} loading={acting === t.id + '_resolve'} />
                <ActionBtn label="Tartışmayı Kapat" color={A.red}   dim={A.redDim}   onClick={() => closeThread(t.id)}   loading={acting === t.id + '_close'}   />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.length === 0 ? (
            <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
              Rapor yok
            </div>
          ) : reports.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.open;
            return (
              <div key={r.id} style={{ ...card, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ ...badge(sc.color, sc.dim) }}>{r.status}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: A.text3, background: A.card, padding: '2px 8px', borderRadius: 4 }}>
                    {TYPE_LABELS[r.type] || r.type}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: A.text3 }}>
                    @{r.reporter_username} · {new Date(r.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: A.text1, marginBottom: 6 }}>{r.subject}</p>
                <p style={{ fontSize: 13, color: A.text2, lineHeight: 1.6, marginBottom: r.url_or_ref || r.admin_reply ? 10 : 12 }}>
                  {r.description.slice(0, 200)}{r.description.length > 200 ? '…' : ''}
                </p>
                {r.url_or_ref && (
                  <a href={r.url_or_ref} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: A.brand, display: 'block', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.url_or_ref}
                  </a>
                )}
                {r.admin_reply && (
                  <div style={{ padding: '8px 14px', borderLeft: `3px solid ${A.brand}`, background: A.brandDim, borderRadius: '0 6px 6px 0', marginBottom: 12, fontSize: 13, color: A.text2 }}>
                    <span style={{ color: A.brand, fontWeight: 700 }}>Admin: </span>{r.admin_reply}
                  </div>
                )}
                <button
                  onClick={() => { setReplyModal(r); setReplyText(r.admin_reply || ''); setReplyStatus(r.status); }}
                  style={{
                    padding:    '6px 16px', borderRadius: 6, border: `1px solid ${A.border}`,
                    background: 'transparent', color: A.text2, fontSize: 12, fontWeight: 600,
                    cursor:     'pointer', fontFamily: 'inherit',
                  }}
                >
                  İncele / Yanıtla
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.72)' }}
          onClick={e => { if (e.target === e.currentTarget) setReplyModal(null); }}
        >
          <div style={{
            width: '100%', maxWidth: 520,
            background: A.surface,
            border:     `1px solid ${A.border}`,
            borderRadius: 12,
            padding:    24,
            display:    'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: A.text1, marginBottom: 4 }}>{replyModal.subject}</p>
                <p style={{ fontSize: 12, color: A.text3 }}>@{replyModal.reporter_username} · {replyModal.reporter_email}</p>
              </div>
              <button onClick={() => setReplyModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.text3 }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3, display: 'block', marginBottom: 6 }}>
                Durum
              </label>
              <select
                value={replyStatus}
                onChange={e => setReplyStatus(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: A.card, border: `1px solid ${A.border}`,
                  borderRadius: 8, color: A.text1, fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                }}
              >
                <option value="open">Açık</option>
                <option value="in_review">İnceleniyor</option>
                <option value="resolved">Çözüldü</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: A.text3, display: 'block', marginBottom: 6 }}>
                Yanıt <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsiyonel)</span>
              </label>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={4}
                placeholder="Kullanıcıya gönderilecek yanıt…"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: A.card, border: `1px solid ${A.border}`,
                  borderRadius: 8, color: A.text1, fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReplyModal(null)}
                style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                İptal
              </button>
              <button
                onClick={submitReply} disabled={replySaving}
                style={{ padding: '8px 18px', borderRadius: 8, background: A.brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: replySaving ? 0.6 : 1 }}
              >
                {replySaving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{ANIM}</style>
    </div>
  );
}
