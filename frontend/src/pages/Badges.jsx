import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Award, Trophy, BarChart2, Star, Shield, Search, Cpu, Zap,
    MessageSquare, TrendingUp, Users, Calendar, Lock, Crown, Pin, PinOff, Check,
} from 'lucide-react';
import GamificationService from '../services/gamification.service';
import { useAuth } from '../contexts/AuthContext';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

const ICON_MAP = {
    User: Award, Search, FileSearch: Search, BarChart2, Shield,
    Star, Cpu, TrendingUp, MessageSquare, Zap, Link: Zap,
    Award, Users, Calendar, CalendarCheck: Calendar,
    ShieldCheck: Shield, ThumbsUp: Award, UserCheck: Users,
    Newspaper: Award, BookOpen: Award, Trophy, DollarSign: TrendingUp,
    Globe: Award, Globe2: Award, Microscope: Award, Music: Award,
    Bird: Zap, Crown,
};

function getIcon(iconName) {
    return ICON_MAP[iconName] || Award;
}

const LEVEL_BADGE_KEYS = ['level_1', 'level_10', 'level_20', 'level_30', 'level_40', 'level_50'];

function BadgeCard({ badge, earned, showcased, onToggleShowcase, showcaseFull }) {
    const Icon = getIcon(badge.icon);
    const progress  = !earned ? (badge.progress  ?? 0) : null;
    const threshold = !earned ? (badge.threshold ?? 1) : null;
    const pct = threshold ? Math.min((progress / threshold) * 100, 100) : 0;

    return (
        <div className="relative border overflow-hidden transition-all"
             style={{
                 background:   'var(--color-terminal-surface)',
                 borderColor:  showcased ? badge.color : earned ? badge.color + '80' : 'var(--color-terminal-border-raw)',
                 borderWidth:  showcased ? '2px' : earned ? '1.5px' : '1px',
                 opacity:      earned ? 1 : 0.75,
             }}>
            {earned && <Corner />}

            {/* Üst renk şerit */}
            {earned && (
                <div className="h-1 w-full" style={{ background: badge.color, opacity: showcased ? 1 : 0.5 }} />
            )}

            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* İkon */}
                    <div className="shrink-0 w-14 h-14 flex items-center justify-center border-2"
                         style={{
                             borderColor:  earned ? badge.color : 'var(--color-terminal-border-raw)',
                             background:   earned ? `${badge.color}18` : 'rgba(255,255,255,0.03)',
                             color:        earned ? badge.color : 'var(--color-text-muted)',
                         }}>
                        <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-mono text-base font-black tracking-wide"
                               style={{ color: earned ? badge.color : 'var(--color-text-primary)' }}>
                                {badge.name}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {earned && (
                                    <span className="font-mono text-[9px] font-bold px-2 py-0.5"
                                          style={{ background: `${badge.color}25`, color: badge.color, border: `1px solid ${badge.color}50` }}>
                                        ✓ KAZANILDI
                                    </span>
                                )}
                                {!earned && (
                                    <Lock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                                )}
                            </div>
                        </div>
                        <p className="font-mono text-xs"
                           style={{ color: 'var(--color-text-primary)', opacity: earned ? 0.8 : 0.55 }}>
                            {badge.description}
                        </p>
                    </div>
                </div>

                {/* İlerleme çubuğu */}
                {!earned && threshold != null && (
                    <div className="mt-4">
                        <div className="flex justify-between mb-1.5">
                            <span className="font-mono text-[10px]"
                                  style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                                İlerleme
                            </span>
                            <span className="font-mono text-[10px] font-bold"
                                  style={{ color: 'var(--color-brand-primary)' }}>
                                {progress} / {threshold}
                            </span>
                        </div>
                        <div className="w-full h-2 overflow-hidden"
                             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-terminal-border-raw)' }}>
                            <div className="h-full transition-all duration-500"
                                 style={{
                                     width: `${pct}%`,
                                     background: pct > 0 ? 'var(--color-brand-primary)' : 'transparent',
                                 }} />
                        </div>
                    </div>
                )}

                {/* Vitrine ekle / çıkar butonu */}
                {earned && onToggleShowcase && (
                    <button
                        onClick={() => onToggleShowcase(badge.key)}
                        disabled={!showcased && showcaseFull}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-1.5 font-mono text-xs font-bold border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        style={showcased ? {
                            borderColor: badge.color,
                            color: badge.color,
                            background: `${badge.color}12`,
                        } : {
                            borderColor: 'var(--color-terminal-border-raw)',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        {showcased ? (
                            <><PinOff className="w-3 h-3" /> Vitrinden Çıkar</>
                        ) : (
                            <><Pin className="w-3 h-3" /> Vitrine Ekle {showcaseFull ? '(dolu)' : ''}</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

const RANK_STYLES = [
    { bg: 'rgba(255,215,0,0.12)', border: '#FFD700', text: '#FFD700', label: '#1' },
    { bg: 'rgba(192,192,192,0.12)', border: '#C0C0C0', text: '#C0C0C0', label: '#2' },
    { bg: 'rgba(205,127,50,0.12)', border: '#CD7F32', text: '#CD7F32', label: '#3' },
];

function LeaderboardTab() {
    const [period,  setPeriod]  = useState('alltime');
    const [type,    setType]    = useState('xp');
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        setLoading(true);
        GamificationService.getLeaderboard(period, type)
            .then(setData).catch(() => {}).finally(() => setLoading(false));
    }, [period, type]);

    const TYPE_LABELS   = { xp: 'XP', analyses: 'Analiz', threads: 'Başlık', evidence: 'Kanıt' };
    const PERIOD_LABELS = { alltime: 'Tüm Zaman', monthly: 'Bu Ay', weekly: 'Bu Hafta' };

    return (
        <div>
            {/* Filtreler */}
            <div className="relative border mb-5 p-4" style={TS}>
                <Corner />
                <div className="flex flex-wrap gap-4">
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-2"
                           style={{ color: 'var(--color-brand-primary)' }}>Dönem</p>
                        <div className="flex gap-1.5">
                            {Object.entries(PERIOD_LABELS).map(([v, l]) => (
                                <button key={v} onClick={() => setPeriod(v)}
                                        className="font-mono text-xs px-3 py-1.5 border transition-all"
                                        style={{
                                            borderColor: period === v ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                            color:       period === v ? '#070f12' : 'var(--color-text-primary)',
                                            background:  period === v ? 'var(--color-brand-primary)' : 'transparent',
                                            fontWeight:  period === v ? 700 : 400,
                                        }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-2"
                           style={{ color: 'var(--color-accent-blue)' }}>Kategori</p>
                        <div className="flex gap-1.5">
                            {Object.entries(TYPE_LABELS).map(([v, l]) => (
                                <button key={v} onClick={() => setType(v)}
                                        className="font-mono text-xs px-3 py-1.5 border transition-all"
                                        style={{
                                            borderColor: type === v ? 'var(--color-accent-blue)' : 'var(--color-terminal-border-raw)',
                                            color:       type === v ? '#070f12' : 'var(--color-text-primary)',
                                            background:  type === v ? 'var(--color-accent-blue)' : 'transparent',
                                            fontWeight:  type === v ? 700 : 400,
                                        }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="relative border p-8 text-center" style={TS}>
                    <p className="font-mono text-sm" style={{ color: 'var(--color-brand-primary)' }}>
                    </p>
                </div>
            )}

            {!loading && data && data.entries.length === 0 && (
                <div className="relative border p-8 text-center" style={TS}>
                    <Corner />
                    <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        Henüz veri yok
                    </p>
                </div>
            )}

            {!loading && data && data.entries.length > 0 && (
                <div className="flex flex-col gap-2">
                    {data.entries.map(entry => {
                        const isMe    = user && entry.user_id === user.id;
                        const rankSty = entry.rank <= 3 ? RANK_STYLES[entry.rank - 1] : null;

                        return (
                            <Link key={entry.user_id} to={`/users/${entry.user_id}`}
                                  className="relative border overflow-hidden flex items-center gap-4 px-5 py-4 transition-all hover:brightness-110"
                                  style={{
                                      background:  rankSty ? rankSty.bg : isMe ? 'rgba(26,158,79,0.08)' : 'var(--color-terminal-surface)',
                                      borderColor: rankSty ? rankSty.border : isMe ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                      borderWidth: (rankSty || isMe) ? '1.5px' : '1px',
                                  }}>

                                {/* Rank */}
                                <div className="shrink-0 w-10 text-center">
                                    {entry.rank <= 3 ? (
                                        <div>
                                            <span className="text-2xl leading-none">
                                                {['🥇', '🥈', '🥉'][entry.rank - 1]}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="font-mono text-sm font-black"
                                              style={{ color: isMe ? 'var(--color-brand-primary)' : 'var(--color-text-primary)', opacity: 0.7 }}>
                                            #{entry.rank}
                                        </span>
                                    )}
                                </div>

                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-base border-2"
                                     style={{
                                         background:  rankSty ? `${rankSty.text}20` : 'rgba(26,158,79,0.15)',
                                         borderColor: rankSty ? rankSty.border : isMe ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)',
                                         color:       rankSty ? rankSty.text : 'var(--color-brand-primary)',
                                     }}>
                                    {entry.username[0]?.toUpperCase()}
                                </div>

                                {/* İsim + Level + Rozetler */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-sm font-black"
                                              style={{ color: rankSty ? rankSty.text : isMe ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                                            {entry.username}
                                        </span>
                                        {isMe && (
                                            <span className="font-mono text-[9px] px-1.5 py-0.5 border"
                                                  style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)' }}>
                                                sen
                                            </span>
                                        )}
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 border"
                                              style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)', opacity: 0.7 }}>
                                            Lv.{entry.level}
                                        </span>
                                    </div>
                                    {entry.showcase_badges.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            {entry.showcase_badges.map(b => (
                                                <span key={b.key}
                                                      className="font-mono text-[9px] px-1.5 py-0.5 border"
                                                      style={{ borderColor: b.color, color: b.color, background: `${b.color}10` }}>
                                                    {b.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Puan */}
                                <div className="shrink-0 text-right">
                                    <p className="font-mono text-xl font-black"
                                       style={{ color: rankSty ? rankSty.text : isMe ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                                        {entry.value.toLocaleString('tr-TR')}
                                    </p>
                                    <p className="font-mono text-[9px] uppercase tracking-wider"
                                       style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                        {TYPE_LABELS[type]}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Badges() {
    const [tab,          setTab]          = useState('levels');
    const [badges,       setBadges]       = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [stats,        setStats]        = useState(null);
    const [showcase,     setShowcase]     = useState([]);   // seçili badge key'leri (max 3)
    const [saving,       setSaving]       = useState(false);
    const [saved,        setSaved]        = useState(false);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        Promise.all([
            GamificationService.getMyBadges(),
            GamificationService.getMyStats(),
        ])
            .then(([b, s]) => {
                setBadges(b);
                setStats(s);
                const initial = (b.earned || [])
                    .filter(x => x.is_showcased)
                    .sort((a, b) => (a.showcase_order ?? 99) - (b.showcase_order ?? 99))
                    .map(x => x.key);
                setShowcase(initial);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    const handleToggleShowcase = useCallback((key) => {
        setShowcase(prev => {
            if (prev.includes(key)) return prev.filter(k => k !== key);
            if (prev.length >= 3)   return prev;
            return [...prev, key];
        });
        setSaved(false);
    }, []);

    const handleSaveShowcase = async () => {
        setSaving(true);
        try {
            await GamificationService.updateShowcase(showcase);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {}
        finally { setSaving(false); }
    };

    const earnedKeys   = new Set((badges?.earned || []).map(b => b.key));
    const showcaseSet  = new Set(showcase);
    const showcaseFull = showcase.length >= 3;
    const allBadges    = [...(badges?.earned || []), ...(badges?.locked || [])];
    const byKey        = Object.fromEntries(allBadges.map(b => [b.key, b]));

    const levelBadges    = LEVEL_BADGE_KEYS.map(k => byKey[k]).filter(Boolean);
    const activityEarned = (badges?.earned  || []).filter(b => !LEVEL_BADGE_KEYS.includes(b.key) && b.category !== 'category');
    const activityLocked = (badges?.locked  || []).filter(b => !LEVEL_BADGE_KEYS.includes(b.key) && b.category !== 'category');
    const catEarned      = (badges?.earned  || []).filter(b => b.category === 'category');
    const catLocked      = (badges?.locked  || []).filter(b => b.category === 'category');

    const TABS = [
        { key: 'levels',       label: '// SEVİYELER', Icon: Award     },
        { key: 'achievements', label: '// BAŞARIMLAR', Icon: Trophy    },
        { key: 'leaderboard',  label: '// SIRALAMA',   Icon: BarChart2 },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">

            {/* Başlık */}
            <div className="relative border mb-6 overflow-hidden" style={TS}>
                <Corner />
                <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="font-mono text-xl font-black tracking-wider"
                            style={{ color: 'var(--color-brand-primary)' }}>
                        </h1>
                        <p className="font-mono text-xs mt-1"
                           style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
                            Aktivitelerini rozetlere dönüştür · sıralamada yerini al
                        </p>
                    </div>
                    {stats && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-mono text-2xl font-black"
                                   style={{ color: 'var(--color-brand-primary)' }}>
                                    {stats.total_xp.toLocaleString('tr-TR')}
                                </p>
                                <p className="font-mono text-[9px] uppercase tracking-widest"
                                   style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                    toplam xp
                                </p>
                            </div>
                            <div className="border-l pl-4" style={BD}>
                                <p className="font-mono text-2xl font-black"
                                   style={{ color: 'var(--color-accent-amber)' }}>
                                    {stats.level}
                                </p>
                                <p className="font-mono text-[9px] uppercase tracking-widest"
                                   style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                    seviye
                                </p>
                            </div>
                            <div className="border-l pl-4" style={BD}>
                                <p className="font-mono text-2xl font-black"
                                   style={{ color: 'var(--color-accent-blue)' }}>
                                    {(badges?.earned || []).length}
                                </p>
                                <p className="font-mono text-[9px] uppercase tracking-widest"
                                   style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                                    rozet
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                {stats && (
                    <div className="px-6 pb-4">
                        <div className="flex justify-between mb-1">
                            <span className="font-mono text-[10px]"
                                  style={{ color: 'var(--color-text-primary)', opacity: 0.6 }}>
                                Seviye {stats.level} → {stats.level + 1}
                            </span>
                            <span className="font-mono text-[10px] font-bold"
                                  style={{ color: 'var(--color-brand-primary)' }}>
                                {stats.xp_to_next_level} XP kaldı
                            </span>
                        </div>
                        <div className="w-full h-2 border overflow-hidden"
                             style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--color-terminal-border-raw)' }}>
                            <div className="h-full transition-all duration-700"
                                 style={{ width: `${stats.xp_progress_pct}%`, background: 'var(--color-brand-primary)' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Vitrin Önizleme + Kaydet */}
            {isAuthenticated && !loading && (
                <div className="relative border mb-5 overflow-hidden" style={TS}>
                    <Corner />
                    <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2"
                               style={{ color: 'var(--color-brand-primary)' }}>
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {Array.from({ length: 3 }).map((_, i) => {
                                    const key = showcase[i];
                                    const b   = key ? byKey[key] : null;
                                    return b ? (
                                        <div key={key}
                                             className="flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-mono font-bold"
                                             style={{ borderColor: b.color, color: b.color, background: `${b.color}12` }}>
                                            {b.name}
                                        </div>
                                    ) : (
                                        <div key={`slot-${i}`}
                                             className="flex items-center px-2.5 py-1 border border-dashed text-[11px] font-mono"
                                             style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', opacity: 0.4 }}>
                                            boş slot
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            onClick={handleSaveShowcase}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 font-mono text-xs font-bold border-2 transition-all disabled:opacity-50"
                            style={saved ? {
                                borderColor: 'var(--color-brand-primary)',
                                background:  'var(--color-brand-primary)',
                                color:       '#070f12',
                            } : {
                                borderColor: 'var(--color-brand-primary)',
                                color:       'var(--color-brand-primary)',
                            }}
                        >
                            {saved ? <><Check className="w-3.5 h-3.5" /> Kaydedildi</> : saving ? 'Kaydediliyor...' : 'Vitrine Kaydet'}
                        </button>
                    </div>
                </div>
            )}

            {/* Sekmeler */}
            <div className="flex border-b mb-6" style={BD}>
                {TABS.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                            className="px-5 py-3 font-mono text-xs border-b-2 transition-all flex items-center gap-2"
                            style={{
                                borderBottomColor: tab === key ? 'var(--color-brand-primary)' : 'transparent',
                                color:    tab === key ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                                opacity:  tab === key ? 1 : 0.6,
                                fontWeight: tab === key ? 700 : 400,
                                marginBottom: '-1px',
                            }}>
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Giriş yapılmamış */}
            {!isAuthenticated && tab !== 'leaderboard' && (
                <div className="relative border p-10 text-center" style={TS}>
                    <Corner />
                    <Award className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--color-text-primary)', opacity: 0.3 }} />
                    <p className="font-mono text-base font-bold mb-2"
                       style={{ color: 'var(--color-text-primary)' }}>
                        Rozetlerini görmek için giriş yap
                    </p>
                    <p className="font-mono text-xs mb-5"
                       style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>
                        Aktivitelerine göre rozetler kazan ve sıralamaya gir
                    </p>
                    <Link to="/login"
                          className="inline-block font-mono text-sm font-bold px-6 py-2.5 border-2 transition-all hover:bg-brand/10"
                          style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)' }}>
                        Giriş Yap
                    </Link>
                </div>
            )}

            {loading && (
                <div className="relative border p-8 text-center" style={TS}>
                    <p className="font-mono text-sm" style={{ color: 'var(--color-brand-primary)' }}>
                    </p>
                </div>
            )}

            {/* Seviyeler sekmesi */}
            {!loading && tab === 'levels' && isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {levelBadges.map(b => (
                        <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)}
                            showcased={showcaseSet.has(b.key)}
                            showcaseFull={showcaseFull}
                            onToggleShowcase={earnedKeys.has(b.key) ? handleToggleShowcase : null} />
                    ))}
                </div>
            )}

            {/* Başarımlar sekmesi */}
            {!loading && tab === 'achievements' && isAuthenticated && (
                <div className="flex flex-col gap-8">
                    {(activityEarned.length + activityLocked.length) > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Trophy className="w-4 h-4" style={{ color: 'var(--color-accent-amber)' }} />
                                <p className="font-mono text-xs font-bold uppercase tracking-widest"
                                   style={{ color: 'var(--color-accent-amber)' }}>
                                    Aktivite & Kilometre Taşları
                                </p>
                                <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[...activityEarned, ...activityLocked].map(b => (
                                    <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)}
                                        showcased={showcaseSet.has(b.key)}
                                        showcaseFull={showcaseFull}
                                        onToggleShowcase={earnedKeys.has(b.key) ? handleToggleShowcase : null} />
                                ))}
                            </div>
                        </section>
                    )}
                    {(catEarned.length + catLocked.length) > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Star className="w-4 h-4" style={{ color: 'var(--color-accent-blue)' }} />
                                <p className="font-mono text-xs font-bold uppercase tracking-widest"
                                   style={{ color: 'var(--color-accent-blue)' }}>
                                    Kategori Uzmanlığı
                                </p>
                                <div className="flex-1 h-px" style={{ background: 'var(--color-terminal-border-raw)' }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[...catEarned, ...catLocked].map(b => (
                                    <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)}
                                        showcased={showcaseSet.has(b.key)}
                                        showcaseFull={showcaseFull}
                                        onToggleShowcase={earnedKeys.has(b.key) ? handleToggleShowcase : null} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* Sıralama sekmesi */}
            {tab === 'leaderboard' && <LeaderboardTab />}
        </div>
    );
}
