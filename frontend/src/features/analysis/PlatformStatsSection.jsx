// frontend/src/features/analysis/PlatformStatsSection.jsx
import React from 'react';
import { Activity, Users, ShieldX, ShieldCheck } from 'lucide-react';
import { usePlatformStats } from '../../hooks/usePlatformStats';

const FAKE_COLOR    = '#ff7351';
const AUTH_COLOR    = '#3fff8b';
const NEUTRAL_COLOR = 'var(--color-brand-primary)';

function heatColor(pct) {
    if (pct === 0)  return 'var(--color-terminal-border-raw)';
    if (pct <= 20)  return '#1a7a4a';
    if (pct <= 40)  return AUTH_COLOR;
    if (pct <= 60)  return '#f59e0b';
    if (pct <= 80)  return '#f97316';
    return FAKE_COLOR;
}

function StatBox({ icon: Icon, label, value, color }) {
    return (
        <div
            className="flex-1 min-w-0 flex flex-col gap-1 px-5 py-4 border"
            style={{
                background:  'var(--color-terminal-surface)',
                borderColor: 'var(--color-terminal-border-raw)',
            }}
        >
            <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 shrink-0" style={{ color: color || NEUTRAL_COLOR }} />
                <span className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    {label}
                </span>
            </div>
            <span className="font-mono text-2xl font-black leading-none"
                  style={{ color: color || NEUTRAL_COLOR }}>
                {value}
            </span>
        </div>
    );
}

function HeatDay({ day, isToday }) {
    const [showTip, setShowTip] = React.useState(false);
    const color = heatColor(day?.fake_pct ?? 0);
    const label = day
        ? new Date(day.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
        : '—';

    return (
        <div className="relative flex flex-col items-center gap-1">
            <div
                className="w-9 h-9 cursor-default transition-transform hover:scale-110"
                style={{
                    background: color,
                    border: isToday
                        ? `2px solid ${NEUTRAL_COLOR}`
                        : '2px solid transparent',
                    opacity: day ? 1 : 0.25,
                }}
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
            />
            {showTip && day && (
                <div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-2 py-1 font-mono text-[10px] pointer-events-none"
                    style={{
                        background:  'var(--color-terminal-surface)',
                        border:      '1px solid var(--color-terminal-border-raw)',
                        color:       'var(--color-text-secondary)',
                    }}
                >
                    {label} · {day.total} analiz · %{day.fake_pct} sahte
                </div>
            )}
        </div>
    );
}

export default function PlatformStatsSection() {
    const { stats, loading } = usePlatformStats();

    if (loading || !stats) return null;

    const todayStr = new Date().toISOString().slice(0, 10);
    const DAY_LABELS = ['Pa', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']; // 0=Sun

    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr  = d.toISOString().slice(0, 10);
        const dayLabel = DAY_LABELS[d.getDay()];
        const data     = stats.heatmap.find(h => h.date === dateStr) || null;
        return { dateStr, dayLabel, data };
    });

    return (
        <section className="w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-6 mt-4">

            {/* Başlık */}
            <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-brand dark:text-es-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-tx-primary">
                    Platform İstatistikleri
                </h2>
            </div>
            <p className="font-mono text-[10px] text-tx-secondary/80 uppercase tracking-widest mb-4">
                // Bugün · Canlı Veriler
            </p>

            {/* İstatistik bandı */}
            <div className="flex gap-3 mb-6">
                <StatBox icon={Activity}    label="Bugün Analiz"    value={stats.today_count} />
                <StatBox icon={ShieldX}     label="Sahte"           value={stats.fake_count}      color={FAKE_COLOR} />
                <StatBox icon={ShieldCheck} label="Güvenilir"       value={stats.authentic_count} color={AUTH_COLOR} />
                <StatBox icon={Users}       label="Aktif Kullanıcı" value={stats.active_users} />
            </div>

            {/* Heatmap */}
            <div>
                <p className="font-mono text-[10px] text-tx-secondary/80 uppercase tracking-widest mb-3">
                    // Son 7 Günün Sahtelik Oranı
                </p>
                <div className="flex items-end gap-2">
                    {last7.map(({ dateStr, dayLabel, data }) => (
                        <div key={dateStr} className="flex flex-col items-center gap-1">
                            <HeatDay day={data} isToday={dateStr === todayStr} />
                            <span className="font-mono text-[9px]"
                                  style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                                {dayLabel}
                            </span>
                        </div>
                    ))}
                    {/* Renk skalası */}
                    <div className="ml-auto flex items-center gap-1.5">
                        <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>Az</span>
                        {['#1a7a4a', AUTH_COLOR, '#f59e0b', '#f97316', FAKE_COLOR].map(c => (
                            <div key={c} className="w-3 h-3" style={{ background: c }} />
                        ))}
                        <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>Çok</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
