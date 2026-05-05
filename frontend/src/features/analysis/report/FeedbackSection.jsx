import React, { useState } from 'react';
import AnalysisService from '../../../services/analysis.service';

const STATE = { idle: 'idle', loading: 'loading', done: 'done', rejected: 'rejected', already: 'already' };

const VOTES = [
    { type: 'authentic',   label: 'GERÇEK'  },
    { type: 'suspicious',  label: 'ŞÜPHELİ' },
    { type: 'investigate', label: 'ARAŞTIR' },
];

export default function FeedbackSection({ taskId, forumThreadId }) {
    const [fbState,   setFbState]   = useState(() =>
        localStorage.getItem(`fnds_fb_${taskId}`) ? STATE.done : STATE.idle
    );
    const [chosen,    setChosen]    = useState(null);
    const [voteState, setVoteState] = useState(() =>
        localStorage.getItem(`fnds_vote_${taskId}`) ? STATE.done : STATE.idle
    );

    const submitFeedback = async (label) => {
        if (fbState !== STATE.idle) return;
        setFbState(STATE.loading);
        setChosen(label);
        try {
            await AnalysisService.submitFeedback(taskId, label);
            setFbState(STATE.done);
            localStorage.setItem(`fnds_fb_${taskId}`, label);
        } catch (err) {
            const s = err?.response?.status;
            if (s === 409) {
                setFbState(STATE.already);
                localStorage.setItem(`fnds_fb_${taskId}`, label);
            } else if (s === 422) {
                setFbState(STATE.rejected);
            } else {
                setFbState(STATE.idle);
            }
        }
    };

    const submitVote = async (voteType) => {
        if (voteState !== STATE.idle || !forumThreadId) return;
        setVoteState(STATE.loading);
        try {
            await AnalysisService.voteThread(forumThreadId, voteType);
            setVoteState(STATE.done);
            localStorage.setItem(`fnds_vote_${taskId}`, voteType);
        } catch (err) {
            const s = err?.response?.status;
            if (s === 409) {
                setVoteState(STATE.already);
                localStorage.setItem(`fnds_vote_${taskId}`, voteType);
            } else {
                setVoteState(STATE.idle);
            }
        }
    };

    return (
        <div
            className="flex flex-col"
            style={{
                background: 'var(--color-terminal-surface)',
                border: '1px solid var(--color-terminal-border-raw)',
            }}
        >
            {/* ── Model Feedback ── */}
            <div className="relative pt-6 pb-5 px-5">
                {/* Fieldset-style başlık */}
                <span
                    className="absolute -top-px left-5 px-2 font-mono text-[10px] uppercase tracking-widest"
                    style={{
                        background: 'var(--color-terminal-surface)',
                        color: 'var(--color-terminal-border-raw)',
                    }}
                >
                    // FEEDBACK
                </span>

                <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-tx-secondary, #8899aa)' }}>
                    Bu analiz doğru mu? Geri bildiriminiz modelin gelişmesine katkı sağlar.
                </p>

                {fbState === STATE.idle || fbState === STATE.loading ? (
                    <div className="flex flex-wrap gap-3">
                        <button
                            disabled={fbState === STATE.loading}
                            onClick={() => submitFeedback('AUTHENTIC')}
                            className="font-mono text-xs uppercase tracking-widest px-4 py-2 transition-opacity disabled:opacity-40"
                            style={{
                                border: '1px solid var(--color-terminal-border-raw)',
                                color: 'var(--color-terminal-border-raw)',
                                background: 'transparent',
                            }}
                        >
                            [ DOĞRU ANALİZ ]
                        </button>
                        <button
                            disabled={fbState === STATE.loading}
                            onClick={() => submitFeedback('FAKE')}
                            className="font-mono text-xs uppercase tracking-widest px-4 py-2 transition-opacity disabled:opacity-40"
                            style={{
                                border: '1px solid var(--color-terminal-border-raw)',
                                color: 'var(--color-terminal-border-raw)',
                                background: 'transparent',
                            }}
                        >
                            [ HATALI ANALİZ ]
                        </button>
                    </div>
                ) : fbState === STATE.done ? (
                    <p className="font-mono text-xs" style={{ color: '#3fff8b' }}>
                        [ OK ] {chosen === 'AUTHENTIC' ? 'Doğru analiz olarak işaretlendi.' : 'Hatalı analiz bildirimi alındı.'} Teşekkürler.
                    </p>
                ) : fbState === STATE.already ? (
                    <p className="font-mono text-xs" style={{ color: 'var(--color-tx-secondary, #8899aa)', opacity: 0.6 }}>
                        [ -- ] Bu analiz için daha önce geri bildirim göndermişsiniz.
                    </p>
                ) : fbState === STATE.rejected ? (
                    <p className="font-mono text-xs" style={{ color: 'var(--color-tx-secondary, #8899aa)', opacity: 0.6 }}>
                        [ !! ] Model yüksek güvenle emin, düzeltme kabul edilmiyor.
                    </p>
                ) : null}
            </div>

            {/* ── Forum Oylaması ── */}
            {forumThreadId && (
                <div
                    className="relative pt-6 pb-5 px-5"
                    style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }}
                >
                    {/* Fieldset-style başlık */}
                    <span
                        className="absolute -top-px left-5 px-2 font-mono text-[10px] uppercase tracking-widest"
                        style={{
                            background: 'var(--color-terminal-surface)',
                            color: 'var(--color-terminal-border-raw)',
                        }}
                    >
                        // TOPLULUK
                    </span>

                    <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-tx-secondary, #8899aa)' }}>
                        Topluluk değerlendirmesine katıl.
                    </p>

                    {voteState === STATE.done ? (
                        <p className="font-mono text-xs" style={{ color: '#3fff8b' }}>
                            [ OK ] Oyun kaydedildi.
                        </p>
                    ) : voteState === STATE.already ? (
                        <p className="font-mono text-xs" style={{ color: 'var(--color-tx-secondary, #8899aa)', opacity: 0.6 }}>
                            [ -- ] Daha önce oy kullandınız.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {VOTES.map((vote) => (
                                <button
                                    key={vote.type}
                                    disabled={voteState === STATE.loading}
                                    onClick={() => submitVote(vote.type)}
                                    className="font-mono text-xs uppercase tracking-widest px-4 py-2 transition-opacity disabled:opacity-40"
                                    style={{
                                        border: '1px solid var(--color-terminal-border-raw)',
                                        color: 'var(--color-terminal-border-raw)',
                                        background: 'transparent',
                                    }}
                                >
                                    [ {vote.label} ]
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
