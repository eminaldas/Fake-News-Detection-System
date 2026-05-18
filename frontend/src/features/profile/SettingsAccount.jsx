import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Globe, Twitter, Linkedin, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../../api/axios';
import SettingsPanelShell from './SettingsPanelShell';

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

function AccountPreviewCard({ username, bio, avatarUrl, tier, stars }) {
  const idx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;
  const tierColor = TIER_COLOR[tier] ?? 'var(--color-text-muted)';
  return (
    <div className="settings-glass border rounded-lg p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest"
         style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>
        // PROFİL ÖNİZLEME
      </p>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-black text-xl shrink-0"
             style={{ border: `2px solid ${tierColor}`, background: PAL_BG[idx], color: PAL_TEXT[idx] }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : (username?.[0] ?? 'U').toUpperCase()
          }
        </div>
        <div className="min-w-0">
          <p className="font-manrope font-black text-base truncate" style={{ color: 'var(--color-text-primary)' }}>
            {username || '—'}
          </p>
          <p className="font-mono text-xs" style={{ color: tierColor }}>
            {'★'.repeat(stars ?? 0)}{'☆'.repeat(Math.max(0, 5 - (stars ?? 0)))} {TIER_LABEL[tier] ?? 'Yeni Üye'}
          </p>
        </div>
      </div>
      {bio && (
        <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)', opacity: 0.75 }}>
          {bio.slice(0, 120)}{bio.length > 120 ? '…' : ''}
        </p>
      )}
      <div className="border-t pt-2 font-mono text-[10px]"
           style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
        Profil sayfanızda bu şekilde görünürsünüz.
      </div>
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

  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const usernameTimer = useRef(null);

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
    e.preventDefault();
    if (usernameStatus === 'taken') return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        bio,
        avatar_url: avatarUrl || null,
        social_links: social,
      };
      if (username && username !== profile?.username) payload.username = username;
      await axiosInstance.patch('/auth/me', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Kayıt başarısız. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const previewData = {
    username:  username  || profile?.username,
    bio:       bio       || profile?.bio,
    avatarUrl: avatarUrl || profile?.avatar_url,
    tier:      profile?.trust_tier,
    stars:     profile?.trust_stars,
  };

  return (
    <SettingsPanelShell contextCard={<AccountPreviewCard {...previewData} />}>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Temel bilgiler */}
        <div className="settings-glass border rounded-lg p-5 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest"
             style={{ color: 'var(--color-brand-primary)' }}>// KULLANICI BİLGİLERİ</p>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold uppercase tracking-wider"
                   style={{ color: 'var(--color-text-muted)' }}>Profil Görseli (URL)</label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-black"
                   style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-brand-primary)', border: '1px solid var(--color-brand-primary)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : (username?.[0] || 'U').toUpperCase()
                }
              </div>
              <input
                type="url"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 bg-transparent border font-mono text-sm px-3 py-2 outline-none transition-colors"
                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                onFocus={e => e.target.style.borderColor = 'var(--color-brand-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-terminal-border-raw)'}
              />
            </div>
          </div>

          {/* Kullanıcı adı */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold uppercase tracking-wider"
                   style={{ color: 'var(--color-text-muted)' }}>Kullanıcı Adı</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                className="w-full bg-transparent border font-mono text-sm px-3 py-2 pr-8 outline-none transition-colors"
                style={{
                  borderColor: usernameStatus === 'taken' ? 'var(--color-fake-fill)' : usernameStatus === 'available' ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                  color: 'var(--color-text-primary)',
                  caretColor: 'var(--color-brand-primary)',
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking'  && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
                {usernameStatus === 'available' && <Check   className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-primary)' }} />}
                {usernameStatus === 'taken'     && <X       className="w-3.5 h-3.5" style={{ color: 'var(--color-fake-fill)' }}    />}
              </div>
            </div>
            {usernameStatus === 'taken'     && <p className="font-mono text-[11px]" style={{ color: 'var(--color-fake-fill)' }}>Bu kullanıcı adı kullanımda.</p>}
            {usernameStatus === 'available' && <p className="font-mono text-[11px]" style={{ color: 'var(--color-brand-primary)' }}>Kullanıcı adı müsait ✓</p>}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold uppercase tracking-wider"
                   style={{ color: 'var(--color-text-muted)' }}>Biyografi</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Kendinizden kısaca bahsedin..."
              className="w-full bg-transparent border font-mono text-sm px-3 py-2 outline-none transition-colors resize-none"
              style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-brand-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-terminal-border-raw)'}
            />
            <p className="font-mono text-[10px] text-right" style={{ color: 'var(--color-text-muted)' }}>{bio.length}/500</p>
          </div>

          {/* E-posta (disabled) */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold uppercase tracking-wider"
                   style={{ color: 'var(--color-text-muted)' }}>E-posta</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full bg-transparent border font-mono text-sm px-3 py-2 outline-none opacity-50 cursor-not-allowed"
              style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
            />
            <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              E-posta değişikliği için Güvenlik sekmesini kullanın.
            </p>
          </div>
        </div>

        {/* İlgi Alanları */}
        <div className="settings-glass border rounded-lg p-5 space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
               style={{ color: 'var(--color-brand-primary)' }}>// İLGİ ALANLARI</p>
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Gizlemek istediğin kategorileri seç — feed'in buna göre şekillenir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const hidden = (feedPrefs.hidden_categories || []).includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="px-3 py-1.5 font-mono text-xs font-bold border transition-all"
                  style={hidden ? {
                    borderColor: 'var(--color-terminal-border-raw)',
                    color:       'var(--color-text-muted)',
                    opacity:     0.5,
                    textDecoration: 'line-through',
                  } : {
                    borderColor: 'var(--color-brand-primary)',
                    color:       'var(--color-brand-primary)',
                    background:  'rgba(16,185,129,0.06)',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sosyal Bağlantılar */}
        <div className="settings-glass border rounded-lg p-5 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest"
             style={{ color: 'var(--color-brand-primary)' }}>// SOSYAL BAĞLANTILAR</p>

          {[
            { key: 'twitter',  Icon: Twitter,  placeholder: 'https://x.com/kullanici'          },
            { key: 'linkedin', Icon: Linkedin, placeholder: 'https://linkedin.com/in/kullanici' },
            { key: 'website',  Icon: Globe,    placeholder: 'https://siteniz.com'               },
          ].map(({ key, Icon, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="url"
                value={social[key] || ''}
                onChange={e => setSocial(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="flex-1 bg-transparent border font-mono text-sm px-3 py-2 outline-none transition-colors"
                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
                onFocus={e => e.target.style.borderColor = 'var(--color-brand-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-terminal-border-raw)'}
              />
              {social[key] && (
                <a href={social[key]} target="_blank" rel="noopener noreferrer"
                   className="shrink-0 opacity-40 hover:opacity-70 transition-opacity">
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Kaydet */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || usernameStatus === 'taken'}
            className="flex items-center gap-2 px-6 py-2.5 font-mono text-sm font-bold border-2 transition-all disabled:opacity-40"
            style={{ background: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: '#070f12' }}
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor…</>
              : 'Değişiklikleri Kaydet'
            }
          </button>

          <AnimatePresence>
            {saved && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-xs"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                {'>'} profil güncellendi ✓
              </motion.p>
            )}
            {saveError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs"
                style={{ color: 'var(--color-fake-fill)' }}
              >
                {saveError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

      </form>

      {/* Tehlikeli Bölge */}
      <div className="border rounded-lg p-5 space-y-3"
           style={{ borderColor: 'rgba(239,68,68,0.30)', background: 'rgba(239,68,68,0.04)' }}>
        <p className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2"
           style={{ color: 'var(--color-fake-fill)' }}>
          <AlertTriangle className="w-3.5 h-3.5" /> // TEHLİKELİ BÖLGE
        </p>
        <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Hesabı silmek geri alınamaz. Tüm verileriniz kalıcı olarak kaldırılır.
        </p>
        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 font-mono text-xs font-bold border transition-all"
            style={{ borderColor: 'var(--color-fake-fill)', color: 'var(--color-fake-fill)' }}
          >
            Hesabı Sil
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs" style={{ color: 'var(--color-fake-fill)' }}>Emin misiniz?</p>
            <button
              type="button"
              className="px-4 py-1.5 font-mono text-xs font-bold transition-all"
              style={{ background: 'var(--color-fake-fill)', color: '#fff', border: '1px solid var(--color-fake-fill)' }}
              onClick={() => setDeleteConfirm(false)}
            >
              Evet, Sil
            </button>
            <button
              type="button"
              className="px-4 py-1.5 font-mono text-xs font-bold border transition-all"
              style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
              onClick={() => setDeleteConfirm(false)}
            >
              İptal
            </button>
          </div>
        )}
      </div>

    </SettingsPanelShell>
  );
}
