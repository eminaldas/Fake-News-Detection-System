import React from 'react';
import { Clock } from 'lucide-react';

export default function TimeContextSection({ timeContext }) {
    if (!timeContext?.relevant || !timeContext?.note) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                Zaman Bağlamı
            </h3>
            <div className="rounded-xl p-4 border border-blue-500/30 bg-blue-500/10 flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                <p className="text-tx-secondary text-sm leading-relaxed">{timeContext.note}</p>
            </div>
        </div>
    );
}
