import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, MessageSquare, CheckCircle, XCircle, AlertTriangle,
  ShieldBan, Shield, Loader2, ChevronLeft, ChevronRight, History,
  FileText, Trash2, Search,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import popup from '../services/popup';
import toast from '../services/toast';
import { A, pageWrap, tableWrap, thead, th, td, badge, ghostBtn, card, cardHead, ANIM } from './adminTheme';

const TABS = [
  { key: 'posts',      label: 'İçerikler',           icon: FileText     },
  { key: 'queue',      label: 'Moderasyon Kuyruğu',  icon: MessageSquare },
  { key: 'reputation', label: 'İtibar Yönetimi',      icon: Users        },
];

const PAGE_SIZE = 20;

const ACTION_CONFIG = {
  warn:       { label: 'Uyar',          color: A.amber, dim: A.amberDim },
  restrict:   { label: 'Kısıtla',       color: A.amber, dim: A.amberDim },
  shadow_ban: { label: 'Gölge Yasak',   color: A.red,   dim: A.redDim   },
  ban:        { label: 'Kalıcı Ban',    color: A.red,   dim: A.redDim   },
};

/* ── Moderasyon Kuyruğu ──────────────────────────────────────────────────── */
function QueueTab() {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/admin/forum/queue?page=${page}&size=${PAGE_SIZE}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const approve = async (id) => {
    setActing(id + '_approve');
    try {
      await axiosInstance.post(`/admin/forum/comments/${id}/approve`);
      toast.success('Yorum onaylandı');
      fetch();
    } catch (e) {
      toast.error('İşlem başarısız', { sub: e.message });
    } finally { setActing(null); }
  };

  const remove = async (id) => {
    popup.confirm({
      title: 'Yorumu kaldır',
      message: 'Bu yorum kaldırılacak. Devam edilsin mi?',
      danger: true,
      confirmLabel: 'Kaldır',
      onConfirm: async () => {
        setActing(id + '_remove');
        try {
          await axiosInstance.post(`/admin/forum/comments/${id}/remove`);
          toast.success('Yorum kaldırıldı');
          fetch();
        } catch (e) {
          toast.error('İşlem başarısız', { sub: e.message });
        } finally { setActing(null); }
      },
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
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
                {['Yazar', 'İçerik', 'Bayrak', 'Tartışma', 'Tarih', 'İşlem'].map(h => (
                  <th key={h} style={{ ...th }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>
                    Kuyrukta bekleyen içerik yok
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id}
                  style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = A.card}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...td, color: A.text1, fontWeight: 600 }}>
                    {item.author || '—'}
                  </td>
                  <td style={{ ...td, color: A.text2, maxWidth: 240 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.body}
                    </span>
                  </td>
                  <td style={{ ...td }}>
                    {item.flag_type && (
                      <span style={{ ...badge(A.amber, A.amberDim) }}>{item.flag_type}</span>
                    )}
                  </td>
                  <td style={{ ...td, color: A.text3, fontSize: 12, maxWidth: 160 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.thread_title || '—'}
                    </span>
                  </td>
                  <td style={{ ...td, color: A.text3, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(item.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td style={{ ...td }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => approve(item.id)}
                        disabled={!!acting}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: A.brandDim, color: A.brand,
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        <CheckCircle size={11} /> Onayla
                      </button>
                      <button onClick={() => remove(item.id)}
                        disabled={!!acting}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: A.redDim, color: A.red,
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        <XCircle size={11} /> Kaldır
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
  );
}

/* ── İtibar Yönetimi ────────────────────────────────────────────────────── */
function ReputationTab() {
  const [q,        setQ]        = useState('');
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [warnLoad, setWarnLoad] = useState(false);

  // Ceza modal state
  const [punishOpen,  setPunishOpen]  = useState(false);
  const [action,      setAction]      = useState('warn');
  const [reason,      setReason]      = useState('');
  const [restrictions, setRestrictions] = useState({ can_comment: true, can_post_analysis: true, can_create_thread: true });
  const [submitting,  setSubmitting]  = useState(false);

  // Kaldır modal state
  const [liftOpen,      setLiftOpen]      = useState(false);
  const [liftBan,       setLiftBan]       = useState(false);
  const [liftShadow,    setLiftShadow]    = useState(false);
  const [liftRestrict,  setLiftRestrict]  = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: PAGE_SIZE });
      if (q) params.set('q', q);
      const res = await axiosInstance.get(`/admin/users?${params}`);
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [q, page]);

  useEffect(() => { search(); }, [search]);

  const loadWarnings = async (userId) => {
    setWarnLoad(true);
    try {
      const res = await axiosInstance.get(`/admin/users/${userId}/warnings`);
      setWarnings(res.data || []);
    } catch { setWarnings([]); } finally { setWarnLoad(false); }
  };

  const selectUser = (u) => {
    setSelected(u);
    loadWarnings(u.id);
  };

  const refreshSelected = async (userId) => {
    try {
      const res = await axiosInstance.get(`/admin/users?q=${encodeURIComponent('')}&page=1&size=100`);
      const fresh = (res.data.items || []).find(u => u.id === userId);
      if (fresh) setSelected(fresh);
    } catch { /* sessiz */ }
  };

  const submitPunish = async () => {
    if (!reason.trim() || !selected) return;
    setSubmitting(true);
    try {
      const body = { action, reason };
      if (action === 'restrict') body.restrictions = restrictions;
      await axiosInstance.post(`/admin/users/${selected.id}/punish`, body);
      const mailNote = action === 'shadow_ban' ? 'uygulandı' : 'uygulandı — mail gönderildi';
      toast.success(`${ACTION_CONFIG[action].label} ${mailNote}`);
      setPunishOpen(false);
      setReason('');
      await Promise.all([
        loadWarnings(selected.id),
        search(),
        refreshSelected(selected.id),
      ]);
    } catch (e) {
      toast.error('İşlem başarısız', { sub: e.response?.data?.detail || e.message });
    } finally { setSubmitting(false); }
  };

  const submitLift = async () => {
    if (!selected) return;
    if (!liftBan && !liftShadow && !liftRestrict) {
      toast.error('En az bir seçenek işaretleyin');
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.post(`/admin/users/${selected.id}/lift`, {
        lift_ban: liftBan,
        lift_shadow_ban: liftShadow,
        lift_restrictions: liftRestrict,
      });
      toast.success('Kısıtlama kaldırıldı', { sub: 'Kullanıcıya bildirim gönderildi' });
      setLiftOpen(false);
      await Promise.all([
        loadWarnings(selected.id),
        search(),
        refreshSelected(selected.id),
      ]);
    } catch (e) {
      toast.error('İşlem başarısız', { sub: e.response?.data?.detail || e.message });
    } finally { setSubmitting(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const ACTION_BADGE = {
    warn:       badge(A.amber, A.amberDim),
    restrict:   badge(A.amber, A.amberDim),
    shadow_ban: badge(A.red,   A.redDim),
    ban:        badge(A.red,   A.redDim),
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

      {/* Sol: Kullanıcı listesi */}
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Kullanıcı ara…"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${A.border}`, background: A.card, color: A.text1,
              fontSize: 13, fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ ...tableWrap }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={24} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ ...thead }}>
                  <tr>
                    {['Kullanıcı', 'Rol', 'Durum', 'XP', 'Seç'].map(h => (
                      <th key={h} style={{ ...th }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>Kullanıcı bulunamadı</td></tr>
                  ) : users.map(u => {
                    const isSelected = selected?.id === u.id;
                    const hasRestriction = !u.can_comment || !u.can_post_analysis || !u.can_create_thread;
                    return (
                      <tr key={u.id}
                        style={{
                          borderTop: `1px solid ${A.border}`,
                          background: isSelected ? A.brandDim : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => selectUser(u)}
                      >
                        <td style={{ ...td }}>
                          <div style={{ fontWeight: 600, color: A.text1 }}>{u.username}</div>
                          <div style={{ fontSize: 11, color: A.text3 }}>{u.email}</div>
                        </td>
                        <td style={{ ...td }}>
                          <span style={{ fontSize: 11, color: A.text3 }}>{u.role}</span>
                        </td>
                        <td style={{ ...td }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {!u.is_active && <span style={{ ...badge(A.red, A.redDim) }}>Banlı</span>}
                            {u.is_shadow_banned && <span style={{ ...badge(A.amber, A.amberDim) }}>Gölge Ban</span>}
                            {hasRestriction && <span style={{ ...badge(A.amber, A.amberDim) }}>Kısıtlı</span>}
                            {u.is_active && !u.is_shadow_banned && !hasRestriction && (
                              <span style={{ fontSize: 11, color: A.brand }}>✓ Normal</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...td, color: A.text3, textAlign: 'right' }}>{u.total_xp}</td>
                        <td style={{ ...td }}>
                          <button onClick={() => selectUser(u)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: isSelected ? A.brand : A.card,
                              color: isSelected ? '#fff' : A.text3,
                              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            {isSelected ? 'Seçili' : 'Seç'}
                          </button>
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
      </div>

      {/* Sağ: Seçilen kullanıcı paneli */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!selected ? (
          <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
            Soldan bir kullanıcı seçin
          </div>
        ) : (
          <>
            {/* Kullanıcı Özet */}
            <div style={{ ...card }}>
              <div style={{ ...cardHead }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>{selected.username}</span>
                <span style={{ fontSize: 11, color: A.text3 }}>{selected.role}</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: A.text3 }}>Durum</span>
                  <span style={{ color: selected.is_active ? A.brand : A.red, fontWeight: 700 }}>
                    {selected.is_active ? 'Aktif' : 'Banlı'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: A.text3 }}>Gölge Ban</span>
                  <span style={{ color: selected.is_shadow_banned ? A.amber : A.text3, fontWeight: 700 }}>
                    {selected.is_shadow_banned ? 'Evet' : 'Hayır'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: A.text3 }}>Yorum</span>
                  <span style={{ color: selected.can_comment ? A.brand : A.red }}>{selected.can_comment ? '✓' : '✗'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: A.text3 }}>Analiz</span>
                  <span style={{ color: selected.can_post_analysis ? A.brand : A.red }}>{selected.can_post_analysis ? '✓' : '✗'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: A.text3 }}>Başlık Aç</span>
                  <span style={{ color: selected.can_create_thread ? A.brand : A.red }}>{selected.can_create_thread ? '✓' : '✗'}</span>
                </div>
                {selected.restriction_reason && (
                  <div style={{ fontSize: 11, color: A.amber, padding: '6px 10px', background: A.amberDim, borderRadius: 6 }}>
                    Sebep: {selected.restriction_reason}
                  </div>
                )}
              </div>
              <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
                <button onClick={() => { setPunishOpen(true); setAction('warn'); setReason(''); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                    background: A.redDim, color: A.red,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <AlertTriangle size={13} /> İşlem Uygula
                </button>
                <button onClick={() => { setLiftOpen(true); setLiftBan(false); setLiftShadow(false); setLiftRestrict(false); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                    background: A.brandDim, color: A.brand,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Shield size={13} /> Kısıtlamayı Kaldır
                </button>
              </div>
            </div>

            {/* Uyarı Geçmişi */}
            <div style={{ ...card }}>
              <div style={{ ...cardHead }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <History size={13} color={A.brand} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: A.text1 }}>Uyarı Geçmişi</span>
                </div>
                <span style={{ fontSize: 11, color: A.text3 }}>{warnings.length} kayıt</span>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {warnLoad ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <Loader2 size={20} color={A.brand} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : warnings.length === 0 ? (
                  <p style={{ padding: '20px 16px', fontSize: 12, color: A.text3, textAlign: 'center', margin: 0 }}>
                    Uyarı kaydı yok
                  </p>
                ) : warnings.map(w => {
                  const ac = ACTION_CONFIG[w.action] || { label: w.action, color: A.text3, dim: A.card };
                  return (
                    <div key={w.id} style={{
                      padding: '12px 16px', borderTop: `1px solid ${A.border}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ ...badge(ac.color, ac.dim) }}>{ac.label}</span>
                        <span style={{ fontSize: 11, color: A.text3 }}>
                          {new Date(w.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: A.text2, margin: 0 }}>{w.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ceza Uygula Modal */}
      {punishOpen && selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ ...card, width: 480, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: A.text1, marginBottom: 4 }}>
              İşlem Uygula
            </h3>
            <p style={{ fontSize: 12, color: A.text3, marginBottom: 20 }}>
              Hedef: <strong style={{ color: A.text1 }}>{selected.username}</strong>
              {' '}— İşlem sonrası kullanıcıya otomatik mail gönderilir.
            </p>

            {/* Aksiyon seç */}
            <label style={{ fontSize: 12, color: A.text3, display: 'block', marginBottom: 6 }}>Aksiyon</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {Object.entries(ACTION_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setAction(k)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${action === k ? v.color : A.border}`,
                    background: action === k ? v.dim : 'transparent',
                    color: action === k ? v.color : A.text3,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {v.label}
                </button>
              ))}
            </div>

            {/* Kısıtlama seçenekleri */}
            {action === 'restrict' && (
              <div style={{ marginBottom: 16, padding: 12, background: A.card, borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: A.text3, marginBottom: 8 }}>Hangi işlemler kısıtlanacak?</p>
                {[
                  ['can_comment',       'Yorum yapma'],
                  ['can_post_analysis', 'Analiz gönderme'],
                  ['can_create_thread', 'Başlık açma'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={!restrictions[key]}
                      onChange={e => setRestrictions(prev => ({ ...prev, [key]: !e.target.checked }))}
                      style={{ accentColor: A.brand }}
                    />
                    <span style={{ fontSize: 13, color: A.text2 }}>{label} kısıtlansın</span>
                  </label>
                ))}
              </div>
            )}

            {/* Sebep */}
            <label style={{ fontSize: 12, color: A.text3, display: 'block', marginBottom: 6 }}>
              Sebep <span style={{ color: A.red }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ceza sebebini açıklayın…"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${A.border}`, background: A.card, color: A.text1,
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPunishOpen(false)}
                style={{ ...ghostBtn, padding: '8px 16px' }}>İptal</button>
              <button onClick={submitPunish} disabled={submitting || !reason.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: action === 'ban' || action === 'shadow_ban' ? A.red : A.amber,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: submitting || !reason.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: submitting || !reason.trim() ? 0.5 : 1,
                }}>
                {submitting ? 'Uygulanıyor…' : ACTION_CONFIG[action]?.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kısıtlama Kaldır Modal */}
      {liftOpen && selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ ...card, width: 400, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: A.text1, marginBottom: 16 }}>
              Kısıtlama Kaldır — {selected.username}
            </h3>

            {[
              [liftBan,      setLiftBan,      'Ban kaldır (hesabı aktifleştir)',   !selected.is_active],
              [liftShadow,   setLiftShadow,   'Gölge ban kaldır',                  selected.is_shadow_banned],
              [liftRestrict, setLiftRestrict, 'İçerik kısıtlamalarını kaldır',     !selected.can_comment || !selected.can_post_analysis || !selected.can_create_thread],
            ].map(([val, setter, label, relevant]) => (
              <label key={label} style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                cursor: relevant ? 'pointer' : 'not-allowed', opacity: relevant ? 1 : 0.4,
              }}>
                <input type="checkbox" checked={val} disabled={!relevant}
                  onChange={e => setter(e.target.checked)}
                  style={{ accentColor: A.brand }}
                />
                <span style={{ fontSize: 13, color: A.text2 }}>{label}</span>
              </label>
            ))}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setLiftOpen(false)}
                style={{ ...ghostBtn, padding: '8px 16px' }}>İptal</button>
              <button onClick={submitLift} disabled={submitting}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: A.brand, color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: submitting ? 0.5 : 1,
                }}>
                {submitting ? 'Kaldırılıyor…' : 'Kaldır'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── İçerikler Sekmesi ───────────────────────────────────────────────────── */
const ACTION_CONFIG_POSTS = {
  warn:       { label: 'Uyar',        color: A.amber, dim: A.amberDim },
  restrict:   { label: 'Kısıtla',     color: A.amber, dim: A.amberDim },
  shadow_ban: { label: 'Gölge Yasak', color: A.red,   dim: A.redDim   },
  ban:        { label: 'Kalıcı Ban',  color: A.red,   dim: A.redDim   },
};

const PAGE_SIZE_POSTS = 20;

function PostsTab() {
  const [type,    setType]    = useState('thread');
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [q,       setQ]       = useState('');
  const [qInput,  setQInput]  = useState('');
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  // Warn modal
  const [warnTarget,   setWarnTarget]   = useState(null); // { id, username, postId, postType }
  const [warnAction,   setWarnAction]   = useState('warn');
  const [warnReason,   setWarnReason]   = useState('');
  const [warnRestrict, setWarnRestrict] = useState({ can_comment: true, can_post_analysis: true, can_create_thread: true });
  const [warnBusy,     setWarnBusy]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, page, size: PAGE_SIZE_POSTS });
      if (q) params.set('q', q);
      const res = await axiosInstance.get(`/admin/forum/posts?${params}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { /* sessiz */ } finally { setLoading(false); }
  }, [type, page, q]);

  useEffect(() => { load(); }, [load]);

  const deletePost = (item) => {
    popup.confirm({
      title:        `${item.type === 'thread' ? 'Başlığı' : 'Yorumu'} sil`,
      message:      `"${(item.title || item.body).slice(0, 60)}…" kalıcı olarak silinecek.`,
      danger:       true,
      confirmLabel: 'Sil',
      onConfirm: async () => {
        setActing(item.id + '_del');
        try {
          if (item.type === 'thread') {
            await axiosInstance.delete(`/admin/forum/threads/${item.id}`);
          } else {
            await axiosInstance.post(`/admin/forum/comments/${item.id}/remove`);
          }
          toast.success('İçerik silindi');
          load();
        } catch (e) {
          toast.error('Silme başarısız', { sub: e.response?.data?.detail || e.message });
        } finally { setActing(null); }
      },
    });
  };

  const submitWarn = async () => {
    if (!warnReason.trim() || !warnTarget) return;
    setWarnBusy(true);
    try {
      const body = { action: warnAction, reason: warnReason };
      if (warnAction === 'restrict') body.restrictions = warnRestrict;
      await axiosInstance.post(`/admin/users/${warnTarget.userId}/punish`, body);
      toast.success('İşlem uygulandı', { sub: `${ACTION_CONFIG_POSTS[warnAction].label} — ${warnTarget.username}` });
      setWarnTarget(null);
      setWarnReason('');
    } catch (e) {
      toast.error('İşlem başarısız', { sub: e.response?.data?.detail || e.message });
    } finally { setWarnBusy(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE_POSTS) || 1;

  const STATUS_BADGE = {
    active:       { color: A.brand, dim: A.brandDim },
    under_review: { color: A.amber, dim: A.amberDim },
    resolved:     { color: A.blue,  dim: A.blueDim  },
    flagged_ai:   { color: A.red,   dim: A.redDim   },
    flagged_user: { color: A.red,   dim: A.redDim   },
    removed:      { color: A.text3, dim: A.card      },
    clean:        { color: A.brand, dim: A.brandDim  },
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Tür toggle */}
        <div style={{ display: 'flex', gap: 4, background: A.card, borderRadius: 8, padding: 3, border: `1px solid ${A.border}` }}>
          {[['thread', 'Başlıklar'], ['comment', 'Yorumlar']].map(([v, l]) => (
            <button key={v} onClick={() => { setType(v); setPage(1); }}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', fontFamily: 'inherit',
                background: type === v ? A.brand : 'transparent',
                color:      type === v ? '#fff'   : A.text3,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Arama */}
        <form onSubmit={e => { e.preventDefault(); setQ(qInput.trim()); setPage(1); }}
          style={{ display: 'flex', gap: 6, flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} color={A.text3} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={qInput} onChange={e => setQInput(e.target.value)}
              placeholder={type === 'thread' ? 'Başlıkta ara…' : 'İçerikte ara…'}
              style={{
                width: '100%', padding: '7px 12px 7px 30px', borderRadius: 8,
                border: `1px solid ${A.border}`, background: A.card, color: A.text1,
                fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="submit" style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: A.brand, color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Ara</button>
          {q && (
            <button type="button" onClick={() => { setQ(''); setQInput(''); setPage(1); }}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${A.border}`, background: 'transparent', color: A.text3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Temizle
            </button>
          )}
        </form>

        <span style={{ fontSize: 12, color: A.text3, marginLeft: 'auto' }}>{total} kayıt</span>
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
                  {['Yazar', type === 'thread' ? 'Başlık' : 'Yorum / Başlık', 'Durum', 'Tarih', 'İşlemler'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3 }}>
                      İçerik bulunamadı
                    </td>
                  </tr>
                ) : items.map(item => {
                  const sb = STATUS_BADGE[item.status] || { color: A.text3, dim: A.card };
                  return (
                    <tr key={item.id}
                      style={{ borderTop: `1px solid ${A.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = A.card}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Yazar */}
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: A.text1 }}>{item.author}</span>
                      </td>

                      {/* İçerik */}
                      <td style={{ ...td, maxWidth: 380 }}>
                        {type === 'thread' ? (
                          <>
                            <a
                              href={`/forum/${item.id}`} target="_blank" rel="noreferrer"
                              style={{ fontWeight: 600, color: A.text1, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => e.target.style.color = A.brand}
                              onMouseLeave={e => e.target.style.color = A.text1}
                            >
                              {item.title}
                            </a>
                            <div style={{ fontSize: 12, color: A.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                              {item.body}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ color: A.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.body}
                            </div>
                            <a
                              href={`/forum/${item.thread_id}`} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, color: A.text3, textDecoration: 'none', marginTop: 2, display: 'block' }}
                              onMouseEnter={e => e.target.style.color = A.brand}
                              onMouseLeave={e => e.target.style.color = A.text3}
                            >
                              ↳ {item.title}
                            </a>
                          </>
                        )}
                      </td>

                      {/* Durum */}
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <span style={{ ...badge(sb.color, sb.dim) }}>{item.status || '—'}</span>
                      </td>

                      {/* Tarih */}
                      <td style={{ ...td, color: A.text3, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleString('tr-TR')}
                      </td>

                      {/* İşlemler */}
                      <td style={{ ...td }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {/* Uyar butonu */}
                          <button
                            onClick={() => setWarnTarget({ userId: item.author_id, username: item.author })}
                            title="Kullanıcıyı uyar"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: A.amberDim, color: A.amber,
                              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            <AlertTriangle size={11} /> Uyar
                          </button>

                          {/* Sil butonu */}
                          <button
                            onClick={() => deletePost(item)}
                            disabled={acting === item.id + '_del'}
                            title="İçeriği sil"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: A.redDim, color: A.red,
                              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                              opacity: acting === item.id + '_del' ? 0.5 : 1,
                            }}>
                            <Trash2 size={11} /> Sil
                          </button>
                        </div>
                      </td>
                    </tr>
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
          <span style={{ fontSize: 12, color: A.text3 }}>{page} / {totalPages}</span>
          <button disabled={page * PAGE_SIZE_POSTS >= total} onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page * PAGE_SIZE_POSTS >= total ? 'not-allowed' : 'pointer', color: page * PAGE_SIZE_POSTS >= total ? A.border : A.text2, fontSize: 13, fontFamily: 'inherit', opacity: page * PAGE_SIZE_POSTS >= total ? 0.4 : 1 }}>
            Sonraki <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Uyar Modal */}
      {warnTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...card, width: 460, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: A.text1, marginBottom: 4 }}>İşlem Uygula</h3>
            <p style={{ fontSize: 12, color: A.text3, marginBottom: 20 }}>
              Hedef: <strong style={{ color: A.text1 }}>{warnTarget.username}</strong>
              {' '}— İşlem sonrası kullanıcıya otomatik mail gönderilir.
            </p>

            <label style={{ fontSize: 12, color: A.text3, display: 'block', marginBottom: 6 }}>Aksiyon</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {Object.entries(ACTION_CONFIG_POSTS).map(([k, v]) => (
                <button key={k} onClick={() => setWarnAction(k)}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: `1px solid ${warnAction === k ? v.color : A.border}`,
                    background: warnAction === k ? v.dim : 'transparent',
                    color: warnAction === k ? v.color : A.text3,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {v.label}
                </button>
              ))}
            </div>

            {warnAction === 'restrict' && (
              <div style={{ marginBottom: 16, padding: 12, background: A.card, borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: A.text3, marginBottom: 8 }}>Hangi işlemler kısıtlanacak?</p>
                {[['can_comment', 'Yorum yapma'], ['can_post_analysis', 'Analiz gönderme'], ['can_create_thread', 'Başlık açma']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={!warnRestrict[key]}
                      onChange={e => setWarnRestrict(prev => ({ ...prev, [key]: !e.target.checked }))}
                      style={{ accentColor: A.brand }}
                    />
                    <span style={{ fontSize: 13, color: A.text2 }}>{label} kısıtlansın</span>
                  </label>
                ))}
              </div>
            )}

            <label style={{ fontSize: 12, color: A.text3, display: 'block', marginBottom: 6 }}>
              Sebep <span style={{ color: A.red }}>*</span>
            </label>
            <textarea
              value={warnReason} onChange={e => setWarnReason(e.target.value)}
              placeholder="Ceza sebebini açıklayın…" rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${A.border}`, background: A.card, color: A.text1,
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                boxSizing: 'border-box', marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setWarnTarget(null); setWarnReason(''); }}
                style={{ ...ghostBtn, padding: '8px 16px' }}>İptal</button>
              <button onClick={submitWarn} disabled={warnBusy || !warnReason.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: warnAction === 'ban' || warnAction === 'shadow_ban' ? A.red : A.amber,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: warnBusy || !warnReason.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: warnBusy || !warnReason.trim() ? 0.5 : 1,
                }}>
                {warnBusy ? 'Uygulanıyor…' : ACTION_CONFIG_POSTS[warnAction]?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Ana Bileşen ─────────────────────────────────────────────────────────── */
export default function AdminCommunity() {
  const [tab, setTab] = useState('posts');

  return (
    <div style={{ ...pageWrap }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Users size={20} color={A.brand} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Topluluk Yönetimi</h1>
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

      {tab === 'posts'      && <PostsTab />}
      {tab === 'queue'      && <QueueTab />}
      {tab === 'reputation' && <ReputationTab />}

      <style>{ANIM}</style>
    </div>
  );
}
