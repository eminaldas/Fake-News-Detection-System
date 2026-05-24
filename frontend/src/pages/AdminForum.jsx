import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, CheckCircle, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';
import { A, pageWrap, card, badge, ANIM } from './adminTheme';

const FLAG_LABELS = {
  flagged_ai:   'AI Tespiti',
  flagged_user: 'Kullanıcı Bildirimi',
};
const PAGE_SIZE = 20;

export default function AdminForum() {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/admin/forum/queue?page=${page}&size=${PAGE_SIZE}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const approve = async (id) => {
    setActing(id + '_approve');
    try {
      await axiosInstance.post(`/admin/forum/comments/${id}/approve`);
      await fetchQueue();
    } finally { setActing(null); }
  };

  const remove = async (id) => {
    setActing(id + '_remove');
    try {
      await axiosInstance.post(`/admin/forum/comments/${id}/remove`);
      await fetchQueue();
    } finally { setActing(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <MessageSquare size={20} color={A.amber} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Forum Moderasyon Kuyruğu</h1>
        {total > 0 && <span style={{ ...badge(A.amber, A.amberDim) }}>{total} bekliyor</span>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
          Moderasyon kuyruğu boş
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{
              ...card,
              borderLeft:  `3px solid ${A.amber}`,
              padding:     16,
              display:     'flex',
              alignItems:  'flex-start',
              gap:         16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>{item.author}</span>
                  <span style={{ ...badge(A.amber, A.amberDim) }}>
                    {FLAG_LABELS[item.flag_type] || item.flag_type}
                  </span>
                  {item.report_count > 0 && (
                    <span style={{ fontSize: 11, color: A.text3 }}>{item.report_count} bildirim</span>
                  )}
                </div>
                {item.thread_title && (
                  <p style={{ fontSize: 12, color: A.text3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Thread: {item.thread_title}
                  </p>
                )}
                <p style={{ fontSize: 13, color: A.text2, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.body}
                </p>
                {item.moderation_note && (
                  <p style={{ fontSize: 11, color: A.amber, marginTop: 5, fontStyle: 'italic' }}>
                    AI: {item.moderation_note}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => approve(item.id)}
                  disabled={acting === item.id + '_approve'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 6, border: 'none',
                    background: A.brandDim, color: A.brand,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {acting === item.id + '_approve'
                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <CheckCircle size={13} />}
                  Onayla
                </button>
                <button
                  onClick={() => remove(item.id)}
                  disabled={acting === item.id + '_remove'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 6, border: 'none',
                    background: A.redDim, color: A.red,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {acting === item.id + '_remove'
                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={13} />}
                  Kaldır
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '12px 4px' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Önceki
          </button>
          <span style={{ fontSize: 12, color: A.text3 }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: page >= totalPages ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page >= totalPages ? 0.4 : 1 }}>
            Sonraki <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{ANIM}</style>
    </div>
  );
}
