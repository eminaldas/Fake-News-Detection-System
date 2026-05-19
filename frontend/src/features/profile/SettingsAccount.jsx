import React, { useState, useEffect, useRef } from 'react';
import {
  Check, X, Globe, Twitter, Instagram, Github, Linkedin,
  AlertTriangle, Loader2, Camera, Plus, Trash2, Link2, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import SettingsPanelShell from './SettingsPanelShell';

/* ── Renkler ── */
const W     = '#eef2f7';                      /* tam beyaz */
const W60   = 'rgba(238,242,247,0.60)';       /* soluk beyaz — label */
const W30   = 'rgba(238,242,247,0.22)';       /* çok soluk — hint */
const DIV   = 'rgba(65,73,77,0.60)';          /* --color-navbar-border */
const DIV_S = 'rgba(65,73,77,0.30)';          /* input normal alt çizgi */

const PAL_BG   = ['rgba(16,185,129,0.18)','rgba(59,130,246,0.18)','rgba(245,158,11,0.18)','rgba(239,68,68,0.18)','rgba(168,85,247,0.18)'];
const PAL_TEXT = ['#10b981','#3b82f6','#f59e0b','#ef4444','#a855f7'];

const CATEGORIES = ['gündem', 'ekonomi', 'spor', 'sağlık', 'teknoloji', 'kültür', 'yaşam'];

const PLATFORMS = [
  { key: 'twitter',   label: 'X (Twitter)', Icon: Twitter,   placeholder: 'https://x.com/kullanici'           },
  { key: 'instagram', label: 'Instagram',   Icon: Instagram, placeholder: 'https://instagram.com/kullanici'   },
  { key: 'github',    label: 'GitHub',      Icon: Github,    placeholder: 'https://github.com/kullanici'      },
  { key: 'linkedin',  label: 'LinkedIn',    Icon: Linkedin,  placeholder: 'https://linkedin.com/in/kullanici' },
  { key: 'website',   label: 'Website',     Icon: Globe,     placeholder: 'https://siteniz.com'               },
];

/* Kart yok — sadece bölüm başlığı + alt çizgi ayırıcı */
function Section({ title, children, accent, noDivider }) {
  return (
    <div style={{ paddingBottom: '2.5rem' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:'0.5rem',
        paddingBottom:'0.625rem', marginBottom:'1.5rem',
        borderBottom: noDivider ? 'none' : `1px solid ${DIV}`,
      }}>
        <div style={{ width:3, height:14, background:'var(--color-brand-primary)', flexShrink:0 }} />
        <span style={{ fontFamily:'monospace', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: W }}>{title}</span>
        {accent && <span style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:'0.6rem', color: W30 }}>{accent}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>{children}</div>
    </div>
  );
}

/* Underline input — sadece alt border, focus'ta 2px beyaz */
function UnderlineInput({ icon: Icon, label, hint, value, onChange, placeholder, type='text', disabled, rightEl }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <span style={{ display:'block', fontFamily:'monospace', fontSize:'0.6rem', fontWeight:600, letterSpacing:'0.09em', textTransform:'uppercase', color: focused ? W60 : W30, marginBottom:6, transition:'color 0.15s' }}>
          {label}
        </span>
      )}
      <div style={{
        display:'flex', alignItems:'center', gap:'0.625rem',
        borderBottom: focused ? `2px solid ${W}` : `1px solid ${DIV_S}`,
        paddingBottom: focused ? 5 : 6,
        transition:'border-color 0.18s',
      }}>
        {Icon && <Icon style={{ width:15, height:15, flexShrink:0, color: focused ? W60 : W30, transition:'color 0.18s' }} />}
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          style={{
            flex:1, background:'transparent', border:'none', outline:'none',
            fontFamily:'monospace', fontSize:'0.875rem',
            color: disabled ? W30 : W,
            caretColor: W,
            opacity: disabled ? 0.5 : 1,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightEl && <div style={{ flexShrink:0 }}>{rightEl}</div>}
      </div>
      {hint && <span style={{ display:'block', fontFamily:'monospace', fontSize:'0.6rem', color: W30, marginTop:4 }}>{hint}</span>}
    </div>
  );
}

/* Underline textarea */
function UnderlineTextarea({ label, hint, value, onChange, placeholder, rows=3, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <span style={{ display:'block', fontFamily:'monospace', fontSize:'0.6rem', fontWeight:600, letterSpacing:'0.09em', textTransform:'uppercase', color: focused ? W60 : W30, marginBottom:6, transition:'color 0.15s' }}>
          {label}
        </span>
      )}
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} maxLength={maxLength}
        style={{
          width:'100%', background:'transparent', outline:'none', resize:'none',
          fontFamily:'monospace', fontSize:'0.875rem', color: W,
          caretColor: W,
          border:'none',
          borderBottom: focused ? `2px solid ${W}` : `1px solid ${DIV_S}`,
          paddingBottom: focused ? 5 : 6,
          transition:'border-color 0.18s',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <span style={{ display:'flex', justifyContent:'flex-end', fontFamily:'monospace', fontSize:'0.6rem', color: W30, marginTop:4 }}>{hint}</span>}
    </div>
  );
}

/* Ayrılma uyarı modalı */
function LeaveModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.85)' }}>
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ width:360, background:'#070f12', border:`1px solid ${DIV}`, overflow:'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding:'1rem 1.25rem', borderBottom:`1px solid ${DIV}`, display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <AlertTriangle style={{ width:15, height:15, flexShrink:0, color:'var(--color-accent-amber)' }} />
          <span style={{ fontFamily:'monospace', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: W }}>
            Kaydedilmemiş değişiklikler
          </span>
        </div>
        <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
          <p style={{ fontFamily:'var(--font-manrope,sans-serif)', fontWeight:700, fontSize:'0.95rem', color: W }}>
            Değişiklikler kaydedilmeyecek.
          </p>
          <p style={{ fontFamily:'monospace', fontSize:'0.8rem', color: W60 }}>
            Bu sayfadan ayrılırsanız değişiklikler kaybolur.
          </p>
          <div style={{ display:'flex', gap:'0.75rem', paddingTop:'0.25rem' }}>
            <button onClick={onConfirm}
                    style={{ flex:1, padding:'0.625rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, border:`1px solid rgba(239,68,68,0.6)`, color:'#fca5a5', background:'transparent', cursor:'pointer' }}>
              Evet, Çık
            </button>
            <button onClick={onCancel}
                    style={{ flex:1, padding:'0.625rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, background:'var(--color-brand-primary)', border:'none', color:'#070f12', cursor:'pointer' }}>
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
  const [f, setF] = useState(false);
  const Icon = platform?.Icon ?? Link2;

  return (
    <motion.div
      initial={{ opacity:0, y:-8 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-8 }}
      transition={{ duration:0.18 }}
      style={{
        display:'flex', alignItems:'center', gap:'0.75rem',
        borderBottom: f ? `2px solid ${W}` : `1px solid ${DIV_S}`,
        paddingBottom: f ? 5 : 6,
        transition:'border-color 0.18s',
      }}
    >
      <Icon style={{ width:15, height:15, flexShrink:0, color: f ? W60 : W30, transition:'color 0.18s' }} />
      <span style={{ fontFamily:'monospace', fontSize:'0.7rem', fontWeight:600, width:80, flexShrink:0, color:W60, letterSpacing:'0.04em' }}>
        {item.platform === 'other' ? (item.label || 'Diğer') : platform?.label}
      </span>
      <input
        value={item.url}
        onChange={e => onUrlChange(item.id, e.target.value)}
        placeholder={platform?.placeholder ?? 'https://'}
        style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'monospace', fontSize:'0.875rem', color: W, caretColor: W }}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
      />
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink:0, opacity:0.3 }}
           onMouseEnter={e => e.currentTarget.style.opacity='0.7'} onMouseLeave={e => e.currentTarget.style.opacity='0.3'}>
          <ExternalLink style={{ width:13, height:13, color:W }} />
        </a>
      )}
      <button onClick={() => onRemove(item.id)} style={{ flexShrink:0, opacity:0.3, background:'none', border:'none', cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.7'} onMouseLeave={e => e.currentTarget.style.opacity='0.3'}>
        <Trash2 style={{ width:13, height:13, color:'#fca5a5' }} />
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
      <div>

        {/* ── KULLANICI BİLGİLERİ ── */}
        <Section title="Kullanıcı Bilgileri">

          {/* Avatar + form yan yana */}
          <div style={{ display:'flex', gap:'2rem', alignItems:'flex-start' }}>

            {/* Avatar */}
            <div style={{ flexShrink:0 }}>
              <div className="group" style={{ position:'relative', width:72, height:72, cursor:'pointer' }}
                   onClick={() => fileRef.current?.click()}>
                <div style={{ width:'100%', height:'100%', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:24, border:`2px solid ${PAL_TEXT[avatarIdx]}40`, background:PAL_BG[avatarIdx], color:PAL_TEXT[avatarIdx], position:'relative' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={username} style={{ width:'100%', height:'100%', objectFit:'cover' }} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display='none'; }} />
                    : (username?.[0] ?? 'U').toUpperCase()
                  }
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                    <Camera style={{ width:16, height:16, color:'#fff' }} />
                    <span style={{ fontFamily:'monospace', fontSize:'0.55rem', fontWeight:700, color:'#fff' }}>Değiştir</span>
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
              <div style={{ display:'flex', gap:4, marginTop:6 }}>
                <button onClick={() => fileRef.current?.click()}
                        style={{ flex:1, padding:'3px 0', fontFamily:'monospace', fontSize:'0.65rem', fontWeight:700, border:`1px solid ${DIV_S}`, color:W60, background:'transparent', cursor:'pointer' }}>
                  Değiştir
                </button>
                {avatarUrl && (
                  <button onClick={() => setAvatarUrl('')}
                          style={{ flex:1, padding:'3px 0', fontFamily:'monospace', fontSize:'0.65rem', fontWeight:700, border:`1px solid ${DIV_S}`, color:W30, background:'transparent', cursor:'pointer' }}>
                    Kaldır
                  </button>
                )}
              </div>
            </div>

            {/* Alanlar */}
            <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'1.25rem' }}>
              <UnderlineInput
                label="Kullanıcı Adı"
                value={username}
                onChange={handleUsernameChange}
                placeholder="kullanici_adi"
                rightEl={
                  usernameStatus === 'checking'  ? <Loader2 style={{ width:14, height:14, color:W30, animation:'spin 1s linear infinite' }} /> :
                  usernameStatus === 'available' ? <Check style={{ width:14, height:14, color:'var(--color-brand-primary)' }} /> :
                  usernameStatus === 'taken'     ? <X style={{ width:14, height:14, color:'#fca5a5' }} /> : null
                }
              />
              <AnimatePresence mode="wait">
                {usernameStatus === 'taken' && (
                  <motion.span key="t" initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                               style={{ fontFamily:'monospace', fontSize:'0.7rem', color:'#fca5a5' }}>
                    Bu kullanıcı adı kullanımda.
                  </motion.span>
                )}
              </AnimatePresence>

              <UnderlineInput
                label="E-posta"
                hint="Değiştirmek için Güvenlik sekmesini kullanın."
                value={authUser?.email || ''}
                onChange={() => {}}
                disabled
              />
            </div>
          </div>

          {/* Biyografi */}
          <UnderlineTextarea
            label="Biyografi"
            hint={`${bio.length}/500`}
            value={bio}
            onChange={setBio}
            placeholder="Kendinizden kısaca bahsedin..."
            rows={3}
            maxLength={500}
          />
        </Section>

        {/* ── İLGİ ALANLARI ── */}
        <Section title="İlgi Alanları" accent="feed sıralamasını etkiler">
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
            {CATEGORIES.map(cat => {
              const hidden = (feedPrefs.hidden_categories || []).includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  style={hidden ? {
                    padding:'0.4rem 0.875rem',
                    fontFamily:'monospace', fontSize:'0.8rem', fontWeight:600,
                    border:`1px solid ${DIV_S}`,
                    color: W30, background:'transparent', cursor:'pointer',
                    textDecoration:'line-through',
                  } : {
                    padding:'0.4rem 0.875rem',
                    fontFamily:'monospace', fontSize:'0.8rem', fontWeight:600,
                    border:`1px solid ${W60}`,
                    color: W, background:'rgba(238,242,247,0.05)', cursor:'pointer',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <span style={{ fontFamily:'monospace', fontSize:'0.7rem', color:W30 }}>
            Üzerine tıklanan kategoriler feed'den gizlenir.
          </span>
        </Section>

        {/* ── SOSYAL BAĞLANTILAR ── */}
        <Section title="Sosyal Bağlantılar">
          <AnimatePresence>
            {links.map(item => (
              <SocialLinkRow key={item.id} item={item} onUrlChange={updateLinkUrl} onRemove={removeLink} platforms={PLATFORMS} />
            ))}
          </AnimatePresence>

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
            style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, border:`1px solid ${DIV_S}`, color: W60, background:'transparent', cursor:'pointer' }}
          >
            <Plus style={{ width:14, height:14 }} />
            Bağlantı Ekle
          </button>
        </Section>

        {/* ── TEHLİKELİ BÖLGE ── */}
        <Section title="Tehlikeli Bölge" noDivider>
          <div style={{ borderTop:`1px solid rgba(239,68,68,0.25)`, paddingTop:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <p style={{ fontFamily:'monospace', fontSize:'0.8rem', color:W60 }}>
              Hesabı silmek geri alınamaz. Tüm veriler kalıcı olarak silinir.
            </p>
            <button type="button"
                    style={{ alignSelf:'flex-start', padding:'0.5rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, border:'1px solid rgba(239,68,68,0.5)', color:'#fca5a5', background:'transparent', cursor:'pointer' }}>
              Hesabı Sil
            </button>
          </div>
        </Section>

      </div>
    </SettingsPanelShell>

    {/* Platform picker */}
    <AnimatePresence>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setShowPicker(false)} />
          <motion.div
            initial={{ opacity:0, y:-6, scale:0.97 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-6, scale:0.97 }}
            transition={{ duration:0.15 }}
            style={{ position:'fixed', zIndex:999, background:'#070f12', border:`1px solid ${DIV}`, minWidth:200, top:pickerPos.top, left:pickerPos.left, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}
          >
            {availablePlatforms.length === 0 ? (
              <p style={{ padding:'0.75rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', color:W30 }}>Tüm platformlar eklendi</p>
            ) : (
              availablePlatforms.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => addPlatform(key)}
                  style={{ display:'flex', alignItems:'center', gap:'0.75rem', width:'100%', padding:'0.75rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:600, borderBottom:`1px solid ${DIV_S}`, color:W, background:'transparent', cursor:'pointer', textAlign:'left' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <Icon style={{ width:15, height:15, flexShrink:0, color:W60 }} />
                  {label}
                </button>
              ))
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Sticky save bar */}
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ y:24, opacity:0 }}
          animate={{ y:0, opacity:1 }}
          exit={{ y:24, opacity:0 }}
          transition={{ type:'spring', damping:22, stiffness:220 }}
          style={{
            position:'sticky', bottom:0, marginTop:'1.5rem',
            padding:'0.875rem 1.5rem',
            display:'flex', alignItems:'center', gap:'1rem',
            background:'#070f12',
            borderTop:`1px solid ${DIV}`,
            zIndex:20,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving || usernameStatus === 'taken'}
            style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 1.5rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, background:'var(--color-brand-primary)', border:'none', color:'#070f12', cursor:'pointer', opacity: (saving || usernameStatus==='taken') ? 0.4 : 1 }}
          >
            {saving ? <><Loader2 style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Kaydediliyor…</> : 'Kaydet'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            style={{ padding:'0.5rem 1.25rem', fontFamily:'monospace', fontSize:'0.8rem', fontWeight:600, border:`1px solid ${DIV}`, color:W60, background:'transparent', cursor:'pointer' }}
          >
            İptal
          </button>

          <span style={{ fontFamily:'monospace', fontSize:'0.7rem', color:'rgba(245,158,11,0.8)', marginLeft:4 }}>
            ● kaydedilmemiş
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
