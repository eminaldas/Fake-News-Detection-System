import React, { useState } from 'react';
import { trackInteraction } from '../../services/interaction.service';

/**
 * Analiz tamamlandıktan sonra gösterilen geri bildirim çubuğu.
 * Feedback analizin faydalı olup olmadığını yakalar.
 */
export default function FeedbackBar({ result }) {
    const [state, setState] = useState('idle'); // idle | sent

    if (!result) return null;

    const handleFeedback = async (type) => {
        if (state !== 'idle') return;
        setState('sent');
        await trackInteraction({
            content_id:       null,
            interaction_type: type,   // feedback_positive | feedback_negative
        });
    };

    if (state === 'sent') {
        return (
            <div
                className="mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs text-tx-secondary"
                style={{ animation: 'fadeIn 0.3s ease' }}
            >
                <span>✓</span>
                <span>Geri bildirim alındı, teşekkürler.</span>
            </div>
        );
    }

    return (
        <div
            className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-brutal-border bg-base"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}
        >
            <span className="text-xs text-tx-secondary font-medium">Bu analiz faydalı mıydı?</span>
            <div className="flex gap-2">
                <button
                    onClick={() => handleFeedback('feedback_positive')}
                    className="px-3 py-1.5 rounded-lg text-sm hover:bg-authentic-bg hover:text-authentic-text border border-transparent hover:border-authentic-border transition-all duration-200"
                    title="Faydalıydı"
                >
                    👍
                </button>
                <button
                    onClick={() => handleFeedback('feedback_negative')}
                    className="px-3 py-1.5 rounded-lg text-sm hover:bg-fake-bg hover:text-fake-text border border-transparent hover:border-fake-border transition-all duration-200"
                    title="Faydalı değildi"
                >
                    👎
                </button>
            </div>
        </div>
    );
}
