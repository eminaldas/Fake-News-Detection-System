import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, UserX, UserCheck, ChevronLeft, ChevronRight, Loader2,
  RotateCcw, EyeOff, Eye, LogOut, Zap, Search, X,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from '../services/toast';
import popup from '../services/popup';

const C = {
  bg:     '#070f12',
  card:   '#0d1a1f',
  border: '#1a2f38',
  neon:   '#00e5a0',
  red:    '#ff5555',
  yellow: '#ffcc00',
  text:   '#c8e6f0',
  muted:  '#5a7a88',
  surface:'#111f26',
};

const PAGE_SIZE = 20;

function XPInput({ userId, currentXP, onDone }) {
  const [delta, setDelta]   = useState('');
  const [busy, setBusy]     = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    const d = parseInt(delta, 10);
    if (!delta || isNaN(d)) return;
    setBusy(true);
    try {
      const res = await axiosInstance.patch(`/admin/users/${userId}/xp`, { delta: d });
      toast.success(`XP güncellendi`, { sub: `${currentXP} → ${res.data.total_xp} XP` });
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
          width: 64, padding: '3px 6px', borderRadius: 4,
          background: C.bg, border: `1px solid ${C.border}`,
          color: C.text, fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
        }}
      />
      <button
        onClick={submit}
        disabled={busy}
        style={{ padding: '3px 8px', borderRadius: 4, background: C.neon, border: 'none', color: '#000', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
      >
        {busy ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Uygula'}
      </button>
      <button
        onClick={() => onDone(null)}
        style={{ padding: '3px 6px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: '0.68rem' }}
      >
        <X size={11} />
      </button>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [xpEditId, setXpEditId]         = useState(null);

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

  const updateLocal = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const toggleActive = (user) => {
    popup.confirm({
      title:        user.is_active ? 'Kullanıcıyı devre dışı bırak' : 'Kullanıcıyı aktif et',
      message:      `${user.username} adlı kullanıcı ${user.is_active ? 'devre dışı bırakılacak' : 'tekrar aktif edilecek'}.`,
      danger:       user.is_active,
      confirmLabel: user.is_active ? 'Devre Dışı Bırak' : 'Aktif Et',
      onConfirm:    async () => {
        setActionLoading(user.id);
        try {
          const res = await axiosInstance.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
          updateLocal(res.data);
          toast.success(user.is_active ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktif edildi');
        } catch (err) {
          toast.error('İşlem başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const restoreUser = (user) => {
    popup.confirm({
      title:        'Hesabı geri yükle',
      message:      `${user.username} adlı kullanıcının hesabı geri yüklenecek.`,
      danger:       false,
      confirmLabel: 'Geri Yükle',
      onConfirm:    async () => {
        setActionLoading(user.id);
        try {
          const res = await axiosInstance.post(`/admin/users/${user.id}/restore`);
          updateLocal(res.data);
          toast.success('Hesap geri yüklendi');
        } catch (err) {
          toast.error('Geri yükleme başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const changeRole = async (user, role) => {
    setActionLoading(user.id);
    try {
      const res = await axiosInstance.patch(`/admin/users/${user.id}`, { role });
      updateLocal(res.data);
      toast.success(`Rol güncellendi`, { sub: `${user.username} → ${role === 'admin' ? 'Admin' : 'Kullanıcı'}` });
    } catch (err) {
      toast.error('Rol değiştirilemedi', { sub: err.response?.data?.detail ?? err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleShadowBan = (user) => {
    const banning = !user.is_shadow_banned;
    popup.confirm({
      title:        banning ? 'Shadow Ban Uygula' : 'Shadow Ban Kaldır',
      message:      banning
        ? `${user.username} adlı kullanıcıya shadow ban uygulanacak. Kullanıcı bunu görmeyecek.`
        : `${user.username} adlı kullanıcının shadow ban'ı kaldırılacak.`,
      danger:       banning,
      confirmLabel: banning ? 'Uygula' : 'Kaldır',
      onConfirm:    async () => {
        setActionLoading(user.id + '_shadow');
        try {
          const res = await axiosInstance.patch(`/admin/users/${user.id}/shadow-ban`, { ban: banning });
          updateLocal(res.data);
          toast.warning(banning ? `Shadow ban uygulandı — ${user.username}` : `Shadow ban kaldırıldı — ${user.username}`);
        } catch (err) {
          toast.error('Shadow ban işlemi başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const forceLogout = (user) => {
    popup.confirm({
      title:        'Tüm oturumları sonlandır',
      message:      `${user.username} adlı kullanıcının tüm aktif oturumları sonlandırılacak. Kullanıcı otomatik çıkış yapacak.`,
      danger:       true,
      confirmLabel: 'Sonlandır',
      onConfirm:    async () => {
        setActionLoading(user.id + '_logout');
        try {
          await axiosInstance.post(`/admin/users/${user.id}/sessions/terminate`);
          toast.warning(`Oturumlar sonlandırıldı — ${user.username}`);
        } catch (err) {
          toast.error('Oturum sonlandırma başarısız', { sub: err.response?.data?.detail ?? err.message });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const isLoading = (id, suffix = '') => actionLoading === id + suffix;

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: 24, color: C.text }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Shield size={18} color={C.neon} />
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem', fontWeight: 700, color: C.text, margin: 0 }}>
          Kullanıcı Yönetimi
        </h1>
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.muted }}>
          {total} kullanıcı
        </span>
      </div>

      {/* Arama */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} color={C.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Kullanıcı adı veya e-posta ara…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.text, fontSize: '0.75rem', fontFamily: 'Inter, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '8px 16px', borderRadius: 6, background: C.neon, border: 'none',
            color: '#000', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Ara
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            style={{
              padding: '8px 12px', borderRadius: 6, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: '0.72rem',
            }}
          >
            Temizle
          </button>
        )}
      </form>

      {/* Tablo */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={28} color={C.muted} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                  {['Kullanıcı', 'E-posta', 'Rol', 'Durum', 'XP / Seviye', 'Güven', 'Kayıt', 'İşlemler'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: C.muted, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: `1px solid ${C.border}`, background: u.is_shadow_banned ? 'rgba(255,85,85,0.04)' : 'transparent' }}
                  >
                    {/* Kullanıcı */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {u.is_shadow_banned && (
                          <EyeOff size={11} color={C.red} title="Shadow ban aktif" />
                        )}
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: C.text }}>
                          {u.username}
                        </span>
                      </div>
                    </td>

                    {/* E-posta */}
                    <td style={{ padding: '10px 14px', color: C.muted, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }}>
                      {u.email}
                    </td>

                    {/* Rol */}
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={u.role}
                        disabled={isLoading(u.id)}
                        onChange={e => changeRole(u, e.target.value)}
                        style={{
                          padding: '3px 6px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                          background: C.bg, border: `1px solid ${C.border}`, color: u.role === 'admin' ? C.neon : C.text,
                          cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/* Durum */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700,
                        fontFamily: 'Inter, sans-serif',
                        background: u.is_active ? 'rgba(0,229,160,0.12)' : 'rgba(255,85,85,0.12)',
                        color:      u.is_active ? C.neon : C.red,
                      }}>
                        {u.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>

                    {/* XP / Seviye */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {xpEditId === u.id ? (
                        <XPInput
                          userId={u.id}
                          currentXP={u.total_xp}
                          onDone={(updated) => { if (updated) updateLocal(updated); setXpEditId(null); }}
                        />
                      ) : (
                        <button
                          onClick={() => setXpEditId(u.id)}
                          title="XP düzenle"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                        >
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.yellow }}>
                            {u.total_xp} XP
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: C.muted, marginLeft: 4 }}>
                            Lv{u.level}
                          </span>
                        </button>
                      )}
                    </td>

                    {/* Güven skoru */}
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.muted }}>
                      {u.forum_trust_score?.toFixed(1) ?? '0.0'}
                    </td>

                    {/* Kayıt tarihi */}
                    <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: C.muted, whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>

                    {/* İşlemler */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                        {/* Aktif / Pasif / Geri yükle */}
                        {u.deleted_at ? (
                          <ActionBtn
                            title="Hesabı geri yükle"
                            color={C.neon}
                            loading={isLoading(u.id)}
                            onClick={() => restoreUser(u)}
                            icon={<RotateCcw size={13} />}
                          />
                        ) : (
                          <ActionBtn
                            title={u.is_active ? 'Devre dışı bırak' : 'Aktif et'}
                            color={u.is_active ? C.red : C.neon}
                            loading={isLoading(u.id)}
                            onClick={() => toggleActive(u)}
                            icon={u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          />
                        )}

                        {/* Shadow ban */}
                        <ActionBtn
                          title={u.is_shadow_banned ? 'Shadow ban kaldır' : 'Shadow ban uygula'}
                          color={u.is_shadow_banned ? C.yellow : C.muted}
                          loading={isLoading(u.id, '_shadow')}
                          onClick={() => toggleShadowBan(u)}
                          icon={u.is_shadow_banned ? <Eye size={13} /> : <EyeOff size={13} />}
                        />

                        {/* Force logout */}
                        <ActionBtn
                          title="Tüm oturumları sonlandır"
                          color={C.muted}
                          loading={isLoading(u.id, '_logout')}
                          onClick={() => forceLogout(u)}
                          icon={<LogOut size={13} />}
                        />

                        {/* XP */}
                        <ActionBtn
                          title="XP düzenle"
                          color={C.yellow}
                          loading={false}
                          onClick={() => setXpEditId(u.id)}
                          icon={<Zap size={13} />}
                        />

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: `1px solid ${C.border}` }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? C.muted : C.text, fontSize: '0.72rem', fontFamily: 'Inter, sans-serif', opacity: page === 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={14} /> Önceki
          </button>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: C.muted }}>
            {page} / {Math.ceil(total / PAGE_SIZE) || 1}
          </span>
          <button
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: page * PAGE_SIZE >= total ? 'not-allowed' : 'pointer', color: page * PAGE_SIZE >= total ? C.muted : C.text, fontSize: '0.72rem', fontFamily: 'Inter, sans-serif', opacity: page * PAGE_SIZE >= total ? 0.3 : 1 }}
          >
            Sonraki <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function ActionBtn({ title, color, loading, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-label={title}
      style={{
        padding: 6, borderRadius: 4, background: 'transparent', border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer', color: loading ? '#444' : color,
        display: 'flex', alignItems: 'center', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {loading
        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        : icon
      }
    </button>
  );
}
