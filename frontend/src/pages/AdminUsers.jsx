import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, UserX, UserCheck, ChevronLeft, ChevronRight, Loader2,
  RotateCcw, EyeOff, Eye, LogOut, Zap, Search, X,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from '../services/toast';
import popup from '../services/popup';
import { A, pageWrap, tableWrap, thead, th, td, ANIM } from './adminTheme';

const PAGE_SIZE = 20;

function XPInput({ userId, currentXP, onDone }) {
  const [delta, setDelta] = useState('');
  const [busy,  setBusy]  = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    const d = parseInt(delta, 10);
    if (!delta || isNaN(d)) return;
    setBusy(true);
    try {
      const res = await axiosInstance.patch(`/admin/users/${userId}/xp`, { delta: d });
      toast.success('XP güncellendi', { sub: `${currentXP} → ${res.data.total_xp} XP` });
      onDone(res.data);
    } catch (err) {
      toast.error('XP güncellenemedi', { sub: err.response?.data?.detail ?? err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        ref={inputRef}
        type="number"
        placeholder="±XP"
        value={delta}
        onChange={e => setDelta(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onDone(null); }}
        style={{
          width: 64, padding: '4px 8px', borderRadius: 6,
          background: A.bg, border: `1px solid ${A.border}`,
          color: A.text1, fontSize: 12, fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <button
        onClick={submit} disabled={busy}
        style={{ padding: '4px 10px', borderRadius: 6, background: A.brand, border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
      >
        {busy ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Uygula'}
      </button>
      <button
        onClick={() => onDone(null)}
        style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, cursor: 'pointer', fontSize: 11 }}
      >
        <X size={11} />
      </button>
    </div>
  );
}

function ActionBtn({ title, color, loading, onClick, icon }) {
  return (
    <button
      onClick={onClick} disabled={loading} title={title} aria-label={title}
      style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'transparent', border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        color: loading ? A.border : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
    </button>
  );
}

export default function AdminUsers() {
  const [users,         setUsers]         = useState([]);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search,        setSearch]        = useState('');
  const [searchInput,   setSearchInput]   = useState('');
  const [xpEditId,      setXpEditId]      = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: PAGE_SIZE });
      if (search) params.set('q', search);
      const res = await axiosInstance.get(`/admin/users?${params}`);
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Kullanıcılar yüklenemedi', { sub: err.response?.data?.detail ?? err.message });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const updateLocal = (updated) =>
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

  const toggleActive = (user) => {
    popup.confirm({
      title:        user.is_active ? 'Kullanıcıyı devre dışı bırak' : 'Kullanıcıyı aktif et',
      message:      `${user.username} adlı kullanıcı ${user.is_active ? 'devre dışı bırakılacak' : 'tekrar aktif edilecek'}.`,
      danger:       user.is_active,
      confirmLabel: user.is_active ? 'Devre Dışı Bırak' : 'Aktif Et',
      onConfirm: async () => {
        setActionLoading(user.id);
        try {
          const res = await axiosInstance.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
          updateLocal(res.data);
          toast.success(user.is_active ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktif edildi');
        } catch (err) {
          toast.error('İşlem başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally { setActionLoading(null); }
      },
    });
  };

  const restoreUser = (user) => {
    popup.confirm({
      title: 'Hesabı geri yükle',
      message: `${user.username} adlı kullanıcının hesabı geri yüklenecek.`,
      danger: false, confirmLabel: 'Geri Yükle',
      onConfirm: async () => {
        setActionLoading(user.id);
        try {
          const res = await axiosInstance.post(`/admin/users/${user.id}/restore`);
          updateLocal(res.data);
          toast.success('Hesap geri yüklendi');
        } catch (err) {
          toast.error('Geri yükleme başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally { setActionLoading(null); }
      },
    });
  };

  const changeRole = async (user, role) => {
    setActionLoading(user.id);
    try {
      const res = await axiosInstance.patch(`/admin/users/${user.id}`, { role });
      updateLocal(res.data);
      toast.success('Rol güncellendi', { sub: `${user.username} → ${role === 'admin' ? 'Admin' : 'Kullanıcı'}` });
    } catch (err) {
      toast.error('Rol değiştirilemedi', { sub: err.response?.data?.detail ?? err.message });
    } finally { setActionLoading(null); }
  };

  const toggleShadowBan = (user) => {
    const banning = !user.is_shadow_banned;
    popup.confirm({
      title:        banning ? 'Shadow Ban Uygula' : 'Shadow Ban Kaldır',
      message:      banning
        ? `${user.username} adlı kullanıcıya shadow ban uygulanacak. Kullanıcı bunu görmeyecek.`
        : `${user.username} adlı kullanıcının shadow ban'ı kaldırılacak.`,
      danger: banning, confirmLabel: banning ? 'Uygula' : 'Kaldır',
      onConfirm: async () => {
        setActionLoading(user.id + '_shadow');
        try {
          const res = await axiosInstance.patch(`/admin/users/${user.id}/shadow-ban`, { ban: banning });
          updateLocal(res.data);
          toast.warning(banning ? `Shadow ban uygulandı — ${user.username}` : `Shadow ban kaldırıldı — ${user.username}`);
        } catch (err) {
          toast.error('Shadow ban işlemi başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally { setActionLoading(null); }
      },
    });
  };

  const forceLogout = (user) => {
    popup.confirm({
      title:        'Tüm oturumları sonlandır',
      message:      `${user.username} adlı kullanıcının tüm aktif oturumları sonlandırılacak.`,
      danger: true, confirmLabel: 'Sonlandır',
      onConfirm: async () => {
        setActionLoading(user.id + '_logout');
        try {
          await axiosInstance.post(`/admin/users/${user.id}/sessions/terminate`);
          toast.warning(`Oturumlar sonlandırıldı — ${user.username}`);
        } catch (err) {
          toast.error('Oturum sonlandırma başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally { setActionLoading(null); }
      },
    });
  };

  const isLoading = (id, suffix = '') => actionLoading === id + suffix;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div style={{ ...pageWrap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: A.text1, margin: 0 }}>Kullanıcı Yönetimi</h1>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: A.text3 }}>{total} kullanıcı</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={13} color={A.text3} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Kullanıcı adı veya e-posta ara…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 32px',
              background: A.card, border: `1px solid ${A.border}`,
              borderRadius: 8, color: A.text1, fontSize: 13,
              fontFamily: 'Elms Sans, system-ui, sans-serif',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button type="submit" style={{ padding: '9px 18px', borderRadius: 8, background: A.brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Ara
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${A.border}`, color: A.text3, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
          >
            Temizle
          </button>
        )}
      </form>

      {/* Table */}
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
                  {['Kullanıcı', 'E-posta', 'Rol', 'Durum', 'XP / Seviye', 'Güven', 'Kayıt', 'İşlemler'].map(h => (
                    <th key={h} style={{ ...th }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: A.text3, fontSize: 13 }}>
                      Kullanıcı bulunamadı
                    </td>
                  </tr>
                )}
                {users.map(u => (
                  <tr key={u.id} style={{
                    background:     u.is_shadow_banned ? 'rgba(239,68,68,0.04)' : 'transparent',
                    borderTop:      `1px solid ${A.border}`,
                    transition:     'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = u.is_shadow_banned ? 'rgba(239,68,68,0.07)' : A.card}
                    onMouseLeave={e => e.currentTarget.style.background = u.is_shadow_banned ? 'rgba(239,68,68,0.04)' : 'transparent'}
                  >
                    {/* Kullanıcı */}
                    <td style={{ ...td }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {u.is_shadow_banned && <EyeOff size={12} color={A.red} title="Shadow ban aktif" />}
                        <span style={{ fontWeight: 600, color: A.text1 }}>{u.username}</span>
                      </div>
                    </td>

                    {/* E-posta */}
                    <td style={{ ...td, color: A.text3, fontSize: 12 }}>{u.email}</td>

                    {/* Rol */}
                    <td style={{ ...td }}>
                      <select
                        value={u.role}
                        disabled={isLoading(u.id)}
                        onChange={e => changeRole(u, e.target.value)}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: A.bg, border: `1px solid ${A.border}`,
                          color: u.role === 'admin' ? A.brand : A.text2,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/* Durum */}
                    <td style={{ ...td }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 9px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        background: u.is_active ? A.brandDim : A.redDim,
                        color:      u.is_active ? A.brand    : A.red,
                      }}>
                        {u.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>

                    {/* XP / Seviye */}
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {xpEditId === u.id ? (
                        <XPInput
                          userId={u.id} currentXP={u.total_xp}
                          onDone={updated => { if (updated) updateLocal(updated); setXpEditId(null); }}
                        />
                      ) : (
                        <button onClick={() => setXpEditId(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: A.amber }}>{u.total_xp} XP</span>
                          <span style={{ fontSize: 12, color: A.text3, marginLeft: 5 }}>Lv{u.level}</span>
                        </button>
                      )}
                    </td>

                    {/* Güven */}
                    <td style={{ ...td, color: A.text3, fontSize: 12 }}>
                      {u.forum_trust_score?.toFixed(1) ?? '0.0'}
                    </td>

                    {/* Kayıt */}
                    <td style={{ ...td, color: A.text3, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>

                    {/* İşlemler */}
                    <td style={{ ...td }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {u.deleted_at ? (
                          <ActionBtn title="Hesabı geri yükle" color={A.brand} loading={isLoading(u.id)} onClick={() => restoreUser(u)} icon={<RotateCcw size={13} />} />
                        ) : (
                          <ActionBtn title={u.is_active ? 'Devre dışı bırak' : 'Aktif et'} color={u.is_active ? A.red : A.brand} loading={isLoading(u.id)} onClick={() => toggleActive(u)} icon={u.is_active ? <UserX size={13} /> : <UserCheck size={13} />} />
                        )}
                        <ActionBtn title={u.is_shadow_banned ? 'Shadow ban kaldır' : 'Shadow ban uygula'} color={u.is_shadow_banned ? A.amber : A.text3} loading={isLoading(u.id, '_shadow')} onClick={() => toggleShadowBan(u)} icon={u.is_shadow_banned ? <Eye size={13} /> : <EyeOff size={13} />} />
                        <ActionBtn title="Tüm oturumları sonlandır" color={A.text3} loading={isLoading(u.id, '_logout')} onClick={() => forceLogout(u)} icon={<LogOut size={13} />} />
                        <ActionBtn title="XP düzenle" color={A.amber} loading={false} onClick={() => setXpEditId(u.id)} icon={<Zap size={13} />} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      <style>{ANIM}</style>
    </div>
  );
}
