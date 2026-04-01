import React from 'react';
import { DISPLAY_THRESHOLD } from './signalConfig';

const SIGNAL_CONFIG = [
    { key: 'clickbait_score',   label: 'Clickbait',            norm: v => v * 100,        color: null },
    { key: 'exclamation_ratio', label: 'Ünlem Oranı',          norm: v => v * 100,        color: null },
    { key: 'uppercase_ratio',   label: 'Büyük Harf',           norm: v => v * 100,        color: null },
    { key: 'hedge_ratio',       label: 'Belirsiz Dil',         norm: v => v * 100,        color: null },
    { key: 'question_density',  label: 'Soru Yoğunluğu',       norm: v => v * 100,        color: null },
    { key: 'number_density',    label: 'Sayı Yoğunluğu',       norm: v => v * 100,        color: null },
    { key: 'avg_word_length',   label: 'Kelime Uzunluğu',      norm: v => (v / 10) * 100, color: null, shouldShow: v => v < 5.5 },
    { key: 'source_score',      label: 'Kaynak Güvenilirliği', norm: v => v * 100,        color: 'green' },
];

// Kaynak güvenilirliği her zaman yeşil (pozitif sinyal)
const SOURCE_HEX = '#3fff8b';

const SignalPanel = ({ signals, theme, maxSignals = null }) => {
    if (!signals) return null;

    let visibleSignals = SIGNAL_CONFIG.filter(({ key, shouldShow }) => {
        const value = signals[key] ?? 0;
        if (shouldShow) return shouldShow(value);
        return value > DISPLAY_THRESHOLD;
    });

    if (maxSignals !== null) {
        visibleSignals = visibleSignals
            .sort((a, b) => {
                const va = Math.min(a.norm(signals[a.key] || 0), 100);
                const vb = Math.min(b.norm(signals[b.key] || 0), 100);
                return vb - va;
            })
            .slice(0, maxSignals);
    }

    if (visibleSignals.length === 0) return null;

    return (
        <div>
            <p className="text-tx-secondary text-[10px] font-bold tracking-widest uppercase mb-3">
                Tespit Edilen Sinyaller
            </p>
            {/* Bento grid: 1 kolon mobil, 3 kolon geniş */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {visibleSignals.map(({ key, label, norm, color }) => {
                    const rawValue  = signals[key] || 0;
                    const barWidth  = Math.min(norm(rawValue), 100).toFixed(1);
                    const displayPct = Math.round(parseFloat(barWidth));
                    const isGreen   = color === 'green';

                    const accentHex  = isGreen ? SOURCE_HEX : theme.hex;
                    const valueColor = isGreen ? '#3fff8b' : theme.hex;
                    const barFill    = accentHex;
                    const barTrack   = `${accentHex}26`; // ~15% opacity

                    return (
                        <div
                            key={key}
                            className="rounded-xl p-4 sm:p-5"
                            style={{
                                background: 'var(--color-bg-surface)',
                                border: `1px solid ${barFill}22`,
                            }}
                        >
                            <span className="text-tx-secondary text-[10px] font-bold tracking-widest uppercase block mb-3">
                                {label}
                            </span>
                            <div className="flex items-end gap-2 mb-2">
                                <span
                                    className="text-2xl font-manrope font-black leading-none"
                                    style={{ color: valueColor }}
                                >
                                    %{displayPct}
                                </span>
                            </div>
                            <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: barTrack }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${barWidth}%`, background: barFill }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SignalPanel;
