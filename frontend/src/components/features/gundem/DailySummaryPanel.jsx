import React from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { useDigest } from '../../../hooks/useDigest';

const BORDER  = 'var(--color-terminal-border-raw)';
const TEXT_PRI  = 'var(--color-text-primary)';
const TEXT_SEC  = 'var(--color-text-secondary)';
const TEXT_MUT  = 'var(--color-text-muted-accent)';
const GREEN     = '#3fff8b';
const GREEN_DIM = '#2ec46a';

function SkeletonPanel() {
    return (
        <div className="overflow-hidden animate-pulse w-full"
             style={{ background: 'var(--color-terminal-surface)' }}>
            <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b" style={{ borderColor: BORDER }}>
                <div className="w-4 h-4 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-4 w-24 rounded" style={{ background: 'var(--color-skeleton)' }} />
            </div>
            <div className="px-5 py-4 space-y-3">
                <div className="h-3 w-32 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="space-y-2">
                    {[100, 100, 83, 100, 100, 90, 75].map((w, i) => (
                        <div key={i} className="h-3 rounded" style={{ background: 'var(--color-skeleton)', width: `${w}%` }} />
                    ))}
                </div>
                <div className="pt-2 space-y-2">
                    <div className="h-3 w-28 rounded" style={{ background: 'var(--color-skeleton)' }} />
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-8 w-full rounded" style={{ background: 'var(--color-skeleton)' }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function relSlot(slot) {
    const slots = ['09:00', '13:00', '17:00', '21:00'];
    const next = slots[slots.indexOf(slot) + 1];
    return next ? `↺ ${next}` : '↺ Yarın 09:00';
}

export default function DailySummaryPanel() {
    const { data, loading } = useDigest();

    if (loading) return <SkeletonPanel />;

    return (
        <div className="overflow-hidden flex flex-col animate-fade-up w-full"
             style={{ background: 'var(--color-terminal-surface)', borderLeft: `3px solid ${GREEN}55` }}>

            {/* Başlık */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b" style={{ borderColor: BORDER }}>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: GREEN }} />
                <span className="text-sm font-bold flex-1" style={{ color: TEXT_PRI }}>
                    Günün Özeti
                </span>
                {data && (
                    <span className="text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5"
                          style={{ background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)', opacity: 0.9 }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#fff' }} />
                        CANLI
                    </span>
                )}
            </div>

            {!data ? (
                <div className="px-5 py-8 text-center">
                    <p className="text-sm" style={{ color: TEXT_MUT }}>
                        Özet hazırlanıyor…<br />
                        <span className="text-xs">İlk özet 09:00'da gelir</span>
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-1.5 px-5 pt-4 pb-1 animate-fade-up" style={{ animationDelay: '60ms' }}>
                        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN_DIM }} />
                        <span className="text-xs font-semibold" style={{ color: GREEN_DIM }}>
                            {data.slot} · Gemini Özeti
                        </span>
                    </div>

                    <p className="px-5 py-3 text-xs leading-relaxed animate-fade-up"
                       style={{ color: TEXT_SEC, animationDelay: '100ms' }}>
                        {data.summary_text}
                    </p>

                    {data.topics?.length > 0 && (
                        <div className="px-5 pb-4 flex flex-col gap-2 animate-fade-up" style={{ animationDelay: '140ms' }}>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_MUT }}>
                                Öne Çıkan Konular
                            </p>
                            {data.topics.map((t, i) => (
                                <div key={i}
                                     className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium animate-fade-up"
                                     style={{
                                         background:     `${GREEN}08`,
                                         border:         `1px solid ${GREEN}22`,
                                         color:          TEXT_SEC,
                                         animationDelay: `${160 + i * 50}ms`,
                                     }}>
                                    <span className="w-1.5 h-1.5 shrink-0" style={{ background: `${GREEN}66` }} />
                                    {t}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="px-5 pb-5 pt-3 flex justify-between items-center border-t animate-fade-up"
                         style={{ borderColor: BORDER, animationDelay: '200ms' }}>
                        <span className="text-xs" style={{ color: TEXT_MUT }}>
                            {data.article_count} haber analiz edildi
                        </span>
                        <span className="text-xs font-semibold" style={{ color: GREEN_DIM }}>
                            {relSlot(data.slot)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
