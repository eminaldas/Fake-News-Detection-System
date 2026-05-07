import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Trophy, BarChart2 } from 'lucide-react';
import GamificationService from '../services/gamification.service';
import { useAuth } from '../contexts/AuthContext';

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };
const Corner = () => (
    <>
        <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />
    </>
);

const LEVEL_BADGE_KEYS = ['level_1','level_10','level_20','level_30','level_40','level_50'];

function BadgeCard({ badge, earned }) {
    const progress  = !earned ? (badge.progress  ?? 0) : null;
    const threshold = !earned ? (badge.threshold ?? 1) : null;
    const pct = threshold ? Math.min((progress / threshold) * 100, 100) : 0;
    return (
        <div className="relative border p-4 flex flex-col gap-2"
             style={{ borderColor: earned ? badge.color : 'var(--color-terminal-border-raw)', background: earned ? `${badge.color}08` : 'transparent' }}>
            {earned && <Corner />}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border shrink-0"
                     style={{ borderColor: earned ? badge.color : 'var(--color-terminal-border-raw)', color: earned ? badge.color : 'var(--color-text-muted)' }}>
                    <span className="font-mono text-lg font-black">{badge.name[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold"
                       style={{ color: earned ? badge.color : 'var(--color-text-muted)' }}>{badge.name}</p>
                    <p className="font-mono text-[10px]"
                       style={{ color: 'var(--color-text-muted)' }}>{badge.description}</p>
                </div>
                {earned && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 shrink-0"
                          style={{ background: `${badge.color}20`, color: badge.color }}>KAZANILDI</span>
                )}
            </div>
            {!earned && threshold && (
                <div>
                    <div className="w-full h-1 rounded-full overflow-hidden"
                         style={{ background: 'var(--color-terminal-border-raw)' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${pct}%`, background: 'var(--color-brand-primary)' }} />
                    </div>
                    <p className="font-mono text-[9px] mt-0.5"
                       style={{ color: 'var(--color-text-muted)' }}>{progress}/{threshold}</p>
                </div>
            )}
        </div>
    );
}

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
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(PERIOD_LABELS).map(([v, l]) => (
                    <button key={v} onClick={() => setPeriod(v)}
                            className="font-mono text-xs px-3 py-1 border transition-colors"
                            style={{ borderColor: period === v ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)', color: period === v ? 'var(--color-brand-primary)' : 'var(--color-text-muted)', background: period === v ? 'rgba(26,158,79,0.10)' : 'transparent' }}>
                        {l}
                    </button>
                ))}
                <span className="self-center" style={{ color: 'var(--color-terminal-border-raw)' }}>|</span>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <button key={v} onClick={() => setType(v)}
                            className="font-mono text-xs px-3 py-1 border transition-colors"
                            style={{ borderColor: type === v ? 'var(--color-accent-blue)' : 'var(--color-terminal-border-raw)', color: type === v ? 'var(--color-accent-blue)' : 'var(--color-text-muted)', background: type === v ? 'rgba(59,130,246,0.10)' : 'transparent' }}>
                        {l}
                    </button>
                ))}
            </div>
            {loading && <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>}
            {!loading && data && (
                <div className="flex flex-col gap-1">
                    {data.entries.map(entry => {
                        const isMe = user && entry.user_id === user.id;
                        return (
                            <Link key={entry.user_id} to={`/users/${entry.user_id}`}
                                  className="flex items-center gap-3 px-4 py-3 border transition-colors hover:bg-white/3"
                                  style={{ borderColor: isMe ? 'var(--color-brand-primary)' : 'var(--color-terminal-border-raw)', background: isMe ? 'rgba(26,158,79,0.05)' : 'transparent' }}>
                                <span className="font-mono text-xs w-6 shrink-0 text-right"
                                      style={{ color: entry.rank <= 3 ? 'var(--color-accent-amber)' : 'var(--color-text-muted)' }}>
                                    {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
                                </span>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
                                     style={{ background: 'rgba(26,158,79,0.15)', color: 'var(--color-brand-primary)' }}>
                                    {entry.username[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm font-bold"
                                       style={{ color: isMe ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>
                                        {entry.username}{isMe && <span className="ml-2 text-[9px] opacity-60">(sen)</span>}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Lv.{entry.level}</span>
                                        {entry.showcase_badges.map(b => (
                                            <span key={b.key} className="font-mono text-[9px] px-1.5 py-0.5 border"
                                                  style={{ borderColor: b.color, color: b.color }}>{b.name}</span>
                                        ))}
                                    </div>
                                </div>
                                <span className="font-mono text-sm font-black shrink-0"
                                      style={{ color: 'var(--color-brand-primary)' }}>
                                    {entry.value.toLocaleString('tr-TR')} {TYPE_LABELS[type]}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Badges() {
    const [tab,     setTab]     = useState('levels');
    const [badges,  setBadges]  = useState(null);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        GamificationService.getMyBadges()
            .then(setBadges).catch(() => {}).finally(() => setLoading(false));
    }, [isAuthenticated]);

    const earnedKeys = new Set((badges?.earned || []).map(b => b.key));
    const allBadges  = [...(badges?.earned || []), ...(badges?.locked || [])];
    const byKey      = Object.fromEntries(allBadges.map(b => [b.key, b]));

    const levelBadges    = LEVEL_BADGE_KEYS.map(k => byKey[k]).filter(Boolean);
    const activityEarned = (badges?.earned  || []).filter(b => !LEVEL_BADGE_KEYS.includes(b.key) && b.category !== 'category');
    const activityLocked = (badges?.locked  || []).filter(b => !LEVEL_BADGE_KEYS.includes(b.key) && b.category !== 'category');
    const catEarned      = (badges?.earned  || []).filter(b => b.category === 'category');
    const catLocked      = (badges?.locked  || []).filter(b => b.category === 'category');

    const TABS = [
        { key: 'levels',       label: '// SEVİYE',    Icon: Award     },
        { key: 'achievements', label: '// BAŞARIMLAR', Icon: Trophy    },
        { key: 'leaderboard',  label: '// SIRA',       Icon: BarChart2 },
    ];

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="relative border mb-6" style={S}>
                <Corner />
                <div className="px-5 py-4">
                    <h1 className="font-mono text-lg font-black tracking-wider"
                        style={{ color: 'var(--color-brand-primary)' }}>// ROZETLER & BAŞARIMLAR</h1>
                    <p className="font-mono text-xs mt-1"
                       style={{ color: 'var(--color-text-muted)' }}>
                        Aktivitelerini rozetlere dönüştür, sıralamada yerini al
                    </p>
                </div>
            </div>

            <div className="flex border-b mb-6" style={BD}>
                {TABS.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                            className="px-4 py-2.5 font-mono text-xs border-b-2 transition-colors flex items-center gap-1.5"
                            style={{ borderColor: tab === key ? 'var(--color-brand-primary)' : 'transparent', color: tab === key ? 'var(--color-brand-primary)' : 'var(--color-text-muted)', marginBottom: '-1px' }}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {!isAuthenticated && tab !== 'leaderboard' && (
                <div className="relative border p-8 text-center" style={S}>
                    <Corner />
                    <p className="font-mono text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                        Rozetlerini görmek için giriş yap
                    </p>
                    <Link to="/login" className="font-mono text-xs px-4 py-2 border transition-colors hover:bg-white/5"
                          style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)' }}>
                        Giriş Yap
                    </Link>
                </div>
            )}

            {loading && <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>// yükleniyor...</p>}

            {!loading && tab === 'levels' && isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {levelBadges.map(b => <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)} />)}
                </div>
            )}

            {!loading && tab === 'achievements' && isAuthenticated && (
                <div className="flex flex-col gap-6">
                    {(activityEarned.length + activityLocked.length) > 0 && (
                        <section>
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
                               style={{ color: 'var(--color-text-muted)' }}>Aktivite & Kilometre Taşları</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...activityEarned, ...activityLocked].map(b => <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)} />)}
                            </div>
                        </section>
                    )}
                    {(catEarned.length + catLocked.length) > 0 && (
                        <section>
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
                               style={{ color: 'var(--color-text-muted)' }}>Kategori Uzmanlığı</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...catEarned, ...catLocked].map(b => <BadgeCard key={b.key} badge={b} earned={earnedKeys.has(b.key)} />)}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {tab === 'leaderboard' && <LeaderboardTab />}
        </div>
    );
}
