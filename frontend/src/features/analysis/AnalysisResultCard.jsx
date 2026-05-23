import React, { useEffect, useState } from 'react';
import {
    Brain, MessageSquare, CheckCircle2,
    Link2, Info, ThumbsUp, ThumbsDown, FileSearch, ExternalLink,
} from 'lucide-react';
import { trackInteraction } from '../../services/interaction.service';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SignalPanel from './SignalPanel';
import HighlightedText from './HighlightedText';
import AICommentCard from './AICommentCard';
import FalseClaimsCard from './FalseClaimsCard';
import ForumSuggestion from '../forum/ForumSuggestion';
import ShareDropdown from '../../components/ui/ShareDropdown';
import FullReportModal from './FullReportModal';
import { getTheme, buildExplanation, RING_CIRC } from './analysisTheme';

/* ─── Bileşen ──────────────────────────────────────────────────────── */
const AnalysisResultCard = ({ result }) => {
    const navigate           = useNavigate();
    const { isAuthenticated } = useAuth();

    const [showModal, setShowModal] = useState(false);
    const [feedbackState,  setFeedbackState]  = useState('idle'); // idle | asking | sent
    const [feedbackReason, setFeedbackReason] = useState('');

    const handleFeedbackPositive = async () => {
        if (feedbackState !== 'idle') return;
        setFeedbackState('sent');
        try { await trackInteraction({ content_id: articleId, interaction_type: 'feedback_positive' }); } catch {}
    };
    const handleFeedbackNegative = () => {
        if (feedbackState !== 'idle') return;
        setFeedbackState('asking');
    };
    const handleFeedbackSubmit = async () => {
        setFeedbackState('sent');
        try { await trackInteraction({ content_id: articleId, interaction_type: 'feedback_negative', note: feedbackReason }); } catch {}
    };

    // Hooks must come before the early return — compute values safely with optional chaining
    const isUrlAnalysis = !!result?.truth_score;
    const displayScore = result
        ? (isUrlAnalysis
            ? parseFloat(result.truth_score).toFixed(0)
            : (() => { const r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })())
        : '0';
    const targetOffset = parseFloat((RING_CIRC * (1 - parseFloat(displayScore) / 100)).toFixed(2));
    const [ringOffset, setRingOffset] = useState(RING_CIRC);
    useEffect(() => {
        const id = setTimeout(() => setRingOffset(targetOffset), 100);
        return () => clearTimeout(id);
    }, [targetOffset]);

    if (!result) return null;

    const status      = result.ai_comment?.gemini_verdict?.toUpperCase() || result.prediction?.toUpperCase() || 'UNKNOWN';
    const isAuthentic = status === 'AUTHENTIC' || status === 'TRUE' || status === 'GÜVENİLİR' || status === 'REAL';
    const isFake      = status === 'FAKE' || status === 'FALSE' || status === 'YANILTICI';
    const isIddia     = status === 'IDDIA' || status === 'UNCERTAIN';

    const scoreLabel  = isUrlAnalysis ? 'Doğruluk' : 'Güven';

    const theme      = getTheme(isAuthentic, isFake, isIddia);
    const signals    = result.signals || null;
    const aiComment  = result.ai_comment || null;
    const origText   = result.originalText || null;
    const explanation = buildExplanation(signals);
    const articleId  = result.direct_match_data?.db_article_id ?? result.db_article_id ?? null;

    const hasGeminiVerdict = !!aiComment?.gemini_verdict;
    const badgeLabel = isUrlAnalysis
        ? 'URL Analizi'
        : result.isDirectMatch
            ? 'Veritabanı Eşleşmesi'
            : hasGeminiVerdict
                ? 'Gemini AI Kararı'
                : 'Yapay Zeka Sınıflandırması';

    const mlOverridden =
        hasGeminiVerdict &&
        aiComment.ml_status &&
        aiComment.gemini_verdict !== aiComment.ml_status;

    const mlOverrideNote = mlOverridden
        ? aiComment.ml_confidence != null
            ? `NLP modeli: ${aiComment.ml_status} %${Math.round(aiComment.ml_confidence * 100)} → Gemini tarafından revize edildi`
            : `NLP modeli: ${aiComment.ml_status} → Gemini tarafından revize edildi`
        : null;

    /* opacity helpers */
    const hex15 = `${theme.hex}26`;
    const hex30 = `${theme.hex}4d`;
    const hex08 = `${theme.hex}14`;

    return (
        <>
        <div
            className="animate-fade-up mt-6 md:mt-8 w-full flex flex-col relative"
            style={{
                background: 'var(--color-bg-surface)',
                border: `1px solid ${hex30}`,
                borderTop: `3px solid ${theme.hex}`,
                boxShadow: `0 4px 32px rgba(${theme.glowRgb},0.10), 0 1px 4px rgba(0,0,0,0.08)`,
            }}
        >
            {/* ── Dekoratif arka plan ── */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none -z-0"
                 style={{ background: hex08 }} />

            {/* ── Header ── */}
            <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                 style={{ borderBottom: `1px solid ${hex15}` }}>

                {/* Sol: ikon + başlık */}
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative"
                         style={{ background: hex15 }}>
                        <theme.Icon className={`w-6 h-6 ${theme.statusCls}`} strokeWidth={2} />
                        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-none"
                             style={{ background: theme.hex }} />
                        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-none"
                             style={{ background: theme.hex }} />
                    </div>
                    <div className="min-w-0">
                        <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase block mb-0.5`}>
                            [ {theme.label} ]
                        </span>
                        <h2 className="text-tx-primary font-manrope font-extrabold text-lg sm:text-xl tracking-tight leading-tight">
                            {theme.mainTitle}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-bold uppercase tracking-widest text-tx-secondary">
                            {isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />}
                            {badgeLabel}
                        </span>
                        {mlOverrideNote && (
                            <span className="mt-1 text-[10px] text-tx-secondary italic block">
                                {mlOverrideNote}
                            </span>
                        )}
                    </div>
                </div>

                {/* Sağ: karma skor — AI yoksa halka, AI varsa metin */}
                {!aiComment ? (
                    <div className="relative flex items-center justify-center shrink-0 self-center sm:self-auto">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r="42"
                                    fill="transparent" stroke={hex15}
                                    strokeWidth="7" />
                            <circle cx="48" cy="48" r="42"
                                    fill="transparent" stroke={theme.hex}
                                    strokeWidth="7"
                                    strokeDasharray={RING_CIRC}
                                    strokeDashoffset={ringOffset}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="font-manrope font-black text-xl leading-none text-tx-primary">
                                %{displayScore}
                            </span>
                            <span className="text-tx-secondary text-[9px] tracking-tight uppercase mt-0.5">
                                {scoreLabel}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-end shrink-0 self-center sm:self-auto">
                        <span className="font-manrope font-black text-3xl leading-none"
                              style={{ color: theme.hex }}>
                            %{displayScore}
                        </span>
                        <span className="font-mono text-[9px] tracking-widest uppercase mt-1"
                              style={{ color: `${theme.hex}80` }}>
                            VERACITY_SCORE
                        </span>
                    </div>
                )}
            </div>

            {/* ── Gövde ── */}
            <div className="p-5 sm:p-7 space-y-5">

                {/* URL analizi: başlık */}
                {isUrlAnalysis && result.scraped_title && (
                    <div className="flex items-start gap-2 opacity-70">
                        <Link2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.statusCls}`} />
                        <p className={`text-xs font-medium truncate ${theme.statusCls}`}>
                            {result.scraped_title}
                        </p>
                    </div>
                )}

                {/* URL analizi: haber linki */}
                {isUrlAnalysis && (result.source_url || result.url) && (
                    <a
                        href={result.source_url || result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
                    >
                        <ExternalLink className={`w-3 h-3 shrink-0 ${theme.statusCls}`} />
                        <span className={`text-[11px] font-mono truncate ${theme.statusCls}`}>
                            Haber Linki →
                        </span>
                    </a>
                )}

                {/* İçerik Analizi — URL analizinde gizle, her zaman göster */}
                {!isUrlAnalysis && signals && (
                    <div className="rounded-xl overflow-hidden"
                         style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>
                        <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
                            <Brain className={`w-4 h-4 ${theme.statusCls}`} />
                            <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase`}>
                                // İçerik_Analizi
                            </span>
                        </div>
                        <div className="px-4 sm:px-5 pb-2">
                            <SignalPanel
                                signals={signals}
                                theme={theme}
                                forceKeys={['clickbait_score', 'uppercase_ratio', 'exclamation_ratio', 'source_score']}
                                sectionLabel=""
                            />
                        </div>
                        {explanation && (
                            <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-tx-secondary leading-relaxed text-sm italic">
                                "{explanation}"
                            </p>
                        )}
                    </div>
                )}

                {/* Vurgulu Metin */}
                {!isUrlAnalysis && origText && signals?.triggered_words && (
                    <HighlightedText text={origText} triggeredWords={signals.triggered_words} />
                )}

                {/* Gemini AI Yorumu — sadece deep analysis sonuçlarında göster */}
                {!result.isDirectMatch && (
                    <AICommentCard
                        aiComment={aiComment}
                        theme={theme}
                        sourceBiasSummary={result.source_bias_summary ?? null}
                        temporalAnalysis={result.temporal_analysis ?? null}
                    />
                )}
                {!result.isDirectMatch && (
                    <FalseClaimsCard falseClaims={aiComment?.false_claims} />
                )}
            </div>

            {/* ── Footer: Geri Bildirim ── */}
            <div style={{ borderTop: `1px solid ${hex15}`, background: 'var(--color-bg-surface-solid)' }}>
                {/* Satır 1: Bu sonuç doğru mu? */}
                <div className="px-5 sm:px-7 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {feedbackState === 'sent' ? (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: theme.hex }} />
                            <span>Geri bildirim alındı, teşekkürler.</span>
                        </div>
                    ) : feedbackState === 'asking' ? (
                        <div className="flex flex-col gap-2 w-full">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-tx-secondary">
                                Neyi eksik buldun? <span className="normal-case font-normal">(opsiyonel)</span>
                            </label>
                            <textarea
                                value={feedbackReason}
                                onChange={e => setFeedbackReason(e.target.value)}
                                rows={2}
                                placeholder="Yazabilirsin..."
                                className="w-full border text-sm p-2.5 resize-none focus:outline-none transition-colors rounded-none"
                                style={{ background: 'var(--color-terminal-surface)', borderColor: `${theme.hex}30`, color: 'var(--color-text-primary)' }}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleFeedbackSubmit}
                                    className="px-4 py-1.5 font-manrope font-bold text-[11px] uppercase tracking-wider border transition-all hover:opacity-85 rounded-xl"
                                    style={{ borderColor: theme.hex, color: theme.hex, background: hex08 }}
                                >
                                    Gönder
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                     style={{ background: hex15 }}>
                                    <MessageSquare className={`w-4 h-4 ${theme.statusCls}`} />
                                </div>
                                <p className="text-tx-secondary text-sm font-medium">Bu sonuç doğru mu?</p>
                            </div>
                            <div className="flex gap-2.5 w-full sm:w-auto">
                                <button
                                    onClick={handleFeedbackNegative}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5
                                               px-5 py-2 rounded-xl border border-brutal-border/40
                                               text-tx-secondary font-manrope font-bold text-[11px] uppercase tracking-wider
                                               hover:bg-surface-solid hover:text-tx-primary transition-colors active:scale-95">
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    Hayır
                                </button>
                                <button
                                    onClick={handleFeedbackPositive}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5
                                                px-6 py-2 rounded-xl ${theme.bgCls} ${theme.onBgCls}
                                                font-manrope font-bold text-[11px] uppercase tracking-wider
                                                hover:opacity-85 transition-opacity active:scale-95`}
                                    style={{ boxShadow: `0 4px 16px rgba(${theme.glowRgb},0.25)` }}
                                >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    Evet
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {/* Satır 2: Tam Rapor + Paylaş */}
                <div className="px-5 sm:px-7 py-3 flex items-center justify-between"
                     style={{ borderTop: `1px solid ${hex15}` }}>
                    {isAuthenticated ? (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 text-sm font-bold text-tx-secondary hover:text-tx-primary transition-colors"
                        >
                            <FileSearch className="w-4 h-4" />
                            Tam Raporu Gör →
                        </button>
                    ) : (
                        <p className="text-xs text-tx-secondary/60">
                            <a href="/login" className="underline hover:text-tx-primary">Giriş yapın</a>
                            {' '}— derin Gemini analizi için
                        </p>
                    )}
                    {articleId && (
                        <ShareDropdown
                            url={`${window.location.origin}/s/analysis/${articleId}`}
                            text={`${status === 'FAKE' ? 'SAHTE' : 'GÜVENİLİR'} (%${displayScore}) — ${(origText || '').slice(0, 80)} | Sahte Haber Dedektifi`}
                        />
                    )}
                </div>
            </div>
        </div>
        <ForumSuggestion articleId={articleId} />
        {showModal && (
            <FullReportModal
                taskId={result.task_id ?? result.content_id}
                onClose={() => setShowModal(false)}
            />
        )}
        </>
    );
};

export default AnalysisResultCard;
