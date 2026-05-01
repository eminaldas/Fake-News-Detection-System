import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerdictExplanationSection({ verdictExplanation }) {
    if (!verdictExplanation?.primary_reason) return null;

    const { primary_reason, supporting_points = [], contradicting_evidence = [] } = verdictExplanation;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-manrope font-bold text-base text-tx-primary">
                Karar Gerekçesi
            </h2>

            {/* Ana gerekçe */}
            <div className="rounded-2xl p-5 bg-surface-container-high/30 border border-brutal-border/20">
                <p className="text-tx-primary text-sm leading-relaxed font-medium">
                    {primary_reason}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destekleyen noktalar */}
                {supporting_points.length > 0 && (
                    <div className="rounded-xl p-4 border border-brutal-border/30 bg-surface-solid flex flex-col gap-3">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-tx-secondary flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-es-primary" />
                            Destekleyen Kanıtlar
                        </span>
                        <ul className="flex flex-col gap-2">
                            {supporting_points.map((point, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-es-primary mt-1.5 shrink-0" />
                                    <span className="text-tx-secondary text-xs leading-relaxed">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Çelişen kanıtlar */}
                {contradicting_evidence.length > 0 && (
                    <div className="rounded-xl p-4 border border-brutal-border/30 bg-surface-solid flex flex-col gap-3">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-tx-secondary flex items-center gap-1.5">
                            <XCircle className="w-3 h-3 text-es-error" />
                            Çelişen Bilgiler
                        </span>
                        <ul className="flex flex-col gap-2">
                            {contradicting_evidence.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-es-error mt-1.5 shrink-0" />
                                    <span className="text-tx-secondary text-xs leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
