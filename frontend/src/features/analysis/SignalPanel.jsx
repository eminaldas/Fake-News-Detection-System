import React from 'react';
import { DISPLAY_THRESHOLD } from './signalConfig';

const SIGNAL_CONFIG = [
    { key: 'clickbait_score',   label: 'Clickbait',             norm: v => v * 100,        color: null },
    { key: 'exclamation_ratio', label: 'Ünlem Oranı',           norm: v => v * 100,        color: null },
    { key: 'uppercase_ratio',   label: 'Büyük Harf',            norm: v => v * 100,        color: null },
    { key: 'hedge_ratio',       label: 'Belirsiz Dil',          norm: v => v * 100,        color: null },
    { key: 'question_density',  label: 'Soru Yoğunluğu',        norm: v => v * 100,        color: null },
    { key: 'number_density',    label: 'Sayı Yoğunluğu',        norm: v => v * 100,        color: null },
    { key: 'avg_word_length',   label: 'Kelime Uzunluğu',       norm: v => (v / 10) * 100, color: null },
    { key: 'source_score',      label: 'Kaynak Güvenilirliği',  norm: v => v * 100,        color: 'green' },
];

const SignalPanel = ({ signals, theme }) => {
    if (!signals) return null;

    const visibleSignals = SIGNAL_CONFIG.filter(
        ({ key }) => (signals[key] || 0) > DISPLAY_THRESHOLD
    );

    if (visibleSignals.length === 0) return null;

    return (
        <div className="mt-4 mb-2">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2 ${theme.title}`}>
                Tespit Edilen Sinyaller
            </p>
            <div className="flex flex-col gap-2">
                {visibleSignals.map(({ key, label, norm, color }) => {
                    const rawValue = signals[key] || 0;
                    const barWidth = Math.min(norm(rawValue), 100).toFixed(1);
                    const displayPct = Math.round(parseFloat(barWidth));
                    const isGreen = color === 'green';

                    return (
                        <div key={key} className="flex items-center gap-2">
                            <span className={`text-[11px] font-medium w-36 shrink-0 ${theme.title} opacity-70`}>
                                {label}
                            </span>
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme.progressBg}`}>
                                <div
                                    className={`h-full rounded-full ${isGreen ? 'bg-green-500' : theme.progressFill}`}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                            <span className={`text-[11px] font-bold w-8 text-right ${isGreen ? 'text-green-600 dark:text-green-400' : theme.title}`}>
                                %{displayPct}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SignalPanel;
