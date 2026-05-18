import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Globe, Twitter, Linkedin, AlertTriangle, Loader2, ExternalLink, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlocker } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import SettingsPanelShell from './SettingsPanelShell';

/* ── Tasarım sabitleri (analiz sayfasıyla aynı) ── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const CATEGORIES = ['gündem', 'ekonomi', 'spor', 'sağlık', 'teknoloji', 'kültür', 'yaşam'];

const TIER_COLOR = {
  yeni_uye:    'var(--color-text-muted)',
  dogrulayici: 'var(--color-accent-blue)',
  analist:     'var(--color-accent-amber)',
  dedektif:    'var(--color-brand-primary)',
};
const TIER_LABEL = {
  yeni_uye: 'Yeni Üye', dogrulayici: 'Doğrulayıcı',
  analist: 'Analist',   dedektif: 'Dedektif',
};

const PAL_BG   = ['rgba(16,185,129,0.20)','rgba(59,130,246,0.20)','rgba(245,158,11,0.20)','rgba(239,68,68,0.20)','rgba(168,85,247,0.20)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

/* AnalysisReport ReportBlock ile aynı stil */
function Block({ title, children }) {
  return (
    <div className="relative border" style={S}>
      <span
        className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
        style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
      >
        {title}
      </span>
      <div className="p-5 pt-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

/* Input focus → içe doğru gölge */
function useInputFocus() {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusProps: {
      onFocus: () => setFocused(true),
      onBlur:  () => setFocused(false),
    },
    style: (extra = {}) => ({
      ...extra,
      borderColor:  focused ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
      boxShadow:    focused ? 'inset 0 2px 8px rgba(0,0,0,0.22)' : 'none',
      transition:   'border-color 0.15s, box-shadow 0.15s',
    }),
  };
}

function TerminalInput({ value, onChange, placeholder, type = 'text', icon: Icon, disabled, rightEl, multiline, rows = 3, maxLength }) {
  const { focusProps, style } = useInputFocus();
  const baseClass = 'w-full bg-transparent font-mono text-sm outline-none';
  const containerStyle = style({
    borderColor: 'var(--color-terminal-border-raw)',
    color: 'var(--color-text-primary)',
  });

  return (
    <div className="flex items-start gap-3 border px-4 py-3" style={containerStyle} {...focusProps}>
      {Icon && <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-50" style={{ color: 'var(--color-text-muted)' }} />}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          className={`${baseClass} resize-none`}
          style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${baseClass} flex-1`}
          style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
        />
      )}
      {rightEl}
    </div>
  );
}

/* Profil önizleme kartı */
function AccountPreviewCard({ username, bio, avatarUrl, tier, stars }) {
  const idx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  const tierColor = TIER_COLOR[tier] ?? 'var(--color-text-muted)';
  return (
    <div className="relative border space-y-4" style={S}>
      <span
        className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
        style={{ background: 'var(--color-terminal-surface)', color: 'var(--color-brand-primary)' }}
      >
        // PROFİL ÖNİZLEME
      </span>
      <div className="p-5 pt-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-black text-2xl shrink-0"
            style={{ border: `2px solid ${tierColor}`, background: PAL_BG[idx], color: PAL_TEXT[idx] }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
              : (username?.[0] ?? 'U').toUpperCase()
            }
          </div>
          <div className="min-w-0">
            <p className="font-manrope font-black text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>
              {username || '—'}
            </p>
            <p className="font-mono text-xs mt-0.5" style={{ color: tierColor }}>
              {'★'.repeat(stars ?? 0)}{'☆'.repeat(Math.max(0, 5 - (stars ?? 0)))} {TIER_LABEL[tier] ?? 'Yeni Üye'}
            </p>
          </div>
        </div>
        {bio && (
          <p className="font-mono text-xs mt-3 leading-relaxed" style={{ color: 'var(--color-text-primary)', opacity: 0.75 }}>
            {bio.slice(0, 140)}{bio.length > 140 ? '…' : ''}
          </p>
        )}
        <p className="font-mono text-[10px] mt-3 border-t pt-2" style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
          Profil sayfanızda bu şekilde görünürsünüz.
        </p>
      </div>
    </div>
  );
}

/* Onay modalı */
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.80)' }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative border w-80 p-6 space-y-4"
        style={S}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-accent-amber)' }} />
          <div>
            <p className="font-manrope font-black text-base" style={{ color: 'var(--color-text-primary)' }}>
              Değişiklikleri iptal etmek istiyor musunuz?
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Kaydedilmemiş değişiklikler kaybolacak.
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 font-mono text-xs font-bold border-2 transition-all"
            style={{ borderColor: 'var(--color-fake-fill)', color: 'var(--color-fake-fill)' }}
          >
            Evet, İptal Et
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 font-mono text-xs font-bold border transition-all"
            style={{ background: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: '#070f12' }}
          >
            Geri Dön
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SettingsAccount() {
  const [profile,   setProfile]   = useState(null);
  const [feedPrefs, setFeedPrefs] = useState({ hidden_categories: [] });

  const [username,  setUsername]  = useState('');
  const [bio,       setBio]       = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [social,    setSocial]    = useState({ twitter: '', linkedin: '', website: '' });

  const [usernameStatus, setUsernameStatus] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const usernameTimer = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    axiosInstance.get('/users/me/profile').then(r => {
      const d = r.data;
      setProfile(d);
      setUsername(d.username || '');
      setBio(d.bio || '');
      setAvatarUrl(d.avatar_url || '');
      setSocial(d.social_links || { twitter: '', linkedin: '', website: '' });
    }).catch(() => {});

    axiosInstance.get('/users/me/feed-preferences').then(r => {
      setFeedPrefs(r.data);
    }).catch(() => {});
  }, []);

  /* Kaydedilmemiş değişiklik tespiti */
  const isDirty = profile != null && (
    username  !== (profile.username    || '') ||
    bio       !== (profile.bio         || '') ||
    avatarUrl !== (profile.avatar_url  || '') ||
    JSON.stringify(social) !== JSON.stringify(profile.social_links || { twitter: '', linkedin: '', website: '' })
  );

  /* Sayfa dışına çıkış uyarısı */
  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty])
  );

  const handleUsernameChange = (val) => {
    setUsername(val);
    setUsernameStatus(null);
    if (!val || val === profile?.username) return;
    clearTimeout(usernameTimer.current);
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get('/users/search', { params: { q: val } });
        const taken = (data?.items || []).some(u => u.username.toLowerCase() === val.toLowerCase());
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch {
        setUsernameStatus(null);
      }
    }, 400);
  };

  const toggleCategory = async (cat) => {
    const hidden = feedPrefs.hidden_categories || [];
    const next = hidden.includes(cat) ? hidden.filter(c => c !== cat) : [...hidden, cat];
    setFeedPrefs(p => ({ ...p, hidden_categories: next }));
    try {
      await axiosInstance.patch('/users/me/feed-preferences', { hidden_categories: next });
    } catch { /* sessiz */ }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (usernameStatus === 'taken') return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = { bio, avatar_url: avatarUrl || null, social_links: social };
      if (username && username !== profile?.username) payload.username = username;
      await axiosInstance.patch('/auth/me', payload);
      setProfile(p => ({ ...p, username, bio, avatar_url: avatarUrl, social_links: social }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Kayıt başarısız. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatar_url || '');
    setSocial(profile.social_links || { twitter: '', linkedin: '', website: '' });
    setUsernameStatus(null);
    setSaveError('');
  };

  const avatarIdx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  const tierColor = TIER_COLOR[profile?.trust_tier ?? 'yeni_uye'];

  const previewData = {
    username:  username  || profile?.username,
    bio:       bio       || profile?.bio,
    avatarUrl: avatarUrl || profile?.avatar_url,
    tier:      profile?.trust_tier,
    stars:     profile?.trust_stars,
  };

  return (
    <>
      <SettingsPanelShell contextCard={<AccountPreviewCard {...previewData} />}>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Profil Bilgileri */}
          <Block title="// KULLANICI BİLGİLERİ">

            {/* Avatar */}
            <div className="flex items-start gap-5">
              <div className="shrink-0 space-y-2">
                {/* Avatar — hover overlay */}
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
                  style={{ border: `3px solid ${tierColor}`, background: PAL_BG[avatarIdx], color: PAL_TEXT[avatarIdx] }}
                  onClick={() => avatarInputRef.current?.focus()}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <span className="absolute inset-0 flex items-center justify-center font-black text-3xl">{(username?.[0] ?? 'U').toUpperCase()}</span>
                  }
                  {/* hover overlay */}
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="font-mono text-[10px] font-bold text-white text-center leading-tight">Fotoğraf<br/>Yükle</span>
                  </div>
                </div>
                <p className="font-mono text-[10px] text-center" style={{ color: 'var(--color-text-muted)' }}>URL girin ↓</p>
              </div>

              <div className="flex-1 space-y-3">
                {/* Avatar URL */}
                <div className="space-y-1">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Profil Görseli URL</label>
                  <TerminalInput
                    ref={avatarInputRef}
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                    placeholder="https://example.com/avatar.jpg"
                    type="url"
                  />
                </div>

                {/* Kullanıcı adı */}
                <div className="space-y-1">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Kullanıcı Adı</label>
                  <TerminalInput
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="kullanici_adi"
                    rightEl={
                      <div className="shrink-0 ml-2">
                        {usernameStatus === 'checking'  && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
                        {usernameStatus === 'available' && <Check   className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />}
                        {usernameStatus === 'taken'     && <X       className="w-4 h-4" style={{ color: 'var(--color-fake-fill)' }} />}
                      </div>
                    }
                  />
                  <AnimatePresence mode="wait">
                    {usernameStatus === 'taken' && (
                      <motion.p key="taken" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                                className="font-mono text-xs" style={{ color: 'var(--color-fake-fill)' }}>
                        Bu kullanıcı adı kullanımda.
                      </motion.p>
                    )}
                    {usernameStatus === 'available' && (
                      <motion.p key="ok" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                                className="font-mono text-xs" style={{ color: 'var(--color-brand-primary)' }}>
                        Kullanıcı adı müsait ✓
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Biyografi</label>
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{bio.length}/500</span>
              </div>
              <TerminalInput
                value={bio}
                onChange={setBio}
                placeholder="Kendinizden kısaca bahsedin..."
                multiline
                rows={3}
                maxLength={500}
              />
            </div>

            {/* E-posta (disabled) */}
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>E-posta</label>
              <TerminalInput
                value={profile?.email || ''}
                onChange={() => {}}
                placeholder="—"
                disabled
              />
              <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                E-posta değişikliği için Güvenlik sekmesini kullanın.
              </p>
            </div>
          </Block>

          {/* İlgi Alanları */}
          <Block title="// İLGİ ALANLARI">
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Gizlemek istediğin kategoriler üzerine tıkla — feed'in buna göre şekillenir.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const hidden = (feedPrefs.hidden_categories || []).includes(cat);
                return (
                  <motion.button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-3 py-1.5 font-mono text-xs font-bold border transition-all"
                    style={hidden ? {
                      borderColor: 'var(--color-terminal-border-raw)',
                      color: 'var(--color-text-muted)',
                      opacity: 0.4,
                      textDecoration: 'line-through',
                    } : {
                      borderColor: 'var(--color-brand-primary)',
                      color: 'var(--color-brand-primary)',
                      background: 'rgba(16,185,129,0.07)',
                    }}
                  >
                    {cat}
                  </motion.button>
                );
              })}
            </div>
          </Block>

          {/* Sosyal Bağlantılar */}
          <Block title="// SOSYAL BAĞLANTILAR">
            {[
              { key: 'twitter',  Icon: Twitter,  placeholder: 'https://x.com/kullanici'          },
              { key: 'linkedin', Icon: Linkedin, placeholder: 'https://linkedin.com/in/kullanici' },
              { key: 'website',  Icon: Globe,    placeholder: 'https://siteniz.com'               },
            ].map(({ key, Icon, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                <div className="flex-1">
                  <TerminalInput
                    value={social[key] || ''}
                    onChange={val => setSocial(p => ({ ...p, [key]: val }))}
                    placeholder={placeholder}
                    type="url"
                    rightEl={social[key] ? (
                      <a href={social[key]} target="_blank" rel="noopener noreferrer"
                         className="shrink-0 opacity-40 hover:opacity-70 transition-opacity ml-2">
                        <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      </a>
                    ) : null}
                  />
                </div>
              </div>
            ))}
          </Block>

          {/* Tehlikeli Bölge */}
          <div className="relative border p-5 space-y-3"
               style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.04)' }}>
            <span className="absolute -top-px left-5 px-2 font-mono text-[11px] tracking-widest uppercase"
                  style={{ background: 'rgba(239,68,68,0.04)', color: 'var(--color-fake-fill)' }}>
              <AlertTriangle className="w-3 h-3 inline mr-1" /> // TEHLİKELİ BÖLGE
            </span>
            <p className="font-mono text-xs pt-1" style={{ color: 'var(--color-text-muted)' }}>
              Hesabı silmek geri alınamaz. Tüm verileriniz kalıcı olarak kaldırılır.
            </p>
            {!deleteConfirm ? (
              <button type="button" onClick={() => setDeleteConfirm(true)}
                      className="px-4 py-2 font-mono text-xs font-bold border transition-all"
                      style={{ borderColor: 'var(--color-fake-fill)', color: 'var(--color-fake-fill)' }}>
                Hesabı Sil
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs" style={{ color: 'var(--color-fake-fill)' }}>Emin misiniz?</span>
                <button type="button"
                        className="px-3 py-1.5 font-mono text-xs font-bold"
                        style={{ background: 'var(--color-fake-fill)', color: '#fff', border: '1px solid var(--color-fake-fill)' }}
                        onClick={() => setDeleteConfirm(false)}>
                  Evet, Sil
                </button>
                <button type="button" onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-1.5 font-mono text-xs font-bold border"
                        style={BD}>
                  İptal
                </button>
              </div>
            )}
          </div>

        </form>
      </SettingsPanelShell>

      {/* Sticky alt kaydet/iptal barı — sadece değişiklik varsa */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="sticky bottom-0 border-t mt-5 px-5 py-4 flex items-center gap-4 z-10"
            style={{ background: 'var(--color-terminal-surface)', borderColor: 'var(--color-brand-primary)' }}
          >
            <button
              onClick={handleSave}
              disabled={saving || usernameStatus === 'taken'}
              className="flex items-center gap-2 px-6 py-2.5 font-mono text-sm font-bold border-2 transition-all disabled:opacity-40"
              style={{ background: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: '#070f12' }}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor…</> : 'Değişiklikleri Kaydet'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 font-mono text-sm font-bold border transition-all"
              style={BD}
            >
              İptal Et
            </button>

            <AnimatePresence>
              {saveError && (
                <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                             className="font-mono text-xs" style={{ color: 'var(--color-fake-fill)' }}>
                  {saveError}
                </motion.span>
              )}
              {saved && (
                <motion.span initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0 }}
                             className="font-mono text-xs" style={{ color: 'var(--color-brand-primary)' }}>
                  {'>'} profil güncellendi ✓
                </motion.span>
              )}
            </AnimatePresence>

            <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--color-accent-amber)' }}>
              ● kaydedilmemiş değişiklikler
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sayfa dışı çıkış uyarısı */}
      {blocker.state === 'blocked' && (
        <ConfirmModal
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </>
  );
}
