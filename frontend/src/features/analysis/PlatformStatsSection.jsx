import React from 'react';
import { Activity, Users, ShieldX, ShieldCheck, BarChart2 } from 'lucide-react';
import { usePlatformStats } from '../../hooks/usePlatformStats';

const FAKE_COLOR = '#ff7351';
const AUTH_COLOR = '#3fff8b';
const BRAND      = 'var(--color-brand-primary)';
const SURFACE    = 'var(--color-terminal-surface)';
const BORDER     = 'var(--color-terminal-border-raw)';
const DAY_LABELS = ['Pa', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

function barColor(pct) {
    if (pct === 0)  return BORDER;
    if (pct <= 25)  return AUTH_COLOR;
    if (pct <= 50)  return '#f59e0b';
    if (pct <= 75)  return '#f97316';
    return FAKE_COLOR;
}

function StatBox({ icon: Icon, label, value, accent, delay = 0 }) {
    const col = accent || BRAND;
    return (
        <div
            className="flex-1 min-w-0 p-4 md:p-5 border-r last:border-r-0 animate-fade-up"
            style={{ borderColor: BORDER, animationDelay: `${delay}ms` }}
        >
            <p className="font-mono text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5"
               style={{ color: col, opacity: 0.8 }}>
                <Icon className="w-3 h-3 shrink-0" />
                {label}
            </p>
            <p className="font-mono text-4xl font-black leading-none" style={{ color: 'var(--color-text-primary)' }}>
                {value}
            </p>
        </div>
    );
}

function BarDay({ dateStr, dayLabel, data, isToday, idx }) {
    const [tip,   setTip]   = React.useState(false);
    const pct    = data?.fake_pct ?? 0;
    const target = pct > 0 ? Math.max(6, Math.round((pct / 100) * 72)) : 2;
    const color  = barColor(pct);

    const [animH, setAnimH] = React.useState(0);
    React.useEffect(() => {
        const t = setTimeout(() => setAnimH(target), 300 + idx * 70);
        return () => clearTimeout(t);
    }, [target, idx]);

    const dateLabel = data
        ? new Date(data.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
        : dayLabel;

    return (
        <div className="flex-1 flex flex-col items-center gap-1.5 relative">
            {tip && data && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30
                                whitespace-nowrap px-2 py-1 font-mono text-[10px] pointer-events-none"
                     style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: 'var(--color-text-secondary)' }}>
                    {dateLabel} · {data.total} analiz · %{Math.round(pct)} sahte
                </div>
            )}

            <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                <div
                    className="w-full max-w-[32px] cursor-default"
                    style={{
                        height:        animH,
                        background:    color,
                        opacity:       pct === 0 ? 0.2 : 1,
                        outline:       isToday ? `2px solid ${BRAND}` : 'none',
                        outlineOffset: 2,
                        transition:    'height 0.55s cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onMouseEnter={() => setTip(true)}
                    onMouseLeave={() => setTip(false)}
                />
            </div>

            <span className="font-mono text-[10px] font-bold"
                  style={{ color: isToday ? BRAND : 'var(--color-text-primary)', opacity: isToday ? 1 : 0.5 }}>
                {dayLabel}
            </span>
            <span className="font-mono text-[9px]"
                  style={{ color: pct > 0 ? color : BORDER, opacity: pct > 0 ? 1 : 0.4 }}>
                {pct > 0 ? `%${Math.round(pct)}` : '—'}
            </span>
        </div>
    );
}

export default function PlatformStatsSection() {
    const { stats, loading } = usePlatformStats();
    if (loading || !stats) return null;

    const todayStr = new Date().toISOString().slice(0, 10);
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr  = d.toISOString().slice(0, 10);
        const dayLabel = DAY_LABELS[d.getDay()];
        const data     = stats.heatmap.find(h => h.date === dateStr) || null;
        return { dateStr, dayLabel, data };
    });

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-6 mt-4 animate-fade-up">
            <div className="relative border" style={{ background: SURFACE, borderColor: BORDER }}>

                {/* Köşe çentikler */}
                <div className="absolute top-0 left-0 w-5 h-[2px] pointer-events-none" style={{ background: BRAND }} />
                <div className="absolute top-0 left-0 w-[2px] h-5 pointer-events-none" style={{ background: BRAND }} />
                <div className="absolute bottom-0 right-0 w-5 h-[2px] pointer-events-none" style={{ background: BRAND }} />
                <div className="absolute bottom-0 right-0 w-[2px] h-5 pointer-events-none" style={{ background: BRAND }} />

                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND }} />
                        <span className="font-mono font-bold text-xs uppercase tracking-widest"
                              style={{ color: 'var(--color-text-primary)' }}>
                            Platform İstatistikleri
                        </span>
                    </div>
                    <span className="font-mono text-[10px] tracking-widest" style={{ color: BRAND, opacity: 0.7 }}>
                        // CANLI
                    </span>
                </div>

                {/* Stat kutular */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b" style={{ borderColor: BORDER }}>
                    <StatBox icon={Activity}    label="Bugün Analiz"    value={stats.today_count}         delay={0}   />
                    <StatBox icon={ShieldX}     label="Sahte"           value={stats.fake_count}      accent={FAKE_COLOR} delay={60}  />
                    <StatBox icon={ShieldCheck} label="Güvenilir"       value={stats.authentic_count} accent={AUTH_COLOR} delay={120} />
                    <StatBox icon={Users}       label="Aktif Kullanıcı" value={stats.active_users}         delay={180} />
                </div>

                {/* Bar chart */}
                <div className="px-4 md:px-5 pt-4 pb-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-4"
                       style={{ color: BRAND, opacity: 0.7 }}>
                        // SON_7_GÜN · SAHTELİK_ORANI
                    </p>
                    <div className="flex gap-2">
                        {last7.map(({ dateStr, dayLabel, data }, idx) => (
                            <BarDay
                                key={dateStr}
                                dateStr={dateStr}
                                dayLabel={dayLabel}
                                data={data}
                                isToday={dateStr === todayStr}
                                idx={idx}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
