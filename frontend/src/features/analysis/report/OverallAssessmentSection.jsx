import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function OverallAssessmentSection({ text }) {
    if (!text) return null;
    return (
        <div className="rounded-xl p-5 border border-brutal-border/40 bg-surface-solid">
            <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-tx-secondary" />
                <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                    Genel Değerlendirme
                </h3>
            </div>
            <p className="text-tx-primary text-sm leading-relaxed">{text}</p>
        </div>
    );
}
