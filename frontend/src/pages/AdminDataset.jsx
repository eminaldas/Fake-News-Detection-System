import React, { useState, useEffect, useCallback } from 'react';
import { Database, ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import axiosInstance from '../api/axios';
import { A, pageWrap, card, cardHead, badge, ANIM } from './adminTheme';

const STATUS = {
  authentic:  { label: 'Doğru',    color: A.brand, dim: A.brandDim },
  fake:       { label: 'Yanlış',   color: A.red,   dim: A.redDim   },
  unverified: { label: 'Belirsiz', color: A.amber, dim: A.amberDim },
};

const PAGE_SIZE = 20;

export default function AdminDataset() {
  const [items,        setItems]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (statusFilter) params.status_filter = statusFilter;
      const res = await axiosInstance.get('/articles/', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch { /* sessiz */ } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const classify = async (id, newStatus) => {
    setActing(id + '_' + newStatus);
    try {
      const res = await axiosInstance.patch(`/admin/articles/${id}/classify`, { status: newStatus });
      setItems(prev => prev.map(a => a.id === id ? { ...a, status: res.data.status } : a));
    } catch { /* sessiz */ } finally {
      setActing(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Database size={20} color={A.brand} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Dataset Manager</h1>
        <span style={{ ...badge(A.brand, A.brandDim), marginLeft: 4 }}>{total} makale</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: A.text3, marginRight: 4 }}>Filtre:</span>
        {['', 'authentic', 'fake', 'unverified'].map(s => {
          const active = statusFilter === s;
          const sc = s ? STATUS[s] : null;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                padding:    '6px 14px',
                borderRadius: 8,
                border:     `1px solid ${active ? (sc?.color ?? A.brand) : A.border}`,
                background: active ? (sc?.dim ?? A.brandDim) : 'transparent',
                color:      active ? (sc?.color ?? A.brand) : A.text3,
                fontSize:   12,
                fontWeight: 600,
                cursor:     'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}
            >
              {s === '' ? 'Tümü' : (STATUS[s]?.label ?? s)}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={28} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
          Makale bulunamadı
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(article => {
            const s = STATUS[article.status] ?? STATUS.unverified;
            return (
              <div key={article.id} style={{
                ...card,
                padding:    16,
                display:    'flex',
                alignItems: 'center',
                gap:        16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize:     13,
                    fontWeight:   600,
                    color:        A.text1,
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                    marginBottom: 5,
                  }}>
                    {article.title.length > 90 ? article.title.slice(0, 90) + '…' : article.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...badge(s.color, s.dim) }}>{s.label}</span>
                    {article.metadata_info?.source_name && (
                      <span style={{ fontSize: 11, color: A.text3 }}>{article.metadata_info.source_name}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => classify(article.id, 'authentic')}
                    disabled={acting === article.id + '_authentic' || article.status === 'authentic'}
                    style={{
                      display:    'flex', alignItems: 'center', gap: 5,
                      padding:    '6px 14px', borderRadius: 6, border: 'none',
                      background: A.brandDim, color: A.brand,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      opacity: article.status === 'authentic' ? 0.4 : 1,
                    }}
                  >
                    <CheckCircle size={13} />
                    Doğru
                  </button>
                  <button
                    onClick={() => classify(article.id, 'fake')}
                    disabled={acting === article.id + '_fake' || article.status === 'fake'}
                    style={{
                      display:    'flex', alignItems: 'center', gap: 5,
                      padding:    '6px 14px', borderRadius: 6, border: 'none',
                      background: A.redDim, color: A.red,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      opacity: article.status === 'fake' ? 0.4 : 1,
                    }}
                  >
                    <XCircle size={13} />
                    Yanlış
                  </button>
                </div>
              </div>
            );
          })}
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
