import React from 'react';
import { Globe } from 'lucide-react';

export default function SourceSection({ sourceProfile }) {
    if (!sourceProfile?.domain) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                Kaynak Derinlemesi
            </h3>
            <div className="rounded-xl p-4 border border-brutal-border/40 bg-surface-solid flex items-start gap-3">
                <Globe className="w-4 h-4 mt-0.5 text-tx-secondary shrink-0" />
                <div>
                    <p className="text-tx-primary text-sm font-bold">{sourceProfile.domain}</p>
                    {sourceProfile.reliability_note && (
                        <p className="text-tx-secondary text-xs leading-relaxed mt-1">{sourceProfile.reliability_note}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
