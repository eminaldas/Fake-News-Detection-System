import React, { useState, useEffect, useRef } from 'react';
import {
    ScanText, Cpu, Globe, Sparkles, ShieldCheck,
    CheckCircle2, Circle, Loader2,
} from 'lucide-react';

const BRAND   = 'var(--color-brand-primary)';
const SURFACE = 'var(--color-terminal-surface)';
const BORDER  = 'var(--color-terminal-border-raw)';
const TEXT    = 'var(--color-text-primary)';
const MUTED   = 'var(--color-text-primary)';

const TIPS = [
    'Koordineli yayılım yapan haberler gerçek haberlere göre 6× daha hızlı yayılır.',
    '"Şok", "Bomba", "Flaş" gibi kelimeler clickbait haberlerin en güçlü göstergesidir.',
    'Anonim kaynaklı haberler gerçek olma ihtimalini %40 düşürür.',
    'Haberin tarihini kontrol edin — eski haberler yeni gelişmeler gibi sunulabilir.',
    'Resmi kaynaklara referans veren haberler daha güvenilir olma eğilimindedir.',
    'Büyük harf fazlalığı manipülatif dil işareti taşıyabilir.',
    'Paylaşmadan önce en az bir bağımsız kaynaktan doğrulayın.',
];

const STEPS = [
    { key: null,               label: 'Metin analiz ediliyor',    Icon: ScanText    },
    { key: null,               label: 'NLP sinyalleri hesaplandı', Icon: Cpu         },
    { key: 'source_discovery', label: 'Kaynaklar taranıyor',      Icon: Globe       },
    { key: 'gemini',           label: 'Gemini değerlendiriyor',   Icon: Sparkles    },
    { key: 'complete',         label: 'Sonuç hazırlanıyor',       Icon: ShieldCheck },
];

// Hangi adım aktif/tamamlanmış?
function getStepState(stepIdx, stage, allComplete) {
    if (allComplete) return 'done';
    const stageIdx = stage === null ? 1
        : stage === 'source_discovery' ? 2
        : stage === 'gemini' ? 3
        : 4;
    if (stepIdx < stageIdx)  return 'done';
    if (stepIdx === stageIdx) return 'active';
    return 'idle';
}

function pctFromStage(stage) {
    if (!stage)                     return 18;
    if (stage === 'source_discovery') return 48;
    if (stage === 'gemini')           return 75;
    return 90;
}

export default function AnalysisLoadingScreen({ analysisStage, pendingText, isComplete, onComplete }) {
    const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
    const [pct,    setPct]    = useState(5);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4500);
        return () => clearInterval(id);
    }, []);

    // Zaman tabanlı + stage tabanlı ilerleme (isComplete olmadığı sürece)
    useEffect(() => {
        if (isComplete) return;
        const id = setInterval(() => {
            const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
            const stagePct   = pctFromStage(analysisStage ?? null);
            const timePct    = elapsedSec >= 15 ? 70 : elapsedSec >= 10 ? 50 : 18;
            const target     = Math.max(stagePct, timePct);
            setPct(p => p >= target ? p : Math.min(p + 1, target));
        }, 45);
        return () => clearInterval(id);
    }, [analysisStage, isComplete]);

    // Tamamlanma animasyonu: bar → 100%, tüm adımlar tik, sonra onComplete
    useEffect(() => {
        if (!isComplete) return;
        const id = setInterval(() => setPct(p => Math.min(p + 2, 100)), 20);
        const tid = setTimeout(() => { clearInterval(id); onComplete?.(); }, 1200);
        return () => { clearInterval(id); clearTimeout(tid); };
    }, [isComplete, onComplete]);

    return (
        <div
            className="animate-fade-up mt-6 md:mt-8 w-full relative overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${BRAND}` }}
        >
            {/* Köşe aksanları */}
            {[
                'top-0 left-0 w-5 h-0.5',
                'top-0 left-0 h-5 w-0.5',
                'bottom-0 right-0 w-5 h-0.5',
                'bottom-0 right-0 h-5 w-0.5',
            ].map((cls, i) => (
                <div key={i} className={`absolute ${cls} pointer-events-none`} style={{ background: BRAND }} />
            ))}

            {/* Header */}
            <div className="px-5 sm:px-7 py-4 flex items-center gap-3 border-b" style={{ borderColor: BORDER }}>
                {isComplete
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: BRAND }} />
                    : <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: BRAND }} />
                }
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                    {isComplete ? '// Analiz Tamamlandı' : '// Analiz Devam Ediyor'}
                </span>
                <div className="ml-auto flex items-center gap-3">
                    <div className="hidden sm:flex h-1.5 w-32 overflow-hidden" style={{ background: BORDER }}>
                        <div
                            className="h-full transition-all duration-500 ease-out"
                            style={{ width: `${pct}%`, background: BRAND }}
                        />
                    </div>
                    <span className="font-mono text-sm font-black" style={{ color: BRAND }}>
                        {isComplete && pct >= 100 ? '✓ 100%' : `%${pct}`}
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

                    {STEPS.map(({ key, label, Icon }, idx) => {
                        const state = getStepState(idx, analysisStage ?? null, isComplete);
                        const isDone   = state === 'done';
                        const isActive = state === 'active';
                        return (
                            <div key={idx} className="flex items-center gap-3">
                                {/* Durum ikonu */}
                                {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: BRAND }} />
                                ) : isActive ? (
                                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: BRAND }} />
                                ) : (
                                    <Circle className="w-4 h-4 shrink-0" style={{ color: BORDER }} />
                                )}

                                {/* Adım ikonu */}
                                <Icon
                                    className="w-3.5 h-3.5 shrink-0"
                                    style={{
                                        color: isDone || isActive ? BRAND : TEXT,
                                        opacity: isDone || isActive ? 1 : 0.25,
                                    }}
                                />

                                {/* Etiket */}
                                <span
                                    className="font-mono text-xs"
                                    style={{
                                        color: TEXT,
                                        opacity: isDone ? 0.6 : isActive ? 1 : 0.25,
                                        fontWeight: isActive ? 700 : 400,
                                    }}
                                >
                                    {label}{isActive ? '...' : ''}
                                </span>

                                {/* Tamamlandı işareti */}
                                {isDone && (
                                    <span className="ml-auto font-mono text-[9px]" style={{ color: BRAND, opacity: 0.5 }}>
                                        OK
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    <p className="font-mono text-[10px] mt-2" style={{ color: TEXT, opacity: 0.3 }}>
                        Ortalama bekleme: 15–30 saniye
                    </p>

                    {/* Tarama efekti */}
                    {pendingText && (
                        <div className="relative overflow-hidden mt-1" style={{ border: `1px solid ${BORDER}`, opacity: 0.55 }}>
                            <p className="font-mono text-[10px] leading-relaxed line-clamp-2 p-3" style={{ color: TEXT }}>
                                {pendingText}
                            </p>
                            <div className="absolute left-0 right-0 h-8 pointer-events-none"
                                 style={{ background: `linear-gradient(to bottom,transparent,${BRAND}18,transparent)`, animation: 'scan-line 2.2s linear infinite' }} />
                        </div>
                    )}
                </div>

                {/* Dikey ayraç */}
                <div className="hidden md:block w-px" style={{ background: BORDER }} />

                {/* Sağ: İpucu */}
                <div className="flex flex-col gap-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BRAND, opacity: 0.6 }}>
                        // Biliyor Muydunuz?
                    </p>

                    <div className="flex-1 relative min-h-[80px]">
                        <p
                            key={tipIdx}
                            className="text-sm leading-relaxed animate-fade-up"
                            style={{ color: TEXT, opacity: 0.75 }}
                        >
                            "{TIPS[tipIdx]}"
                        </p>
                    </div>

                    {/* Nokta göstergesi */}
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
