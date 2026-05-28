import React from 'react';
import { Link2, FileText } from 'lucide-react';

export function TypeBadge({ type }) {
    return type === 'url'
        ? <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 border border-blue-500/30 text-blue-400 uppercase tracking-wider shrink-0">
              <Link2 className="w-2.5 h-2.5" /> URL
          </span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 border border-purple-500/30 text-purple-400 uppercase tracking-wider shrink-0">
              <FileText className="w-2.5 h-2.5" /> METİN
          </span>;
}

export function PredictionBadge({ prediction }) {
    if (!prediction) return null;
    const map = {
        FAKE:      { label: 'Yanıltıcı', color: '#ff7351' },
        AUTHENTIC: { label: 'Güvenilir', color: '#3fff8b' },
        UNCERTAIN: { label: 'Belirsiz',  color: '#f59e0b' },
    };
    const { label, color } = map[prediction] ?? { label: prediction, color: '#7d8896' };
    return (
        <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 border shrink-0"
            style={{ color, borderColor: color + '40' }}
        >
            {label}
        </span>
    );
}
