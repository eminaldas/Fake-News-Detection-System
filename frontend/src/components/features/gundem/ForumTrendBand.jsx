import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Flame } from 'lucide-react';

const CARD_W = 280;
const GAP    = 16;
const SPEED  = 40;

const CAT_COLORS = {
    gündem:    '#3b82f6',
    ekonomi:   '#f59e0b',
    spor:      '#10b981',
    teknoloji: '#8b5cf6',
    sağlık:    '#ef4444',
    kültür:    '#ec4899',
    yaşam:     '#14b8a6',
};

function relTime(dt) {
    if (!dt) return '';
    const s = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (s < 60)    return 'az önce';
    if (s < 3600)  return `${Math.floor(s / 60)} dk`;
    if (s < 86400) return `${Math.floor(s / 3600)} sa`;
    return `${Math.floor(s / 86400)} gün`;
}

function TrendCard({ thread }) {
    const catColor = CAT_COLORS[thread.category?.toLowerCase()] || 'var(--color-brand-primary)';
    return (
        <Link
            to={`/forum/thread/${thread.id}`}
            className="flex-shrink-0 relative flex flex-col gap-2.5 p-4 transition-all hover:shadow-[0_0_12px_rgba(63,255,139,0.12)]"
            style={{
                width:       CARD_W,
                background:  'var(--color-terminal-surface)',
                border:      '1px solid var(--color-terminal-border-raw)',
                position:    'relative',
            }}
            onClick={e => e.stopPropagation()}
        >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-3 h-[1.5px] pointer-events-none"
                 style={{ background: `${catColor}80` }} />
            <div className="absolute top-0 left-0 h-3 w-[1.5px] pointer-events-none"
                 style={{ background: `${catColor}80` }} />

            {thread.is_rising && (
                <span className="absolute top-3 right-3 flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5"
                      style={{ background: '#ff735120', color: '#ff7351', border: '1px solid #ff735140' }}>
                    <Flame className="w-2.5 h-2.5" />
                    Trend
                </span>
            )}

            <span className="font-mono text-[10px] font-black uppercase tracking-widest self-start px-2 py-0.5"
                  style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}35` }}>
                {thread.category || 'Genel'}
            </span>

            <p className="text-sm font-semibold text-tx-primary leading-snug line-clamp-2">
                {thread.title}
            </p>

            <div className="flex items-center gap-3 font-mono text-[11px] text-tx-secondary mt-auto pt-2 border-t"
                 style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                    </svg>
                    {thread.total_votes} oy
                </span>
                <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {thread.comment_count}
                </span>
                <span className="ml-auto shrink-0">{relTime(thread.created_at)}</span>
            </div>
        </Link>
    );
}

export default function ForumTrendBand({ threads, loading }) {
    const bandRef    = useRef(null);
    const rafRef     = useRef(null);
    const lastTsRef  = useRef(null);
    const pauseTimer = useRef(null);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const el = bandRef.current;
        if (!el || paused || threads.length === 0) return;
        const halfW = el.scrollWidth / 2;

        const step = (ts) => {
            if (lastTsRef.current !== null) {
                const dt = ts - lastTsRef.current;
                el.scrollLeft += (SPEED * dt) / 1000;
                if (el.scrollLeft >= halfW) el.scrollLeft -= halfW;
            }
            lastTsRef.current = ts;
            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(rafRef.current);
            lastTsRef.current = null;
        };
    }, [paused, threads.length]);

    const handleArrow = (dir) => {
        const el = bandRef.current;
        if (!el) return;
        setPaused(true);
        lastTsRef.current = null;
        el.scrollLeft += dir * (CARD_W + GAP);
        clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => setPaused(false), 3000);
    };

    if (loading || threads.length === 0) return null;

    const doubled = [...threads, ...threads];

    return (
        <section className="mt-14">
            {/* Başlık */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="font-mono text-[11px] text-tx-secondary/70 mb-1">// FORUM_TRENDLERİ</p>
                    <h2 className="text-xl font-extrabold text-tx-primary">Forum Trendleri</h2>
                    <p className="font-mono text-[11px] text-tx-secondary/60 mt-0.5">
                        Son 6 saatin en aktif tartışmaları
                    </p>
                </div>
                <div className="flex gap-2">
                    {[-1, 1].map(dir => (
                        <button
                            key={dir}
                            onClick={() => handleArrow(dir)}
                            className="w-8 h-8 border flex items-center justify-center text-sm text-tx-secondary hover:text-tx-primary hover:border-brand transition-colors"
                            style={{ borderColor: 'var(--color-terminal-border-raw)' }}
                        >
                            {dir === -1 ? '←' : '→'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none z-10"
                     style={{ background: 'linear-gradient(to right, var(--color-bg-base), transparent)' }} />
                <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none z-10"
                     style={{ background: 'linear-gradient(to left, var(--color-bg-base), transparent)' }} />

                <div
                    ref={bandRef}
                    className="flex overflow-x-auto pb-2"
                    style={{
                        gap:            GAP,
                        scrollbarWidth: 'none',
                        scrollSnapType: paused ? 'x mandatory' : 'none',
                    }}
                    onMouseEnter={() => { setPaused(true); clearTimeout(pauseTimer.current); lastTsRef.current = null; }}
                    onMouseLeave={() => setPaused(false)}
                >
                    {doubled.map((t, i) => (
                        <div key={`${t.id}-${i}`}
                             style={{ scrollSnapAlign: paused ? 'start' : 'none', flexShrink: 0 }}>
                            <TrendCard thread={t} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
