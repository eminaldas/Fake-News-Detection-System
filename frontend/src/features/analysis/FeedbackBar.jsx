import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { trackInteraction } from '../../services/interaction.service';

export default function FeedbackBar({ result }) {
    const [state,  setState]  = useState('idle'); // idle | asking_reason | sent
    const [reason, setReason] = useState('');

    if (!result) return null;

    const handlePositive = async () => {
        if (state !== 'idle') return;
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_positive' });
    };

    const handleNegative = () => {
        if (state !== 'idle') return;
        setState('asking_reason');
    };

    const handleSubmit = async () => {
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_negative', note: reason });
    };

    if (state === 'sent') return (
        <div className="mt-4 flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs text-tx-secondary"
             style={{ animation: 'fadeIn 0.3s ease' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-es-primary" />
            <span>Geri bildirim alındı, teşekkürler.</span>
        </div>
    );

    if (state === 'asking_reason') return (
        <div className="mt-4 flex flex-col gap-3 px-4 py-3 rounded-xl border border-brutal-border bg-base"
             style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">
                Neyi eksik buldun? <span className="normal-case font-normal">(opsiyonel)</span>
            </label>
            <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Yazabilirsin..."
                className="w-full rounded-xl border border-brutal-border/30 bg-surface-container-high/30 text-tx-primary text-sm p-3 resize-none placeholder:text-tx-secondary/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    className="px-5 py-2 rounded-xl font-manrope font-bold text-[11px] uppercase tracking-wider transition-all hover:opacity-85"
                    style={{ background: '#3fff8b22', color: '#3fff8b', border: '1px solid #3fff8b44' }}
                >
                    Gönder
                </button>
            </div>
        </div>
    );

    return (
        <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-brutal-border bg-base"
             style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
            <span className="text-xs text-tx-secondary font-medium">Bu analiz faydalı mıydı?</span>
            <div className="flex gap-2">
                <button
                    onClick={handlePositive}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-manrope font-bold text-[11px] uppercase tracking-wider hover:bg-authentic-bg hover:text-authentic-text hover:border-authentic-border transition-all duration-200"
                >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Evet
                </button>
                <button
                    onClick={handleNegative}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-manrope font-bold text-[11px] uppercase tracking-wider hover:bg-fake-bg hover:text-fake-text hover:border-fake-border transition-all duration-200"
                >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Hayır
                </button>
            </div>
        </div>
    );
}
