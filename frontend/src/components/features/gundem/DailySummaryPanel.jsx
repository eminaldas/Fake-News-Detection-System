import React from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { useDigest } from '../../../hooks/useDigest';

const BORDER = 'var(--color-terminal-border-raw)';

function SkeletonPanel() {
    return (
        <div className="rounded-xl overflow-hidden animate-pulse"
             style={{ background: 'var(--color-terminal-surface)', border: `1px solid ${BORDER}`, borderLeft: '3px solid #3fff8b33' }}>
            <div className="p-4 space-y-3">
                <div className="h-3 w-1/2 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-20 rounded"      style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-3 w-3/4 rounded" style={{ background: 'var(--color-skeleton)' }} />
                <div className="h-3 w-2/3 rounded" style={{ background: 'var(--color-skeleton)' }} />
            </div>
        </div>
    );
}

function relSlot(slot) {
    if (!slot) return '';
    const slots = ['09:00', '13:00', '17:00', '21:00'];
    const idx = slots.indexOf(slot);
    const next = slots[idx + 1];
    return next ? `↺ ${next}` : '↺ Yarın 09:00';
}

export default function DailySummaryPanel() {
    const { data, loading } = useDigest();

    if (loading) return <SkeletonPanel />;

    return (
        <div className="rounded-xl overflow-hidden flex flex-col"
             style={{
                 background:  'var(--color-terminal-surface)',
                 border:      `1px solid ${BORDER}`,
                 borderLeft:  '3px solid #3fff8b55',
             }}>

            <div className="flex items-center gap-2 px-4 pt-4 pb-3"
                 style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#3fff8b' }} />
                <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    Günün Özeti
                </span>
                {data && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#3fff8b15', color: '#3fff8b', border: '1px solid #3fff8b33' }}>
                        Canlı
                    </span>
                )}
            </div>

            {!data ? (
                <div className="px-4 py-6 text-center">
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                        Özet hazırlanıyor…<br />
                        <span style={{ opacity: 0.5 }}>İlk özet 09:00'da gelir</span>
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                        <Clock className="w-3 h-3 shrink-0" style={{ color: '#3fff8b', opacity: 0.7 }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#3fff8b', opacity: 0.8 }}>
                            {data.slot} · Gemini Özeti
                        </span>
                    </div>

                    <p className="px-4 py-2 text-[12px] leading-relaxed"
                       style={{ color: 'var(--color-text-secondary)' }}>
                        {data.summary_text}
                    </p>

                    {data.topics?.length > 0 && (
                        <div className="px-4 pb-3 flex flex-col gap-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                               style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                Öne Çıkan Konular
                            </p>
                            {data.topics.map((t, i) => (
                                <div key={i}
                                     className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                                     style={{
                                         background:  '#3fff8b0a',
                                         border:      '1px solid #3fff8b1a',
                                         color:       'var(--color-text-secondary)',
                                     }}>
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3fff8b44' }} />
                                    {t}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="px-4 pb-4 pt-1 flex justify-between items-center"
                         style={{ borderTop: `1px solid ${BORDER}` }}>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                            {data.article_count} haber analiz edildi
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: '#3fff8b', opacity: 0.5 }}>
                            {relSlot(data.slot)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
