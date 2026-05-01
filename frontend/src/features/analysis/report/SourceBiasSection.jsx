import React from 'react';
import { Users } from 'lucide-react';

const STANCE_LABEL = {
    confirms: { label: 'Doğruluyor', color: '#3fff8b' },
    refutes:  { label: 'Çürütüyor',  color: '#ff7351' },
    neutral:  { label: 'Tarafsız',   color: '#71717a' },
};

export default function SourceBiasSection({ sourceAnalysis }) {
    if (!sourceAnalysis?.sources_found?.length && !sourceAnalysis?.bias_summary) return null;

    const sources = sourceAnalysis.sources_found ?? [];
    const diversity = sourceAnalysis.source_diversity_score ?? null;

    const diversityColor = diversity === null ? '#71717a'
        : diversity >= 0.6 ? '#3fff8b'
        : diversity >= 0.3 ? '#f59e0b'
        : '#ff7351';

    const diversityLabel = diversity === null ? 'Bilinmiyor'
        : diversity >= 0.6 ? 'Çeşitli'
        : diversity >= 0.3 ? 'Sınırlı'
        : 'Tek yönlü';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="font-manrope font-bold text-base text-tx-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-tx-secondary" />
                    Kaynak Analizi
                </h2>
                {diversity !== null && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                          style={{ color: diversityColor, background: `${diversityColor}22`, border: `1px solid ${diversityColor}44` }}>
                        {diversityLabel} · %{Math.round(diversity * 100)}
                    </span>
                )}
            </div>

            {/* Bias özeti */}
            {sourceAnalysis.bias_summary && (
                <div className="rounded-xl p-4 border border-brutal-border/30 bg-surface-solid">
                    <p className="text-tx-secondary text-sm leading-relaxed">{sourceAnalysis.bias_summary}</p>
                </div>
            )}

            {/* Kaynak listesi */}
            {sources.length > 0 && (
                <div className="rounded-xl border border-brutal-border/20 overflow-hidden">
                    <div className="grid grid-cols-12 px-4 py-2 bg-surface-container-high/40 border-b border-brutal-border/20">
                        <span className="col-span-5 text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60">Kaynak</span>
                        <span className="col-span-3 text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60">Duruş</span>
                        <span className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60">Eğilim</span>
                        <span className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60">Tarih</span>
                    </div>
                    {sources.slice(0, 8).map((s, i) => {
                        const stanceCfg = STANCE_LABEL[s.stance] ?? STANCE_LABEL.neutral;
                        const lean = s.political_lean;
                        const leanLabel = lean === null || lean === undefined ? '—'
                            : lean > 0.5 ? 'Sağ'
                            : lean < -0.5 ? 'Sol'
                            : 'Merkez';
                        const leanColor = lean === null || lean === undefined ? '#71717a'
                            : Math.abs(lean) > 0.5 ? '#f59e0b' : '#71717a';
                        const govFlag = s.government_aligned;

                        return (
                            <div key={i}
                                 className="grid grid-cols-12 px-4 py-2.5 border-b border-brutal-border/10 last:border-b-0 hover:bg-surface-container-high/20 transition-colors">
                                <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                                    {govFlag && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Devlet yanlısı" />
                                    )}
                                    <span className="text-tx-primary text-xs font-medium truncate">
                                        {s.name || s.domain || '—'}
                                    </span>
                                </div>
                                <div className="col-span-3 flex items-center">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                          style={{ color: stanceCfg.color, background: `${stanceCfg.color}18` }}>
                                        {stanceCfg.label}
                                    </span>
                                </div>
                                <div className="col-span-2 flex items-center">
                                    <span className="text-[10px] font-medium" style={{ color: leanColor }}>
                                        {leanLabel}
                                    </span>
                                </div>
                                <div className="col-span-2 flex items-center">
                                    <span className="text-tx-secondary/50 text-[10px]">
                                        {s.pub_date ? s.pub_date.slice(0, 10) : '—'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
