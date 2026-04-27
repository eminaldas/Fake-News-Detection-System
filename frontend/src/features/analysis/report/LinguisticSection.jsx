import React from 'react';

const TONE_CONFIG = {
    neutral:    { label: 'Nötr',     color: '#71717a', emoji: '😐' },
    fear:       { label: 'Korku',    color: '#ef4444', emoji: '😨' },
    anger:      { label: 'Öfke',     color: '#f97316', emoji: '😠' },
    excitement: { label: 'Heyecan', color: '#eab308', emoji: '😮' },
    sadness:    { label: 'Üzüntü',  color: '#60a5fa', emoji: '😢' },
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
        <div className="space-y-3">
            <h2 className="font-manrope font-bold text-base text-tx-primary">
                Dilbilimsel Analiz
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-4 bg-surface-solid border border-brutal-border/40">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60 block mb-2">Duygu Tonu</span>
                    <span className="text-2xl mr-2">{tone.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: tone.color }}>{tone.label}</span>
                </div>
                <div className="rounded-xl p-4 bg-surface-solid border border-brutal-border/40">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60 block mb-2">Okunabilirlik</span>
                    <span className="text-sm font-bold" style={{ color: read.color }}>{read.label}</span>
                </div>
                <div className="rounded-xl p-4 bg-surface-solid border border-brutal-border/40">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-tx-secondary/60 block mb-2">Manipülasyon</span>
                    <span className="text-2xl font-black font-manrope" style={{ color: density > 50 ? '#ff7351' : '#3fff8b' }}>
                        %{density}
                    </span>
                    <div className="h-1.5 rounded-full bg-brutal-border/30 mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                             style={{ width: `${density}%`, background: density > 50 ? '#ff7351' : '#3fff8b' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
