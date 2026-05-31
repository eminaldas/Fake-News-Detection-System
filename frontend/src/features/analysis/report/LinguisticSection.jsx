import React from 'react';

const TONE_CONFIG = {
    neutral:    { label: 'Nötr',     color: '#71717a' },
    fear:       { label: 'Korku',    color: '#ef4444' },
    anger:      { label: 'Öfke',     color: '#f97316' },
    excitement: { label: 'Heyecan', color: '#eab308' },
    sadness:    { label: 'Üzüntü',  color: '#60a5fa' },
};

const READ_CONFIG = {
    academic:    { label: 'Akademik',    color: '#60a5fa' },
    standard:    { label: 'Standart',    color: '#3fff8b' },
    sensational: { label: 'Sensasyonel', color: '#ff7351' },
};

export default function LinguisticSection({ linguistic }) {
    if (!linguistic) return null;
    const tone    = TONE_CONFIG[linguistic.emotion_tone] || TONE_CONFIG.neutral;
    const read    = READ_CONFIG[linguistic.readability]  || READ_CONFIG.standard;
    const density = Math.round((linguistic.manipulation_density || 0) * 100);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-surface-solid border border-brutal-border">
                <span
                    className="text-[9px] font-bold uppercase tracking-widest block mb-2"
                    style={{ color: 'var(--color-text-muted-accent)' }}
                >
                    Duygu Tonu
                </span>
                <span className="text-sm font-bold" style={{ color: tone.color }}>{tone.label}</span>
            </div>
            <div className="p-4 bg-surface-solid border border-brutal-border">
                <span
                    className="text-[9px] font-bold uppercase tracking-widest block mb-2"
                    style={{ color: 'var(--color-text-muted-accent)' }}
                >
                    Okunabilirlik
                </span>
                <span className="text-sm font-bold" style={{ color: read.color }}>{read.label}</span>
            </div>
            <div className="p-4 bg-surface-solid border border-brutal-border">
                <span
                    className="text-[9px] font-bold uppercase tracking-widest block mb-2"
                    style={{ color: 'var(--color-text-muted-accent)' }}
                >
                    Manipülasyon
                </span>
                <span className="text-2xl font-black font-manrope" style={{ color: density > 50 ? '#ff7351' : '#3fff8b' }}>
                    %{density}
                </span>
                <div className="h-1.5 border border-brutal-border mt-2 overflow-hidden">
                    <div className="h-full transition-all duration-700"
                         style={{ width: `${density}%`, background: density > 50 ? '#ff7351' : '#3fff8b' }} />
                </div>
            </div>
        </div>
    );
}
