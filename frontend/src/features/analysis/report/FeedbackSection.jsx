import React, { useState, useEffect } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import AnalysisService from '../../../services/analysis.service';

const STATE = { idle: 'idle', loading: 'loading', done: 'done', rejected: 'rejected', already: 'already' };

const VOTES = [
    { type: 'authentic',   label: 'GERÇEK'  },
    { type: 'suspicious',  label: 'ŞÜPHELİ' },
    { type: 'investigate', label: 'ARAŞTIR' },
];

export default function FeedbackSection({ taskId, forumThreadId, onShared }) {
    const [shareState, setShareState] = useState('idle'); // idle | loading | editing | sharing | done
    const [suggestion, setSuggestion] = useState({ title: '', body: '' });

    const startShare = async () => {
        setShareState('loading');
        try {
            const data = await AnalysisService.getShareSuggestion(taskId);
            setSuggestion({ title: data.title, body: data.body });
            setShareState('editing');
        } catch {
            setShareState('idle');
        }
    };

    const submitShare = async () => {
        setShareState('sharing');
        try {
            const data = await AnalysisService.shareReport(taskId, suggestion);
            setShareState('done');
            onShared?.(data.thread_id);
        } catch {
            setShareState('editing');
        }
    };

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

            {/* ── Topluluğa Paylaş (rapor henüz paylaşılmadıysa) ── */}
            {!forumThreadId && (
                <div className="pt-5 pb-5 px-5" style={{ borderTop: '1px solid var(--color-terminal-border-raw)' }}>
                    {shareState === 'idle' || shareState === 'loading' ? (
                        <>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
                                <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                    Topluluğa Paylaş
                                </span>
                            </div>
                            <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                                Bu raporu foruma taşıyıp topluluğun değerlendirmesine açabilirsin — paylaşmadan önce başlık ve metni düzenleyebilirsin.
                            </p>
                            <button
                                disabled={shareState === 'loading'}
                                onClick={startShare}
                                className="font-mono text-xs uppercase tracking-widest px-4 py-2 transition-opacity disabled:opacity-40"
                                style={{ border: '1px solid var(--color-terminal-border-raw)', color: 'var(--color-brand-primary)', background: 'transparent' }}
                            >
                                {shareState === 'loading' ? '[ HAZIRLANIYOR... ]' : '[ TOPLULUĞA PAYLAŞ ]'}
                            </button>
                        </>
                    ) : shareState === 'editing' || shareState === 'sharing' ? (
                        <>
                            <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                Başlık
                            </label>
                            <input
                                value={suggestion.title}
                                onChange={e => setSuggestion(s => ({ ...s, title: e.target.value }))}
                                maxLength={200}
                                className="w-full bg-transparent font-mono text-sm outline-none px-3 py-2 border mb-3"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                            />
                            <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                                Metin
                            </label>
                            <textarea
                                value={suggestion.body}
                                onChange={e => setSuggestion(s => ({ ...s, body: e.target.value }))}
                                rows={5}
                                maxLength={5000}
                                className="w-full bg-transparent font-mono text-sm outline-none px-3 py-2 border resize-none mb-3"
                                style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-primary)' }}
                            />
                            <div className="flex gap-2">
                                <button
                                    disabled={shareState === 'sharing' || !suggestion.title.trim()}
                                    onClick={submitShare}
                                    className="font-mono text-xs uppercase tracking-widest px-4 py-2 font-bold transition-opacity disabled:opacity-40"
                                    style={{ background: 'var(--color-brand-primary)', color: '#070f12' }}
                                >
                                    {shareState === 'sharing' ? '[ PAYLAŞILIYOR... ]' : '[ PAYLAŞ ]'}
                                </button>
                                <button
                                    disabled={shareState === 'sharing'}
                                    onClick={() => setShareState('idle')}
                                    className="font-mono text-xs px-4 py-2 border transition-opacity hover:opacity-70"
                                    style={{ borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
                                >
                                    İptal
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="font-mono text-xs" style={{ color: '#3fff8b' }}>
                            [ OK ] Topluluğa paylaşıldı.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
