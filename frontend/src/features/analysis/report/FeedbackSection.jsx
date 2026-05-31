import React, { useState, useEffect } from 'react';
import { MessageSquare, Users } from 'lucide-react';
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
    const [voteCount, setVoteCount] = useState(null);

    useEffect(() => {
        if (!forumThreadId) return;
        AnalysisService.getForumThread(forumThreadId)
            .then((data) => {
                const total =
                    (data.vote_suspicious  || 0) +
                    (data.vote_authentic   || 0) +
                    (data.vote_investigate || 0);
                setVoteCount(total);
            })
            .catch(() => {});
    }, [forumThreadId]);

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
            setVoteCount((c) => (c !== null ? c + 1 : 1));
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
            <div className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                    <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        Bu analiz doğru mu?
                    </span>
                </div>

                <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Geri bildiriminiz modelin gelişmesine katkı sağlar.
                </p>

                {fbState === STATE.idle || fbState === STATE.loading ? (
                    <div className="flex flex-wrap gap-3">
                        <button
                            disabled={fbState === STATE.loading}
                            onClick={() => submitFeedback('AUTHENTIC')}
                            className="font-mono text-xs uppercase tracking-widest px-4 py-2 transition-opacity disabled:opacity-40"
                            style={{
                                border: '1px solid var(--color-terminal-border-raw)',
                                color: 'var(--color-text-secondary)',
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
                                color: 'var(--color-text-secondary)',
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
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted-accent)' }}>
                        [ -- ] Bu analiz için daha önce geri bildirim göndermişsiniz.
                    </p>
                ) : fbState === STATE.rejected ? (
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted-accent)' }}>
                        [ !! ] Model yüksek güvenle emin, düzeltme kabul edilmiyor.
                    </p>
                ) : null}
            </div>

            {/* ── Forum Oylaması ── */}
            {forumThreadId && (
                <div
                    className="pt-5 pb-5 px-5"
                    style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                        <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            Topluluk Değerlendirmesi
                        </span>
                        {voteCount !== null && voteCount > 0 && (
                            <span
                                className="font-mono text-[11px] ml-1"
                                style={{ color: 'var(--color-text-muted-accent)' }}
                            >
                                {voteCount} değerlendirme
                            </span>
                        )}
                    </div>

                    {voteState === STATE.done ? (
                        <p className="font-mono text-xs" style={{ color: '#3fff8b' }}>
                            [ OK ] Oyun kaydedildi.
                        </p>
                    ) : voteState === STATE.already ? (
                        <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted-accent)' }}>
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
                                        color: 'var(--color-text-secondary)',
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
