import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Radio } from 'lucide-react';
import axiosInstance from '../../../api/axios';

const cardStyle = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const divStyle  = { borderColor: 'var(--color-terminal-border-raw)' };

const RecentHeadlines = () => {
    const MAX = 6;
    const [allItems,  setAllItems]  = useState([]);
    const [displayed, setDisplayed] = useState([]);
    const [leavingId, setLeavingId] = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [blink,     setBlink]     = useState(true);

    // İlk yükleme + 60s polling
    useEffect(() => {
        const seenIds = new Set();

        const fetchFeed = () => {
            if (document.hidden) return; // tab arka plandaysa atla
            axiosInstance
                .get('/articles/trending')
                .then(res => {
                    const fresh = res.data.filter(h => !!h.source_url && !seenIds.has(h.id));
                    if (fresh.length === 0) return;
                    fresh.forEach(h => seenIds.add(h.id));
                    setAllItems(prev => {
                        const merged = [...fresh, ...prev];
                        return merged.slice(0, 20); // max 20 item tut
                    });
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 60_000);
        return () => clearInterval(interval);
    }, []);

    // Cursor blink
    useEffect(() => {
        const t = setInterval(() => setBlink(b => !b), 600);
        return () => clearInterval(t);
    }, []);

    // Yeni item'lar teker teker üstten kayarak gelsin, taşanlar alttan çıksın
    useEffect(() => {
        if (allItems.length === 0) return;
        const newItems = allItems.filter(item => !displayed.some(d => d.id === item.id));
        if (newItems.length === 0) return;

        const timers = [];
        newItems.forEach((item, i) => {
            timers.push(setTimeout(() => {
                setDisplayed(prev => {
                    if (prev.length >= MAX) {
                        const victim = prev[prev.length - 1];
                        setLeavingId(victim.id);
                        setTimeout(() => {
                            setDisplayed(p => p.filter(x => x.id !== victim.id));
                            setLeavingId(null);
                        }, 380);
                    }
                    return [item, ...prev];
                });
            }, i * 520));
        });
        return () => timers.forEach(clearTimeout);
    }, [allItems]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="relative border animate-fade-left overflow-hidden flex flex-col" style={cardStyle}>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-4 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-4 w-[2px] bg-brand pointer-events-none" />

            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={divStyle}>
                <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="font-mono font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-primary)' }}>
                        Canlı Feed
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-brand shrink-0"
                        style={{ opacity: blink ? 1 : 0.2, transition: 'opacity 0.15s' }}
                    />
                    <span className="font-mono text-[10px] text-brand tracking-widest">CANLI</span>
                </div>
            </div>

            {/* Items */}
            <div className="overflow-hidden flex-1">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="px-4 py-3.5 space-y-2 animate-pulse border-b border-l-2"
                             style={{ borderColor: 'var(--color-terminal-border-raw)', borderLeftColor: 'var(--color-brand-primary)' + '25' }}>
                            <div className="h-2.5 bg-brutal-border/20 w-1/3" />
                            <div className="h-3.5 bg-brutal-border/30 w-full" />
                            <div className="h-3.5 bg-brutal-border/20 w-3/4" />
                        </div>
                    ))
                ) : displayed.length === 0 ? (
                    <p className="px-4 py-8 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                        // NO_FEED_DATA
                    </p>
                ) : (
                    displayed.map((item, idx) => (
                        <a
                            key={item.id}
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex flex-col gap-1.5 px-4 py-3.5 transition-colors border-l-2
                                       hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
                                       ${item.id === leavingId ? 'animate-feed-out' : 'animate-feed-in'}
                                       ${idx < displayed.length - 1 ? 'border-b' : ''}`}
                            style={{
                                borderColor:     'var(--color-terminal-border-raw)',
                                borderLeftColor: 'var(--color-brand-primary)' + '28',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'var(--color-brand-primary)' + '28')}
                        >
                            {(item.source_domain || item.source_name) && (
                                <span className="font-mono text-[11px] tracking-wide" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                    [{item.source_domain || item.source_name}]
                                </span>
                            )}
                            <p className="text-sm leading-snug line-clamp-2 transition-colors"
                               style={{ color: 'var(--color-text-primary)' }}
                               onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-brand-primary)')}
                               onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}>
                                {item.title}
                            </p>
                            <span className="flex items-center gap-1 font-mono text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--color-brand-primary)', opacity: undefined }}>
                                <ArrowUpRight className="w-3 h-3" />
                                habere_git →
                            </span>
                        </a>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t shrink-0 flex justify-between items-center" style={divStyle}>
                <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    // RSS_FEED_ACTIVE
                </span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--color-brand-primary)', opacity: 0.6 }}>
                    {allItems.length} kayıt
                </span>
            </div>
        </div>
    );
};

export default RecentHeadlines;
