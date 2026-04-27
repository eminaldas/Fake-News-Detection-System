import React from 'react';
import { Globe } from 'lucide-react';

export default function SourceCredibilitySection({ text }) {
    if (!text) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                Kaynak Değerlendirmesi
            </h3>
            <div className="rounded-xl p-4 border border-brutal-border/40 bg-surface-solid flex gap-3">
                <Globe className="w-4 h-4 text-tx-secondary/50 shrink-0 mt-0.5" />
                <p className="text-tx-secondary text-sm leading-relaxed">{text}</p>
            </div>
        </div>
    );
}
