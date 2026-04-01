import React, { useRef, useState } from 'react';
import { Trophy } from 'lucide-react';

/* ── Mock veri (gerçek API bağlantısı sonraya) ───────────────────── */
const LEAGUES = [
    { id: 'super-lig',      name: 'Süper Lig',       flag: 'TR' },
    { id: 'premier-league', name: 'Premier League',  flag: 'EN' },
    { id: 'la-liga',        name: 'La Liga',          flag: 'ES' },
];

const MATCHES = {
    'super-lig': [
        { id: 1,  home: 'Galatasaray',  away: 'Fenerbahçe',   hg: 2, ag: 1, status: 'BİTTİ', min: null },
        { id: 2,  home: 'Beşiktaş',     away: 'Trabzonspor',  hg: 1, ag: 1, status: 'CANLI', min: 67   },
        { id: 3,  home: 'Başakşehir',   away: 'Kayserispor',  hg: 0, ag: 2, status: 'BİTTİ', min: null },
        { id: 4,  home: 'Sivasspor',    away: 'Antalyaspor',  hg: 3, ag: 0, status: 'BİTTİ', min: null },
        { id: 5,  home: 'Kasımpaşa',    away: 'Alanyaspor',   hg: 1, ag: 1, status: 'BİTTİ', min: null },
        { id: 6,  home: 'Rizespor',     away: 'Hatayspor',    hg: 2, ag: 0, status: 'BİTTİ', min: null },
    ],
    'premier-league': [
        { id: 7,  home: 'Arsenal',      away: 'Man City',     hg: 1, ag: 2, status: 'BİTTİ', min: null },
        { id: 8,  home: 'Liverpool',    away: 'Chelsea',      hg: 3, ag: 1, status: 'BİTTİ', min: null },
        { id: 9,  home: 'Tottenham',    away: 'Man United',   hg: 0, ag: 0, status: 'CANLI', min: 34   },
        { id: 10, home: 'Newcastle',    away: 'Brighton',     hg: 2, ag: 2, status: 'BİTTİ', min: null },
        { id: 11, home: 'Aston Villa',  away: 'Everton',      hg: 1, ag: 0, status: 'BİTTİ', min: null },
    ],
    'la-liga': [
        { id: 12, home: 'Real Madrid',  away: 'Barcelona',    hg: 2, ag: 2, status: 'BİTTİ', min: null },
        { id: 13, home: 'Atletico',     away: 'Sevilla',      hg: 1, ag: 0, status: 'CANLI', min: 55   },
        { id: 14, home: 'Valencia',     away: 'Betis',        hg: 0, ag: 1, status: 'BİTTİ', min: null },
        { id: 15, home: 'Villarreal',   away: 'Bilbao',       hg: 2, ag: 1, status: 'BİTTİ', min: null },
    ],
};

function MatchRow({ m }) {
    const isLive = m.status === 'CANLI';
    return (
        <div className="flex items-center gap-2 px-4 py-2.5 shrink-0">
            {/* Durum */}
            <span className={`text-[9px] font-black uppercase tracking-wider w-12 shrink-0 ${isLive ? 'text-es-primary animate-pulse-soft' : 'text-tx-secondary/50'}`}>
                {isLive ? `${m.min}'` : m.status}
            </span>

            {/* Ev sahibi */}
            <span className="flex-1 text-[11px] font-bold text-tx-primary text-right truncate">{m.home}</span>

            {/* Skor */}
            <span className={`text-sm font-manrope font-black tabular-nums px-2 py-0.5 rounded-md shrink-0
                ${isLive
                    ? 'bg-es-primary/15 text-es-primary border border-es-primary/20'
                    : 'bg-brutal-border/30 dark:bg-surface-solid/60 text-tx-primary'}`}>
                {m.hg} – {m.ag}
            </span>

            {/* Deplasman */}
            <span className="flex-1 text-[11px] font-bold text-tx-primary text-left truncate">{m.away}</span>
        </div>
    );
}

const SporCard = () => {
    const [league,  setLeague]  = useState(LEAGUES[0].id);
    const [paused,  setPaused]  = useState(false);
    const timerRef              = useRef(null);

    const matches = MATCHES[league] ?? [];
    const doubled = [...matches, ...matches];

    const handleInteract = () => {
        setPaused(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setPaused(false), 2000);
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-brutal-border dark:border-surface-solid bg-surface">

            {/* Header */}
            <div className="px-4 py-3 border-b border-brutal-border dark:border-surface-solid flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-es-primary shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest text-tx-primary">Spor</span>
                </div>
                {/* Lig seçici */}
                <div className="flex items-center gap-1">
                    {LEAGUES.map(l => (
                        <button
                            key={l.id}
                            onClick={() => setLeague(l.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-150
                                ${league === l.id
                                    ? 'bg-es-primary text-es-bg'
                                    : 'text-tx-secondary hover:text-tx-primary'}`}
                        >
                            {l.flag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lig adı */}
            <div className="px-4 py-1.5 border-b border-brutal-border/30 dark:border-surface-solid/40">
                <span className="text-[10px] text-tx-secondary font-semibold">
                    {LEAGUES.find(l => l.id === league)?.name}
                </span>
            </div>

            {/* Kaydırmalı maç listesi */}
            <div
                className="overflow-hidden"
                style={{ height: `${Math.min(matches.length, 4) * 44}px` }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onWheel={handleInteract}
                onTouchMove={handleInteract}
            >
                <div
                    className="flex flex-col divide-y divide-brutal-border/30 dark:divide-surface-solid/40"
                    style={{
                        animation: matches.length > 4 ? `verticalScroll ${matches.length * 1.8}s linear infinite` : 'none',
                        animationPlayState: paused ? 'paused' : 'running',
                    }}
                >
                    {doubled.map((m, i) => <MatchRow key={`${m.id}-${i}`} m={m} />)}
                </div>
            </div>

            <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-[9px] text-tx-secondary/30 uppercase tracking-widest">Mock veri · yakında canlı</span>
                {paused && <span className="text-[9px] text-es-primary/60">⏸ duraklatıldı</span>}
            </div>
        </div>
    );
};

export default SporCard;
