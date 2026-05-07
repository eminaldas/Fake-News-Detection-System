import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, ArrowLeft, Check, Upload, User,
    Newspaper, TrendingUp, Trophy, Cpu, FlaskConical,
    Heart, Paintbrush, Leaf, BookOpen, Briefcase,
    Globe, Scale, ShieldCheck, Coins,
    Linkedin, Twitter, Instagram, Github, Youtube,
    Facebook, Users, UserCheck, Building2, Search,
    Mic, FileText, Calendar, MoreHorizontal, Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ── Sabitler ─────────────────────────────────────────────────────── */

const INTERESTS = [
    { id: 'gundem',     label: 'Gündem & Politika',       icon: Newspaper,    color: '#3b82f6' },
    { id: 'ekonomi',    label: 'Ekonomi & Finans',        icon: TrendingUp,   color: '#10b981' },
    { id: 'spor',       label: 'Spor',                    icon: Trophy,       color: '#f59e0b' },
    { id: 'teknoloji',  label: 'Teknoloji & Yazılım',     icon: Cpu,          color: '#8b5cf6' },
    { id: 'bilim',      label: 'Bilim & Araştırma',       icon: FlaskConical, color: '#06b6d4' },
    { id: 'saglik',     label: 'Sağlık & Tıp',           icon: Heart,        color: '#ef4444' },
    { id: 'kultur',     label: 'Kültür & Sanat',          icon: Paintbrush,   color: '#f97316' },
    { id: 'cevre',      label: 'Çevre & İklim',          icon: Leaf,         color: '#22c55e' },
    { id: 'egitim',     label: 'Eğitim & Akademi',        icon: BookOpen,     color: '#0ea5e9' },
    { id: 'is',         label: 'İş Dünyası & Girişim',    icon: Briefcase,    color: '#a855f7' },
    { id: 'dunya',      label: 'Dünya Haberleri',          icon: Globe,        color: '#14b8a6' },
    { id: 'hukuk',      label: 'Hukuk & Adalet',          icon: Scale,        color: '#eab308' },
    { id: 'siber',      label: 'Siber Güvenlik',          icon: ShieldCheck,  color: '#10b981' },
    { id: 'fintech',    label: 'Kripto & Fintech',         icon: Coins,        color: '#f97316' },
];

const SOURCES = [
    { id: 'linkedin',   label: 'LinkedIn',            icon: Linkedin      },
    { id: 'twitter',    label: 'Twitter / X',          icon: Twitter       },
    { id: 'instagram',  label: 'Instagram',            icon: Instagram     },
    { id: 'github',     label: 'GitHub',               icon: Github        },
    { id: 'youtube',    label: 'YouTube',              icon: Youtube       },
    { id: 'facebook',   label: 'Facebook',             icon: Facebook      },
    { id: 'arkadas',    label: 'Arkadaş / Çevre',      icon: Users         },
    { id: 'meslektas',  label: 'Meslektaş',            icon: UserCheck     },
    { id: 'sirket',     label: 'Şirket / Kurum',       icon: Building2     },
    { id: 'arama',      label: 'Arama Motoru',          icon: Search        },
    { id: 'podcast',    label: 'Podcast',               icon: Mic           },
    { id: 'haber',      label: 'Haber / Blog / Makale', icon: FileText      },
    { id: 'etkinlik',   label: 'Etkinlik / Konferans',  icon: Calendar      },
    { id: 'diger',      label: 'Diğer',                icon: MoreHorizontal },
];

const STEPS = ['Profil Fotoğrafı', 'İlgi Alanları', 'Sizi Tanıyalım'];
const MIN_INTERESTS = 3;

/* ── Tasarım sabitleri ────────────────────────────────────────────── */
const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };

function ProgressBar({ step }) {
    return (
        <div className="flex items-center gap-0 mb-10">
            {STEPS.map((label, i) => (
                <React.Fragment key={i}>
                    <div className="flex flex-col items-center gap-2">
                        <div
                            className="w-10 h-10 flex items-center justify-center font-bold text-sm transition-all duration-300"
                            style={{
                                border: `2px solid ${i < step ? 'var(--color-brand-primary)' : i === step ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)'}`,
                                background: i < step ? 'var(--color-brand-primary)' : i === step ? 'rgba(16,185,129,0.12)' : 'transparent',
                                color: i < step ? '#070f12' : i === step ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                                opacity: i > step ? 0.4 : 1,
                            }}
                        >
                            {i < step ? <Check className="w-5 h-5" /> : i + 1}
                        </div>
                        <span
                            className="text-xs font-semibold whitespace-nowrap hidden sm:block"
                            style={{
                                color: i === step ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                                opacity: i > step ? 0.4 : 0.8,
                            }}
                        >
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div
                            className="flex-1 h-[2px] mx-2 mb-5 transition-all duration-500"
                            style={{ background: i < step ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)', opacity: i >= step ? 0.3 : 1 }}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

/* ── Step 1: Avatar ───────────────────────────────────────────────── */
function StepAvatar({ user, avatar, setAvatar, onNext }) {
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setAvatar(ev.target.result);
        reader.readAsDataURL(file);
    };

    const display = avatar || user?.avatar_url;
    const initials = (user?.username ?? 'U')[0].toUpperCase();

    return (
        <div className="flex flex-col items-center gap-8 animate-fade-up">
            <div>
                <h2 className="text-3xl font-manrope font-extrabold text-center mb-2"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Profil Fotoğrafınız
                </h2>
                <p className="text-base text-center" style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                    İstediğiniz zaman değiştirebilirsiniz.
                </p>
            </div>

            {/* Avatar önizleme */}
            <div className="relative group">
                <div
                    className="w-32 h-32 flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200"
                    style={{
                        border: '3px solid var(--color-brand-primary)',
                        background: display ? 'transparent' : 'rgba(16,185,129,0.08)',
                    }}
                    onClick={() => fileRef.current?.click()}
                >
                    {display ? (
                        <img src={display} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-5xl font-black" style={{ color: 'var(--color-brand-primary)' }}>
                            {initials}
                        </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                         style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <Upload className="w-8 h-8 text-white" />
                    </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 hover:opacity-80"
                    style={{ border: '1px solid var(--color-brand-primary)', color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.05)' }}
                >
                    <Upload className="w-4 h-4" /> Fotoğraf Yükle
                </button>

                {user?.avatar_url && !avatar && (
                    <p className="text-xs" style={{ color: 'var(--color-brand-primary)', opacity: 0.8 }}>
                        ✓ Google profilinizden alındı
                    </p>
                )}
            </div>

            <div className="flex gap-4 w-full max-w-xs">
                <button
                    onClick={() => onNext(null)}
                    className="flex-1 py-3 text-sm font-semibold transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', opacity: 0.6 }}
                >
                    Atla
                </button>
                <button
                    onClick={() => onNext(display || null)}
                    className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-brand-primary)', color: '#070f12', boxShadow: '0 6px 20px rgba(16,185,129,0.25)' }}
                >
                    Devam Et <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

/* ── Step 2: İlgi Alanları ────────────────────────────────────────── */
function StepInterests({ selected, setSelected, onBack, onNext }) {
    const toggle = (id) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const enough = selected.length >= MIN_INTERESTS;

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            <div>
                <h2 className="text-3xl font-manrope font-extrabold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}>
                    İlgi Alanlarınız
                </h2>
                <p className="text-base" style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                    Hangi konuları takip etmek istersiniz?{' '}
                    <span style={{ color: enough ? 'var(--color-brand-primary)' : '#f59e0b', fontWeight: 700 }}>
                        {selected.length}/{INTERESTS.length} seçildi
                    </span>
                    {!enough && (
                        <span style={{ color: '#f59e0b' }}> · en az {MIN_INTERESTS} seç</span>
                    )}
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INTERESTS.map(({ id, label, icon: Icon, color }) => {
                    const active = selected.includes(id);
                    return (
                        <button
                            key={id}
                            onClick={() => toggle(id)}
                            className="flex items-center gap-3 p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                border: `1px solid ${active ? color : 'var(--color-terminal-border-raw)'}`,
                                background: active ? `${color}18` : 'transparent',
                            }}
                        >
                            <Icon
                                className="w-5 h-5 shrink-0"
                                style={{ color: active ? color : 'var(--color-text-primary)', opacity: active ? 1 : 0.5 }}
                            />
                            <span
                                className="text-sm font-semibold leading-tight"
                                style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-primary)', opacity: active ? 1 : 0.65 }}
                            >
                                {label}
                            </span>
                            {active && (
                                <div className="ml-auto shrink-0 w-5 h-5 flex items-center justify-center"
                                     style={{ background: color, borderRadius: 0 }}>
                                    <Check className="w-3 h-3 text-black" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-4">
                <button onClick={onBack}
                    className="px-6 py-3 flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', opacity: 0.6 }}>
                    <ArrowLeft className="w-4 h-4" /> Geri
                </button>
                <button
                    onClick={onNext}
                    disabled={!enough}
                    className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-brand-primary)', color: '#070f12', boxShadow: enough ? '0 6px 20px rgba(16,185,129,0.25)' : 'none' }}>
                    Devam Et <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

/* ── Step 3: Kaynak ───────────────────────────────────────────────── */
function StepSource({ selected, setSelected, onBack, onFinish, loading }) {
    const toggle = (id) =>
        setSelected(prev => prev === id ? '' : id);

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            <div>
                <h2 className="text-3xl font-manrope font-extrabold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}>
                    Sizi Nasıl Buldunuz?
                </h2>
                <p className="text-base" style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                    Bizi nereden öğrendiniz? (isteğe bağlı)
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SOURCES.map(({ id, label, icon: Icon }) => {
                    const active = selected === id;
                    return (
                        <button
                            key={id}
                            onClick={() => toggle(id)}
                            className="flex flex-col items-center gap-2.5 p-4 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                            style={{
                                border: `1px solid ${active ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)'}`,
                                background: active ? 'rgba(16,185,129,0.10)' : 'transparent',
                            }}
                        >
                            <Icon
                                className="w-6 h-6"
                                style={{ color: active ? 'var(--color-brand-primary)' : 'var(--color-text-primary)', opacity: active ? 1 : 0.6 }}
                            />
                            <span
                                className="text-xs font-semibold text-center leading-tight"
                                style={{ color: 'var(--color-text-primary)', opacity: active ? 1 : 0.65 }}
                            >
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-4">
                <button onClick={onBack}
                    className="px-6 py-3 flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', opacity: 0.6 }}>
                    <ArrowLeft className="w-4 h-4" /> Geri
                </button>
                <button
                    onClick={onFinish}
                    disabled={loading}
                    className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--color-brand-primary)', color: '#070f12', boxShadow: '0 6px 20px rgba(16,185,129,0.25)' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Başla</span><ArrowRight className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
    );
}

/* ── Ana bileşen ──────────────────────────────────────────────────── */
export default function Onboarding() {
    const { user, completeOnboarding } = useAuth();
    const navigate                     = useNavigate();

    const [step,      setStep]      = useState(0);
    const [avatar,    setAvatar]    = useState(null);
    const [interests, setInterests] = useState([]);
    const [source,    setSource]    = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');

    const handleAvatarNext = (val) => {
        setAvatar(val);
        setStep(1);
    };

    const handleFinish = async () => {
        setLoading(true);
        setError('');
        const result = await completeOnboarding({
            avatar_url:       avatar || undefined,
            interests,
            marketing_source: source || undefined,
        });
        if (result.success) {
            navigate('/', { replace: true });
        } else {
            setError(result.error || 'Bir hata oluştu.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">

            {/* Başlık */}
            <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest mb-1"
                   style={{ color: 'var(--color-brand-primary)' }}>
                    // HOŞ GELDİNİZ
                </p>
                <h1 className="text-4xl font-manrope font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                    {user?.username ? `Merhaba, ${user.username}!` : 'Profilinizi Oluşturun'}
                </h1>
            </div>

            {/* Progress */}
            <ProgressBar step={step} />

            {/* Kart */}
            <div
                className="relative overflow-hidden p-8"
                style={{
                    ...TS,
                    border: '1px solid var(--color-terminal-border-raw)',
                    borderTop: '3px solid var(--color-brand-primary)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
                }}
            >
                {/* Köşe aksanları */}
                <div className="absolute bottom-0 right-0 w-5 h-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.4 }} />
                <div className="absolute bottom-0 right-0 h-5 w-[2px] pointer-events-none" style={{ background: 'var(--color-brand-primary)', opacity: 0.4 }} />

                {error && (
                    <div className="mb-4 px-4 py-2.5 text-sm flex items-center gap-2"
                         style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                {step === 0 && (
                    <StepAvatar
                        user={user}
                        avatar={avatar}
                        setAvatar={setAvatar}
                        onNext={handleAvatarNext}
                    />
                )}
                {step === 1 && (
                    <StepInterests
                        selected={interests}
                        setSelected={setInterests}
                        onBack={() => setStep(0)}
                        onNext={() => setStep(2)}
                    />
                )}
                {step === 2 && (
                    <StepSource
                        selected={source}
                        setSelected={setSource}
                        onBack={() => setStep(1)}
                        onFinish={handleFinish}
                        loading={loading}
                    />
                )}
            </div>

            {/* Atla linki (sadece son adımda değil) */}
            {step < 2 && (
                <div className="text-center mt-4">
                    <button
                        onClick={() => setStep(s => s + 1)}
                        className="text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-text-primary)', opacity: 0.4 }}
                    >
                        Bu adımı atla →
                    </button>
                </div>
            )}
        </div>
    );
}
