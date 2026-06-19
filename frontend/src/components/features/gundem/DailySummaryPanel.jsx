import React from 'react';
import { Sparkles, Clock, ChevronRight } from 'lucide-react';
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
            <div className="px-5 py-4 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                        <div className="h-3 w-28 rounded" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="h-3 rounded" style={{ background: 'var(--color-skeleton)' }} />
                        <div className="h-3 w-4/5 rounded" style={{ background: 'var(--color-skeleton)' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function relSlot(slot) {
    const slots = ['09:00', '13:00', '17:00', '21:00'];
    const next = slots[slots.indexOf(slot) + 1];
    return next ? `Sonraki güncelleme ${next}` : 'Yarın 09:00\'da güncellenir';
}

function parseDigestText(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.summary || parsed.sections)) return parsed;
    } catch { /* eski format */ }
    return { summary: raw, sections: [] };
}

export default function DailySummaryPanel() {
    const { data, loading } = useDigest();

    const parsed = data?.summary_text ? parseDigestText(data.summary_text) : null;

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
                    <span className="text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1.5"
                          style={{ color: TEXT_MUT, border: `1px solid ${BORDER}` }}>
                        <Clock className="w-3 h-3" />
                        {data.slot}
                    </span>
                )}
            </div>

            {!data || !parsed ? (
                <div className="px-5 py-8 text-center">
                    <p className="text-sm" style={{ color: TEXT_MUT }}>
                        Özet hazırlanıyor…<br />
                        <span className="text-xs">İlk özet 09:00'da gelir</span>
                    </p>
                </div>
            ) : (
                <div className="flex flex-col">
                    {/* Genel özet */}
                    {parsed.summary && (
                        <p className="px-5 pt-4 pb-3 text-sm leading-relaxed animate-fade-up"
                           style={{ color: TEXT_SEC, animationDelay: '60ms', borderBottom: `1px solid ${BORDER}` }}>
                            {parsed.summary}
                        </p>
                    )}

                    {/* Kategorili bölümler */}
                    {parsed.sections?.length > 0 && (
                        <div className="flex flex-col">
                            {parsed.sections.map((sec, i) => (
                                <div key={i}
                                     className="px-5 py-3 animate-fade-up"
                                     style={{
                                         borderBottom: i < parsed.sections.length - 1 ? `1px solid ${BORDER}` : 'none',
                                         animationDelay: `${100 + i * 60}ms`,
                                     }}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: GREEN_DIM }}>
                                            {sec.title}
                                        </span>
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC, paddingLeft: 20 }}>
                                        {sec.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Konu etiketleri */}
                    {data.topics?.length > 0 && (
                        <div className="px-5 pt-3 pb-4 flex flex-wrap gap-2 animate-fade-up border-t"
                             style={{ borderColor: BORDER, animationDelay: `${100 + (parsed.sections?.length || 0) * 60}ms` }}>
                            {data.topics.map((t, i) => (
                                <span key={i}
                                      className="text-[11px] font-medium px-2 py-1"
                                      style={{ background: `${GREEN}0f`, border: `1px solid ${GREEN}22`, color: TEXT_SEC }}>
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-5 pb-4 pt-3 flex justify-between items-center border-t animate-fade-up"
                         style={{ borderColor: BORDER }}>
                        <span className="text-[11px]" style={{ color: TEXT_MUT }}>
                            {data.article_count} haber analiz edildi
                        </span>
                        <span className="text-[11px]" style={{ color: TEXT_MUT }}>
                            {relSlot(data.slot)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
