import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, AlertCircle } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';

const STATE = { idle: 'idle', loading: 'loading', done: 'done', rejected: 'rejected', already: 'already' };

export default function FeedbackSection({ taskId }) {
    const [state,   setState]   = useState(STATE.idle);
    const [chosen,  setChosen]  = useState(null);

    const submit = async (label) => {
        if (state !== STATE.idle) return;
        setState(STATE.loading);
        setChosen(label);
        try {
            await AnalysisService.submitFeedback(taskId, label);
            setState(STATE.done);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 409) setState(STATE.already);
            else if (status === 422) setState(STATE.rejected);
            else setState(STATE.idle);
        }
    };

    return (
        <div className="rounded-2xl border border-brutal-border/20 bg-surface-container-high/20 p-6 flex flex-col items-center gap-5 text-center">
            <div>
                <h3 className="font-manrope font-bold text-base text-tx-primary mb-1">
                    Bu analiz doğru mu?
                </h3>
                <p className="text-tx-secondary/60 text-xs">
                    Geri bildiriminiz modelin gelişmesine katkı sağlar.
                </p>
            </div>

            {state === STATE.idle || state === STATE.loading ? (
                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        disabled={state === STATE.loading}
                        onClick={() => submit('AUTHENTIC')}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-manrope font-bold text-sm transition-all disabled:opacity-50"
                        style={{ background: '#3fff8b22', color: '#3fff8b', border: '1px solid #3fff8b44' }}
                    >
                        <ThumbsUp className="w-4 h-4" />
                        Doğru Analiz
                    </button>
                    <button
                        disabled={state === STATE.loading}
                        onClick={() => submit('FAKE')}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-manrope font-bold text-sm transition-all disabled:opacity-50 border border-brutal-border/30 text-tx-secondary hover:text-tx-primary hover:border-brutal-border/60"
                    >
                        <ThumbsDown className="w-4 h-4" />
                        Hatalı Analiz
                    </button>
                </div>
            ) : state === STATE.done ? (
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#3fff8b' }}>
                    <CheckCircle2 className="w-4 h-4" />
                    {chosen === 'AUTHENTIC' ? 'Doğru analiz olarak işaretlendi. Teşekkürler!' : 'Hatalı analiz bildirimi alındı. Teşekkürler!'}
                </div>
            ) : state === STATE.already ? (
                <div className="flex items-center gap-2 text-sm text-tx-secondary/60">
                    <AlertCircle className="w-4 h-4" />
                    Bu analiz için zaten geri bildirim göndermişsiniz.
                </div>
            ) : state === STATE.rejected ? (
                <div className="flex items-center gap-2 text-sm text-tx-secondary/60">
                    <AlertCircle className="w-4 h-4" />
                    Model bu sonuçtan yüksek güvenle emin, düzeltme kabul edilmiyor.
                </div>
            ) : null}
        </div>
    );
}
