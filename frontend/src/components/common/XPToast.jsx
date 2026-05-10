import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

/* ── CSS animasyonları (bir kere enjekte edilir) ───────────── */
const STYLES = `
@keyframes xp-slide-in {
  0%   { transform: translateX(-110%); opacity: 0; }
  60%  { transform: translateX(6px); }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes xp-slide-out {
  0%   { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(-110%); opacity: 0; }
}
@keyframes badge-burst {
  0%   { transform: scale(0.4) translateX(60%); opacity: 0; }
  45%  { transform: scale(1.12) translateX(0); opacity: 1; }
  65%  { transform: scale(0.96) translateX(0); }
  82%  { transform: scale(1.03) translateX(0); }
  100% { transform: scale(1) translateX(0); opacity: 1; }
}
@keyframes badge-slide-out {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.9) translateX(110%); opacity: 0; }
}
@keyframes badge-glow-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(245,158,11,0.3), 0 4px 20px rgba(0,0,0,0.4); }
  50%       { box-shadow: 0 0 24px rgba(245,158,11,0.65), 0 4px 30px rgba(245,158,11,0.2); }
}
@keyframes sparkle-pop {
  0%   { transform: translate(-50%,-50%) scale(0) rotate(0deg); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(1.2) rotate(var(--tr)); opacity: 0; }
}
`;

let _styleInjected = false;
function injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    const el = document.createElement('style');
    el.textContent = STYLES;
    document.head.appendChild(el);
}

/* ── Sparkle noktaları rozet patlaması için ─────────────────── */
const SPARKLES = [
    { tx: '0px',    ty: '-36px', tr: '0deg',   delay: 0   },
    { tx: '25px',   ty: '-26px', tr: '45deg',  delay: 30  },
    { tx: '36px',   ty: '0px',   tr: '90deg',  delay: 0   },
    { tx: '25px',   ty: '26px',  tr: '135deg', delay: 30  },
    { tx: '0px',    ty: '36px',  tr: '180deg', delay: 0   },
    { tx: '-25px',  ty: '26px',  tr: '225deg', delay: 30  },
    { tx: '-36px',  ty: '0px',   tr: '270deg', delay: 0   },
    { tx: '-25px',  ty: '-26px', tr: '315deg', delay: 30  },
];

/* ── XP Kazanma Toast ────────────────────────────────────────── */
function XPGainToast({ item, onDone }) {
    const [phase, setPhase] = useState('in'); // in | stable | out

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('stable'), 400);
        const t2 = setTimeout(() => setPhase('out'), 2800);
        const t3 = setTimeout(onDone, 3300);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onDone]);

    return (
        <div
            className="flex items-center gap-3 border font-mono shadow-xl"
            style={{
                background:     'var(--color-terminal-surface)',
                borderColor:    'var(--color-brand-primary)',
                borderLeft:     '3px solid var(--color-brand-primary)',
                minWidth:       220,
                animation:      phase === 'out'
                    ? 'xp-slide-out 0.45s ease-in forwards'
                    : 'xp-slide-in 0.45s cubic-bezier(0.34,1.3,0.64,1) forwards',
                padding:        '10px 14px',
            }}
        >
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                    background: 'rgba(16,185,129,0.15)',
                    border:     '1px solid var(--color-brand-primary)',
                }}
            >
                <Star className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
            </div>
            <div>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black" style={{ color: 'var(--color-brand-primary)' }}>
                        +{item.xpGained} XP
                    </span>
                </div>
                {item.label && (
                    <span className="text-[11px] opacity-60 leading-tight block"
                          style={{ color: 'var(--color-text-primary)' }}>
                        {item.label}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── Rozet Kazanma Toast (patlama efekti) ───────────────────── */
function BadgeToast({ item, onDone }) {
    const [phase, setPhase] = useState('in');
    const [showSpark, setShowSpark] = useState(true);

    useEffect(() => {
        const t1 = setTimeout(() => setShowSpark(false), 600);
        const t2 = setTimeout(() => setPhase('out'), 3600);
        const t3 = setTimeout(onDone, 4100);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onDone]);

    return (
        <div className="relative">
            {/* Sparkle noktaları */}
            {showSpark && SPARKLES.map((s, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full pointer-events-none"
                    style={{
                        left:      '50%',
                        top:       '50%',
                        background: i % 2 === 0 ? 'var(--color-accent-amber)' : '#fff',
                        '--tx':    s.tx,
                        '--ty':    s.ty,
                        '--tr':    s.tr,
                        animation: `sparkle-pop 0.55s ${s.delay}ms ease-out forwards`,
                        zIndex:    10,
                    }}
                />
            ))}

            <div
                className="flex items-center gap-3 border font-mono shadow-xl"
                style={{
                    background:     'var(--color-terminal-surface)',
                    borderColor:    'var(--color-accent-amber)',
                    borderLeft:     '3px solid var(--color-accent-amber)',
                    minWidth:       220,
                    padding:        '10px 14px',
                    animation:      phase === 'out'
                        ? 'badge-slide-out 0.45s ease-in forwards'
                        : 'badge-burst 0.55s cubic-bezier(0.34,1.4,0.64,1) forwards, badge-glow-pulse 1.8s 0.6s ease-in-out infinite',
                }}
            >
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xl"
                    style={{
                        background: 'rgba(245,158,11,0.15)',
                        border:     '1.5px solid var(--color-accent-amber)',
                    }}
                >
                    🏅
                </div>
                <div>
                    <div
                        className="text-[10px] font-black tracking-widest uppercase"
                        style={{ color: 'var(--color-accent-amber)' }}
                    >
                        Yeni Başarım!
                    </div>
                    <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {item.name}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Ana bileşen ─────────────────────────────────────────────── */
let _enqueue = null;

const XPToast = () => {
    const [queue,   setQueue]   = useState([]);
    const [current, setCurrent] = useState(null);
    const enqueueRef = useRef(null);

    /* Global enqueue fonksiyonunu set et */
    useEffect(() => {
        injectStyles();
        enqueueRef.current = (item) =>
            setQueue(prev => [...prev, { ...item, _id: Date.now() + Math.random() }]);
        _enqueue = enqueueRef.current;
        return () => { _enqueue = null; };
    }, []);

    /* Kuyruğu işle: mevcut toast bitince bir sonrakine geç */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        if (current || queue.length === 0) return;
        const [next, ...rest] = queue;
        setQueue(rest);
        setCurrent(next);
    }, [queue, current]);

    const handleDone = () => setCurrent(null);

    if (!current) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[9999] pointer-events-none">
            {current.type === 'badge'
                ? <BadgeToast  item={current} onDone={handleDone} />
                : <XPGainToast item={current} onDone={handleDone} />
            }
        </div>
    );
};

XPToast.show = ({ xpGained = 0, label = '', newBadges = [] }) => {
    if (!_enqueue) return;
    if (xpGained > 0) {
        _enqueue({ type: 'xp', xpGained, label });
    }
    (newBadges ?? []).forEach(b => {
        _enqueue({ type: 'badge', name: b.name, key: b.key });
    });
};

export default XPToast;
