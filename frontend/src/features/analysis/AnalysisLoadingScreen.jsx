import React, { useState, useEffect, useRef } from 'react';
import {
    ScanText, Cpu, Globe, Sparkles, ShieldCheck,
    CheckCircle2, Loader2,
} from 'lucide-react';

const BRAND   = 'var(--color-brand-primary)';
const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';
const TEXT    = 'var(--color-text-primary)';

const TIPS = [
    'Koordineli yayılım yapan haberler gerçek haberlere göre 6× daha hızlı yayılır.',
    '"Şok", "Bomba", "Flaş" gibi kelimeler clickbait haberlerin en güçlü göstergesidir.',
    'Anonim kaynaklı haberler gerçek olma ihtimalini %40 düşürür.',
    'Haberin tarihini kontrol edin — eski haberler yeni gelişmeler gibi sunulabilir.',
    'Resmi kaynaklara referans veren haberler daha güvenilir olma eğilimindedir.',
    'Büyük harf fazlalığı manipülatif dil işareti taşıyabilir.',
    'Paylaşmadan önce en az bir bağımsız kaynaktan doğrulayın.',
];

// minMs: minimum fake timer before auto-completing this step
// Infinity = only backend stage or isComplete can complete it
const STEPS = [
    { label: 'Metin analiz ediliyor',     Icon: ScanText,    minMs: 1500     },
    { label: 'NLP sinyalleri hesaplandı', Icon: Cpu,         minMs: 2500     },
    { label: 'Kaynaklar taranıyor',       Icon: Globe,       minMs: 5000     },
    { label: 'Gemini değerlendiriyor',    Icon: Sparkles,    minMs: 10000    },
    { label: 'Sonuç hazırlanıyor',        Icon: ShieldCheck, minMs: Infinity },
];

function stageMinStep(stage) {
    if (stage === 'gemini')           return 3;
    if (stage === 'source_discovery') return 2;
    return 0;
}

const PCT_BY_DONE = [18, 30, 48, 75, 90];

export default function AnalysisLoadingScreen({ analysisStage, pendingText, isComplete, onComplete }) {
    const [phases, setPhases] = useState(['active', 'idle', 'idle', 'idle', 'idle']);
    const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
    const [pct,    setPct]    = useState(5);

    const timersRef  = useRef([]);
    const startedRef = useRef(new Set());

    const addT = (fn, ms) => {
        const id = setTimeout(fn, ms);
        timersRef.current.push(id);
    };

    const completeStep = (idx) => {
        if (startedRef.current.has(idx)) return;
        startedRef.current.add(idx);

        setPhases(p => {
            if (p[idx] === 'done' || p[idx] === 'completing') return p;
            const n = [...p]; n[idx] = 'completing'; return n;
        });

        addT(() => setPhases(p => {
            const n = [...p];
            if (n[idx] === 'completing') n[idx] = 'done';
            return n;
        }), 280);

        if (idx < STEPS.length - 1) {
            addT(() => {
                setPhases(p => {
                    const n = [...p];
                    if (n[idx + 1] === 'idle') n[idx + 1] = 'active';
                    return n;
                });
                if (STEPS[idx + 1].minMs !== Infinity) {
                    addT(() => completeStep(idx + 1), STEPS[idx + 1].minMs);
                }
            }, 350);
        }
    };

    // Mount: step 0 already 'active'; schedule fake timer
    useEffect(() => {
        addT(() => completeStep(0), STEPS[0].minMs);
        return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Backend stage: force-complete steps before minStep, activate minStep
    useEffect(() => {
        if (!analysisStage || isComplete) return;
        const min = stageMinStep(analysisStage);

        setPhases(p => {
            const n = [...p];
            let ch = false;
            for (let i = 0; i < min; i++) {
                if (n[i] !== 'done') { n[i] = 'done'; ch = true; }
            }
            if (n[min] === 'idle') { n[min] = 'active'; ch = true; }
            return ch ? n : p;
        });

        if (STEPS[min].minMs !== Infinity && !startedRef.current.has(min)) {
            addT(() => completeStep(min), STEPS[min].minMs);
        }
    }, [analysisStage]); // eslint-disable-line react-hooks/exhaustive-deps

    // isComplete: cascade all to done, bar to 100%, onComplete
    useEffect(() => {
        if (!isComplete) return;
        STEPS.forEach((_, i) => {
            addT(() => setPhases(p => {
                const n = [...p];
                if (n[i] !== 'done') n[i] = 'completing';
                return n;
            }), i * 120);
            addT(() => setPhases(p => {
                const n = [...p]; n[i] = 'done'; return n;
            }), i * 120 + 200);
        });
        const barId = setInterval(() => setPct(p => Math.min(p + 2, 100)), 20);
        const doneT = setTimeout(() => { clearInterval(barId); onComplete?.(); }, STEPS.length * 120 + 900);
        return () => { clearInterval(barId); clearTimeout(doneT); };
    }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

    // Tip rotator
    useEffect(() => {
        const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4500);
        return () => clearInterval(id);
    }, []);

    // Progress bar crawl
    useEffect(() => {
        if (isComplete) return;
        const doneCount = phases.filter(ph => ph === 'done').length;
        const target    = PCT_BY_DONE[doneCount] ?? 90;
        const id = setInterval(() => setPct(p => p < target ? Math.min(p + 1, target) : p), 45);
        return () => clearInterval(id);
    }, [phases, isComplete]);

    const allDone = phases.every(p => p === 'done');

    return (
        <div
            className="animate-fade-up mt-6 md:mt-8 w-full relative overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${BRAND}` }}
        >
            {['top-0 left-0 w-5 h-0.5', 'top-0 left-0 h-5 w-0.5',
              'bottom-0 right-0 w-5 h-0.5', 'bottom-0 right-0 h-5 w-0.5'].map((cls, i) => (
                <div key={i} className={`absolute ${cls} pointer-events-none`} style={{ background: BRAND }} />
            ))}

            {/* Header */}
            <div className="px-5 sm:px-7 py-4 flex items-center gap-3 border-b" style={{ borderColor: BORDER }}>
                {allDone
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: BRAND }} />
                    : <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: BRAND }} />
                }
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                    {allDone ? '// Analiz Tamamlandı' : '// Analiz Devam Ediyor'}
                </span>
                <div className="ml-auto flex items-center gap-3">
                    <div className="hidden sm:flex h-1.5 w-32 overflow-hidden" style={{ background: BORDER }}>
                        <div
                            className="h-full transition-all duration-500 ease-out"
                            style={{ width: `${pct}%`, background: BRAND }}
                        />
                    </div>
                    <span className="font-mono text-sm font-black" style={{ color: BRAND }}>
                        {allDone && pct >= 100 ? '✓ 100%' : `%${pct}`}
                    </span>
                </div>
            </div>

            <div className="p-5 sm:p-7 grid md:grid-cols-[1fr_1px_1fr] gap-6">

                {/* Sol: Adımlar */}
                <div className="flex flex-col gap-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1"
                       style={{ color: BRAND, opacity: 0.6 }}>
                        // İşlem Adımları
                    </p>

                    {STEPS.map(({ label, Icon }, idx) => {
                        const phase        = phases[idx];
                        const isDone       = phase === 'done';
                        const isCompleting = phase === 'completing';
                        const isActive     = phase === 'active';
                        if (phase === 'idle') return null;

                        return (
                            <div
                                key={idx}
                                className="flex items-center gap-3 animate-fade-up"
                                style={{ animationDuration: '280ms', animationFillMode: 'both' }}
                            >
                                {isDone || isCompleting ? (
                                    <CheckCircle2
                                        className="w-4 h-4 shrink-0"
                                        style={{
                                            color: BRAND,
                                            transform: isCompleting ? 'scale(1.3)' : 'scale(1)',
                                            transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1)',
                                        }}
                                    />
                                ) : (
                                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: BRAND }} />
                                )}

                                <Icon
                                    className="w-3.5 h-3.5 shrink-0"
                                    style={{ color: BRAND, opacity: isDone || isCompleting ? 0.45 : 1 }}
                                />

                                <span
                                    className="font-mono text-xs"
                                    style={{
                                        color: TEXT,
                                        opacity: isDone ? 0.55 : 1,
                                        fontWeight: isActive ? 700 : 400,
                                    }}
                                >
                                    {label}{isActive ? '...' : ''}
                                </span>

                                {(isDone || isCompleting) && (
                                    <span className="ml-auto font-mono text-[9px]"
                                          style={{ color: BRAND, opacity: 0.5 }}>
                                        OK
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    <p className="font-mono text-[10px] mt-2" style={{ color: TEXT, opacity: 0.3 }}>
                        Ortalama bekleme: 15–30 saniye
                    </p>

                    {pendingText && (
                        <div className="relative overflow-hidden mt-1"
                             style={{ border: `1px solid ${BORDER}`, opacity: 0.55 }}>
                            <p className="font-mono text-[10px] leading-relaxed line-clamp-2 p-3"
                               style={{ color: TEXT }}>
                                {pendingText}
                            </p>
                            <div
                                className="absolute left-0 right-0 h-8 pointer-events-none"
                                style={{
                                    background: `linear-gradient(to bottom,transparent,${BRAND}18,transparent)`,
                                    animation: 'scan-line 2.2s linear infinite',
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="hidden md:block w-px" style={{ background: BORDER }} />

                {/* Sağ: İpuçları */}
                <div className="flex flex-col gap-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest"
                       style={{ color: BRAND, opacity: 0.6 }}>
                        // Biliyor Muydunuz?
                    </p>
                    <div className="flex-1 relative min-h-20">
                        <p
                            key={tipIdx}
                            className="text-sm leading-relaxed animate-fade-up"
                            style={{ color: TEXT, opacity: 0.75 }}
                        >
                            "{TIPS[tipIdx]}"
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-auto">
                        {TIPS.map((_, i) => (
                            <div
                                key={i}
                                className="h-1 rounded-full transition-all duration-500"
                                style={{
                                    width: i === tipIdx ? 14 : 4,
                                    background: i === tipIdx ? BRAND : BORDER,
                                    opacity: i === tipIdx ? 1 : 0.4,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
