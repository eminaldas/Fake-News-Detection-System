import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function PropagandaSection({ techniques }) {
    if (!techniques?.length) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                Propaganda Teknikleri
            </h3>
            <div className="flex flex-wrap gap-2">
                {techniques.map((t, i) => (
                    <PropagandaBadge key={i} technique={t.technique} explanation={t.explanation} />
                ))}
            </div>
        </div>
    );
}

function PropagandaBadge({ technique, explanation }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-amber-500/10">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 text-amber-500 text-xs font-bold w-full text-left"
            >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {technique}
                {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {open && explanation && (
                <p className="px-3 pb-3 text-xs text-tx-secondary leading-relaxed">{explanation}</p>
            )}
        </div>
    );
}
