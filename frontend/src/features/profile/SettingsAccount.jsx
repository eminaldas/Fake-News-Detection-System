import React, { useState, useEffect, useRef } from 'react';
import {
  Check, X, Globe, Twitter, Instagram, Github, Linkedin,
  AlertTriangle, Loader2, Camera, Plus, Trash2, Link2, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import SettingsPanelShell from './SettingsPanelShell';

/* ── Tasarım sabitleri ── */
const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const PAL_BG   = ['rgba(16,185,129,0.18)','rgba(59,130,246,0.18)','rgba(245,158,11,0.18)','rgba(239,68,68,0.18)','rgba(168,85,247,0.18)'];
const PAL_TEXT = ['var(--color-brand-primary)','var(--color-accent-blue)','var(--color-accent-amber)','#ef4444','#a855f7'];

const CATEGORIES = ['gündem', 'ekonomi', 'spor', 'sağlık', 'teknoloji', 'kültür', 'yaşam'];

/* Sosyal platform tanımları */
const PLATFORMS = [
  { key: 'twitter',   label: 'X (Twitter)', Icon: Twitter,   placeholder: 'https://x.com/kullanici'           },
  { key: 'instagram', label: 'Instagram',   Icon: Instagram, placeholder: 'https://instagram.com/kullanici'   },
  { key: 'github',    label: 'GitHub',      Icon: Github,    placeholder: 'https://github.com/kullanici'      },
  { key: 'linkedin',  label: 'LinkedIn',    Icon: Linkedin,  placeholder: 'https://linkedin.com/in/kullanici' },
  { key: 'website',   label: 'Website',     Icon: Globe,     placeholder: 'https://siteniz.com'               },
];

/* Analiz sayfası ReportBlock stili */
function Block({ title, children, accent }) {
  return (
    <div className="relative border overflow-hidden" style={S}>
      <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
      <div className="px-5 py-3 border-b flex items-center gap-2" style={BD}>
        <div className="w-1.5 h-1.5 bg-brand shrink-0" />
        <span className="font-mono font-bold text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </span>
        {accent && <span className="ml-auto font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{accent}</span>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

/* Focus'ta içe doğru shadow + yeşil border */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="font-mono text-xs font-bold uppercase tracking-wider"
               style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      )}
      {children}
      {hint && <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  );
}

const inputClass = "w-full bg-transparent border font-mono text-sm px-3 py-2.5 outline-none transition-all";
const inputStyle = { borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' };
const inputFocusStyle = { borderColor: 'var(--color-brand-primary)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.20)' };

function StyledInput({ value, onChange, placeholder, type = 'text', disabled, rightEl, onFocus, onBlur }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative flex items-center border transition-all"
         style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}) }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent font-mono text-sm px-3 py-2.5 outline-none"
        style={{ color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
        onFocus={() => { setFocused(true); onFocus?.(); }}
        onBlur={() => { setFocused(false); onBlur?.(); }}
      />
      {rightEl && <div className="px-2 shrink-0">{rightEl}</div>}
    </div>
  );
}

function StyledTextarea({ value, onChange, placeholder, rows = 3, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className="w-full bg-transparent border font-mono text-sm px-3 py-2.5 outline-none transition-all resize-none"
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

/* Ayrılma uyarı modalı */
function LeaveModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.82)' }}>
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative border w-[360px] overflow-hidden"
        style={S}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand" />

        <div className="px-5 py-3 border-b flex items-center gap-2" style={BD}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent-amber)' }} />
          <span className="font-mono font-bold text-xs uppercase tracking-widest"
                style={{ color: 'var(--color-text-primary)' }}>
            // KAYDEDILMEMIŞ DEĞİŞİKLİKLER
          </span>
        </div>
        <div className="p-5 space-y-4">
          <p className="font-manrope font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
            Değişiklikler kaydedilmeyecek.
          </p>
          <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Bu sayfadan ayrılırsanız yaptığınız değişiklikler kaybolur. Devam etmek istiyor musunuz?
          </p>
          <div className="flex gap-3 pt-1">
            <button onClick={onConfirm}
                    className="flex-1 py-2.5 font-mono text-sm font-bold border transition-all"
                    style={{ borderColor: 'var(--color-fake-fill)', color: 'var(--color-fake-fill)' }}>
              Evet, Çık
            </button>
            <button onClick={onCancel}
                    className="flex-1 py-2.5 font-mono text-sm font-bold border-2 transition-all"
                    style={{ background: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: '#070f12' }}>
              Geri Dön
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* Social link satırı */
function SocialLinkRow({ item, onUrlChange, onRemove, platforms }) {
  const platform = platforms.find(p => p.key === item.platform);
  const { focused, setFocused } = { focused: false, setFocused: () => {} };
  const [f, setF] = useState(false);
  const Icon = platform?.Icon ?? Link2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 border px-3 py-2.5 transition-all"
      style={{ borderColor: f ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)', boxShadow: f ? 'inset 0 2px 6px rgba(0,0,0,0.18)' : 'none' }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
      <span className="font-mono text-xs font-bold w-24 shrink-0"
            style={{ color: 'var(--color-text-primary)' }}>
        {item.platform === 'other' ? (item.label || 'Diğer') : platform?.label}
      </span>
      <input
        value={item.url}
        onChange={e => onUrlChange(item.id, e.target.value)}
        placeholder={platform?.placeholder ?? 'https://'}
        className="flex-1 bg-transparent font-mono text-sm outline-none"
        style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-brand-primary)' }}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
      />
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
           className="shrink-0 opacity-40 hover:opacity-70 transition-opacity">
          <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
        </a>
      )}
      <button onClick={() => onRemove(item.id)}
              className="shrink-0 opacity-40 hover:opacity-80 transition-opacity">
        <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--color-fake-fill)' }} />
      </button>
    </motion.div>
  );
}

/* sosyal_links obj → dizi dönüştürme */
function objToLinks(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([key, url]) => ({
    id: key,
    platform: PLATFORMS.find(p => p.key === key) ? key : 'other',
    label: key.startsWith('other') ? key : undefined,
    url: url || '',
  }));
}

function linksToObj(links) {
  const obj = {};
  links.forEach(l => { if (l.url) obj[l.id] = l.url; });
  return obj;
}

/* ════════════════════════════════════════════════════════
   Ana bileşen
════════════════════════════════════════════════════════ */
export default function SettingsAccount() {
  const { user: authUser } = useAuth();

  const [username,  setUsername]  = useState('');
  const [bio,       setBio]       = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [links,     setLinks]     = useState([]);
  const [feedPrefs, setFeedPrefs] = useState({ hidden_categories: [] });

  /* Username check */
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameTimer = useRef(null);

  /* Save state */
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState('');

  /* Original snapshot — dirty detection için */
  const [original, setOriginal] = useState(null);

  /* Platform picker */
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos,  setPickerPos]  = useState({ top: 0, left: 0 });
  const pickerBtnRef = useRef(null);

  /* Leave warning */
  const [showLeave, setShowLeave] = useState(false);

  /* Avatar upload */
  const fileRef = useRef(null);

  /* ── Veri yükleme ── */
  useEffect(() => {
    axiosInstance.get('/auth/me').then(r => {
      const d = r.data;
      setUsername(d.username || '');
      setBio(d.bio || '');
      setAvatarUrl(d.avatar_url || '');
      const loaded = objToLinks(d.social_links);
      setLinks(loaded);
      setOriginal({ username: d.username || '', bio: d.bio || '', avatarUrl: d.avatar_url || '', links: JSON.stringify(loaded) });
    }).catch(() => {});

    axiosInstance.get('/users/me/feed-preferences').then(r => setFeedPrefs(r.data)).catch(() => {});
  }, []);

  /* ── Dirty detection ── */
  const isDirty = original && (
    username  !== original.username  ||
    bio       !== original.bio       ||
    avatarUrl !== original.avatarUrl ||
    JSON.stringify(links) !== original.links
  );

  /* ── beforeunload ── */
  useEffect(() => {
    if (!isDirty) return;
    const h = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);

  /* ── Username check ── */
  const handleUsernameChange = (val) => {
    setUsername(val);
    setUsernameStatus(null);
    if (!val || val === original?.username) return;
    clearTimeout(usernameTimer.current);
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get('/users/search', { params: { q: val } });
        const taken = (data?.items || []).some(u => u.username.toLowerCase() === val.toLowerCase());
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch { setUsernameStatus(null); }
    }, 400);
  };

  /* ── Avatar upload ── */
  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Görsel 5MB\'den küçük olmalı'); return; }
    const reader = new FileReader();
    reader.onload = ev => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Category toggle ── */
  const toggleCategory = async (cat) => {
    const hidden = feedPrefs.hidden_categories || [];
    const next = hidden.includes(cat) ? hidden.filter(c => c !== cat) : [...hidden, cat];
    setFeedPrefs(p => ({ ...p, hidden_categories: next }));
    try { await axiosInstance.patch('/users/me/feed-preferences', { hidden_categories: next }); } catch {}
  };

  /* ── Social links ── */
  const addPlatform = (platformKey) => {
    const id = platformKey === 'other' ? `other_${Date.now()}` : platformKey;
    setLinks(prev => [...prev, { id, platform: platformKey, label: platformKey === 'other' ? 'Diğer' : undefined, url: '' }]);
    setShowPicker(false);
  };

  const updateLinkUrl = (id, url) => setLinks(prev => prev.map(l => l.id === id ? { ...l, url } : l));
  const removeLink    = (id)      => setLinks(prev => prev.filter(l => l.id !== id));

  /* Available platforms — eklenmemiş ve tekil olanlar */
  const addedKeys = new Set(links.map(l => l.platform).filter(k => k !== 'other'));
  const availablePlatforms = [...PLATFORMS.filter(p => !addedKeys.has(p.key)), { key: 'other', label: 'Diğer', Icon: Link2, placeholder: 'https://' }];

  /* ── Kaydet ── */
  const handleSave = async () => {
    if (usernameStatus === 'taken') return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = { bio, avatar_url: avatarUrl || null, social_links: linksToObj(links) };
      if (username !== original?.username) payload.username = username;
      await axiosInstance.patch('/auth/me', payload);
      const snap = { username, bio, avatarUrl, links: JSON.stringify(links) };
      setOriginal(snap);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Kayıt başarısız.');
    } finally { setSaving(false); }
  };

  /* ── İptal ── */
  const handleCancel = () => {
    if (!original) return;
    setUsername(original.username);
    setBio(original.bio);
    setAvatarUrl(original.avatarUrl);
    setLinks(JSON.parse(original.links));
    setUsernameStatus(null);
    setSaveError('');
  };

  /* ── Avatar src ── */
  const avatarIdx = (username?.charCodeAt(0) ?? 0) % PAL_BG.length;

  /* ── Render ── */
  return (
    <>
    <SettingsPanelShell>

      <div className="space-y-5">

        {/* ── KULLANICI BİLGİLERİ ── */}
        <Block title="// KULLANICI BİLGİLERİ">

          {/* Avatar + temel alanlar yan yana */}
          <div className="flex gap-5 items-start">

            {/* Avatar */}
            <div className="shrink-0">
              <div className="relative w-20 h-20 group cursor-pointer"
                   onClick={() => fileRef.current?.click()}>
                {/* Kare avatar, köşe çentikler */}
                <div className="w-full h-full overflow-hidden flex items-center justify-center font-black text-2xl relative"
                     style={{ border: '2px solid var(--color-brand-primary)', background: PAL_BG[avatarIdx], color: PAL_TEXT[avatarIdx] }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover"
                           referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : (username?.[0] ?? 'U').toUpperCase()
                  }
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                       style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <Camera className="w-5 h-5 text-white" />
                    <span className="font-mono text-[10px] font-bold text-white text-center leading-tight">Değiştir</span>
                  </div>
                  {/* Avatar köşe çentikler */}
                  <div className="absolute top-0 left-0 w-3 h-[1.5px] bg-brand" />
                  <div className="absolute top-0 left-0 h-3 w-[1.5px] bg-brand" />
                  <div className="absolute bottom-0 right-0 w-3 h-[1.5px] bg-brand" />
                  <div className="absolute bottom-0 right-0 h-3 w-[1.5px] bg-brand" />
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {/* Avatar aksiyon butonları */}
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => fileRef.current?.click()}
                        className="flex-1 py-1 font-mono text-xs font-bold border transition-all text-center"
                        style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.06)' }}>
                  Değiştir
                </button>
                {avatarUrl && (
                  <button onClick={() => setAvatarUrl('')}
                          className="flex-1 py-1 font-mono text-xs font-bold border transition-all text-center"
                          style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}>
                    Kaldır
                  </button>
                )}
              </div>
            </div>

            {/* Kullanıcı adı + email */}
            <div className="flex-1 space-y-3 min-w-0">
              <Field label="Kullanıcı Adı">
                <StyledInput
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder={original?.username || 'kullanici_adi'}
                  rightEl={
                    usernameStatus === 'checking'  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} /> :
                    usernameStatus === 'available' ? <Check className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} /> :
                    usernameStatus === 'taken'     ? <X className="w-4 h-4" style={{ color: 'var(--color-fake-fill)' }} /> : null
                  }
                />
                <AnimatePresence mode="wait">
                  {usernameStatus === 'taken' && (
                    <motion.p key="t" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                              className="font-mono text-xs mt-1" style={{ color: 'var(--color-fake-fill)' }}>
                      Bu kullanıcı adı kullanımda.
                    </motion.p>
                  )}
                  {usernameStatus === 'available' && (
                    <motion.p key="ok" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                              className="font-mono text-xs mt-1" style={{ color: 'var(--color-brand-primary)' }}>
                      ✓ Kullanıcı adı müsait
                    </motion.p>
                  )}
                </AnimatePresence>
              </Field>

              <Field label="E-posta" hint="E-posta değişikliği için Güvenlik sekmesini kullanın.">
                <StyledInput value={authUser?.email || ''} onChange={() => {}} disabled />
              </Field>
            </div>
          </div>

          {/* Biyografi */}
          <Field label="Biyografi" hint={`${bio.length}/500`}>
            <StyledTextarea
              value={bio}
              onChange={setBio}
              placeholder="Kendinizden kısaca bahsedin..."
              rows={3}
              maxLength={500}
            />
          </Field>
        </Block>

        {/* ── İLGİ ALANLARI ── */}
        <Block title="// İLGİ ALANLARI" accent="feed sıralamasını etkiler">
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
                  className="px-3 py-2 font-mono text-sm font-bold border transition-all"
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
          <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Üzerine tıklanan kategoriler feed'den gizlenir.
          </p>
        </Block>

        {/* ── SOSYAL BAĞLANTILAR ── */}
        <Block title="// SOSYAL BAĞLANTILAR">

          {/* Mevcut bağlantılar */}
          <AnimatePresence>
            {links.map(item => (
              <SocialLinkRow
                key={item.id}
                item={item}
                onUrlChange={updateLinkUrl}
                onRemove={removeLink}
                platforms={PLATFORMS}
              />
            ))}
          </AnimatePresence>

          {/* Bağlantı ekle butonu */}
          <div>
            <button
              ref={pickerBtnRef}
              type="button"
              onClick={() => {
                if (!showPicker && pickerBtnRef.current) {
                  const r = pickerBtnRef.current.getBoundingClientRect();
                  setPickerPos({ top: r.bottom + 6, left: r.left });
                }
                setShowPicker(v => !v);
              }}
              className="flex items-center gap-2 px-4 py-2.5 font-mono text-sm font-bold border transition-all"
              style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.05)' }}
            >
              <Plus className="w-4 h-4" />
              Bağlantı Ekle
            </button>
          </div>
        </Block>

        {/* ── TEHLİKELİ BÖLGE ── */}
        <div className="relative border p-5 space-y-3 overflow-hidden"
             style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.03)' }}>
          <div className="absolute top-0 left-0 w-4 h-[2px]" style={{ background: 'var(--color-fake-fill)' }} />
          <div className="absolute top-0 left-0 h-4 w-[2px]" style={{ background: 'var(--color-fake-fill)' }} />
          <p className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2"
             style={{ color: 'var(--color-fake-fill)' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> // TEHLİKELİ BÖLGE
          </p>
          <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Hesabı silmek geri alınamaz. Tüm veriler kalıcı olarak silinir.
          </p>
          <button type="button"
                  className="px-4 py-2 font-mono text-sm font-bold border transition-all"
                  style={{ borderColor: 'var(--color-fake-fill)', color: 'var(--color-fake-fill)' }}>
            Hesabı Sil
          </button>
        </div>

      </div>
    </SettingsPanelShell>

    {/* Platform picker — fixed, overflow-hidden'dan etkilenmez */}
    <AnimatePresence>
      {showPicker && (
        <>
          {/* Dış tıkla kapat */}
          <div className="fixed inset-0 z-[998]" onClick={() => setShowPicker(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[999] border overflow-hidden min-w-[220px] shadow-2xl"
            style={{ ...S, top: pickerPos.top, left: pickerPos.left }}
          >
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand" />
            {availablePlatforms.length === 0 ? (
              <p className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Tüm platformlar eklendi
              </p>
            ) : (
              availablePlatforms.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => addPlatform(key)}
                  className="flex items-center gap-3 w-full px-4 py-3 font-mono text-sm font-bold border-b transition-colors text-left"
                  style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                  {label}
                </button>
              ))
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* ── STICKY KAYDET / İPTAL BARI ── */}
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          className="sticky bottom-0 border-t mt-5 px-5 py-4 flex items-center gap-4 z-20"
          style={{
            background: 'var(--color-terminal-surface)',
            borderColor: 'var(--color-brand-primary)',
            boxShadow: '0 -4px 24px rgba(16,185,129,0.10)',
          }}
        >
          {/* Sol çentik */}
          <div className="absolute top-0 left-0 w-6 h-[2px] bg-brand" />
          <div className="absolute top-0 left-0 h-6 w-[2px] bg-brand" />

          <button
            onClick={handleSave}
            disabled={saving || usernameStatus === 'taken'}
            className="flex items-center gap-2 px-7 py-2.5 font-mono text-sm font-bold border-2 transition-all disabled:opacity-40"
            style={{ background: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: '#070f12' }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor…</> : 'Kaydet'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2.5 font-mono text-sm font-bold border transition-all"
            style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
          >
            İptal Et
          </button>

          <span className="font-mono text-xs ml-1" style={{ color: 'var(--color-accent-amber)' }}>
            ● kaydedilmemiş değişiklikler
          </span>

          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0 }}
                           className="font-mono text-sm ml-auto" style={{ color: 'var(--color-brand-primary)' }}>
                {'>'} kaydedildi ✓
              </motion.span>
            )}
            {saveError && (
              <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                           className="font-mono text-sm ml-auto" style={{ color: 'var(--color-fake-fill)' }}>
                {saveError}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Ayrılma uyarısı */}
    {showLeave && (
      <LeaveModal
        onConfirm={() => { handleCancel(); setShowLeave(false); }}
        onCancel={() => setShowLeave(false)}
      />
    )}
    </>
  );
}
