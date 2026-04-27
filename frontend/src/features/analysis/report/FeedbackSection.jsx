import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';

const STATE = { idle: 'idle', loading: 'loading', done: 'done', rejected: 'rejected', already: 'already' };

const VOTES = [
    { type: 'authentic',   label: 'Gerçek',  icon: ThumbsUp,   color: '#3fff8b' },
    { type: 'suspicious',  label: 'Şüpheli', icon: HelpCircle, color: '#f59e0b' },
    { type: 'investigate', label: 'Araştır', icon: ThumbsDown, color: '#ff7351' },
];

export default function FeedbackSection({ taskId, forumThreadId }) {
    const [fbState,   setFbState]   = useState(STATE.idle);
    const [chosen,    setChosen]    = useState(null);
    const [voteState, setVoteState] = useState(STATE.idle);

    const submitFeedback = async (label) => {
        if (fbState !== STATE.idle) return;
        setFbState(STATE.loading);
        setChosen(label);
        try {
            await AnalysisService.submitFeedback(taskId, label);
            setFbState(STATE.done);
        } catch (err) {
            const s = err?.response?.status;
            if (s === 409) setFbState(STATE.already);
            else if (s === 422) setFbState(STATE.rejected);
            else setFbState(STATE.idle);
        }
    };

    const submitVote = async (voteType) => {
        if (voteState !== STATE.idle || !forumThreadId) return;
        setVoteState(STATE.loading);
        try {
            await AnalysisService.voteThread(forumThreadId, voteType);
            setVoteState(STATE.done);
        } catch (err) {
            const s = err?.response?.status;
            if (s === 409) setVoteState(STATE.already);
            else setVoteState(STATE.idle);
        }
    };

    return (
        <div className="rounded-2xl border border-brutal-border/20 bg-surface-container-high/20 p-6 flex flex-col gap-6">
            {/* Model feedback */}
            <div className="flex flex-col items-center gap-4 text-center">
                <div>
                    <h3 className="font-manrope font-bold text-base text-tx-primary mb-1">Bu analiz doğru mu?</h3>
                    <p className="text-tx-secondary/60 text-xs">Geri bildiriminiz modelin gelişmesine katkı sağlar.</p>
                </div>

                {fbState === STATE.idle || fbState === STATE.loading ? (
                    <div className="flex flex-wrap justify-center gap-3">
                        <button disabled={fbState === STATE.loading} onClick={() => submitFeedback('AUTHENTIC')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-manrope font-bold text-sm transition-all disabled:opacity-50"
                            style={{ background: '#3fff8b22', color: '#3fff8b', border: '1px solid #3fff8b44' }}>
                            <ThumbsUp className="w-4 h-4" /> Doğru Analiz
                        </button>
                        <button disabled={fbState === STATE.loading} onClick={() => submitFeedback('FAKE')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-manrope font-bold text-sm transition-all disabled:opacity-50 border border-brutal-border/30 text-tx-secondary hover:text-tx-primary">
                            <ThumbsDown className="w-4 h-4" /> Hatalı Analiz
                        </button>
                    </div>
                ) : fbState === STATE.done ? (
                    <p className="flex items-center gap-2 text-sm font-medium" style={{ color: '#3fff8b' }}>
                        <CheckCircle2 className="w-4 h-4" />
                        {chosen === 'AUTHENTIC' ? 'Doğru analiz olarak işaretlendi.' : 'Hatalı analiz bildirimi alındı.'} Teşekkürler!
                    </p>
                ) : fbState === STATE.already ? (
                    <p className="flex items-center gap-2 text-sm text-tx-secondary/60">
                        <AlertCircle className="w-4 h-4" /> Bu analiz için zaten geri bildirim göndermişsiniz.
                    </p>
                ) : fbState === STATE.rejected ? (
                    <p className="flex items-center gap-2 text-sm text-tx-secondary/60">
                        <AlertCircle className="w-4 h-4" /> Model yüksek güvenle emin, düzeltme kabul edilmiyor.
                    </p>
                ) : null}
            </div>

            {/* Forum oyları — sadece forum_thread_id varsa */}
            {forumThreadId && (
                <div className="border-t border-brutal-border/20 pt-5 flex flex-col items-center gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">Topluluk Değerlendirmesi</p>
                    {voteState === STATE.done ? (
                        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: '#3fff8b' }}>
                            <CheckCircle2 className="w-4 h-4" /> Oyunuz kaydedildi.
                        </p>
                    ) : voteState === STATE.already ? (
                        <p className="flex items-center gap-2 text-sm text-tx-secondary/60">
                            <AlertCircle className="w-4 h-4" /> Bu thread için zaten oy kullandınız.
                        </p>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-2">
                            {VOTES.map((vote) => (
                                <button
                                    key={vote.type}
                                    disabled={voteState === STATE.loading}
                                    onClick={() => submitVote(vote.type)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                    style={{ color: vote.color, background: `${vote.color}15`, border: `1px solid ${vote.color}33` }}
                                >
                                    <vote.icon className="w-3.5 h-3.5" />
                                    {vote.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
