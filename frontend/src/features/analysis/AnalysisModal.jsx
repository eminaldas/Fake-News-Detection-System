import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Brain, Link2, Info } from 'lucide-react';
import AICommentCard from './AICommentCard';
import FalseClaimsCard from './FalseClaimsCard';
import SignalPanel from './SignalPanel';
import ShareDropdown from '../../components/ui/ShareDropdown';
import { getTheme, buildExplanation, RING_CIRC } from './analysisTheme';

export default function AnalysisModal({ result, onClose }) {
    const isUrlAnalysis = !!result?.truth_score;
    const displayScore  = result
        ? isUrlAnalysis
            ? parseFloat(result.truth_score).toFixed(0)
            : (() => { const r = parseFloat(result.confidence || 0); return r <= 1 ? (r * 100).toFixed(0) : r.toFixed(0); })()
        : '0';

    const targetOffset = parseFloat((RING_CIRC * (1 - parseFloat(displayScore) / 100)).toFixed(2));
    const [ringOffset, setRingOffset] = useState(RING_CIRC);
    useEffect(() => {
        const id = setTimeout(() => setRingOffset(targetOffset), 100);
        return () => clearTimeout(id);
    }, [targetOffset]);

    if (!result) return null;

    const status      = result.ai_comment?.gemini_verdict?.toUpperCase() || result.prediction?.toUpperCase() || 'UNKNOWN';
    const isAuthentic = ['AUTHENTIC', 'TRUE', 'GÜVENİLİR', 'REAL'].includes(status);
    const isFake      = ['FAKE', 'FALSE', 'YANILTICI'].includes(status);
    const isIddia     = ['IDDIA', 'UNCERTAIN'].includes(status);

    const theme      = getTheme(isAuthentic, isFake, isIddia);
    const signals    = result.signals    || null;
    const aiComment  = result.ai_comment || null;
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

    const hex08 = `${theme.hex}14`;
    const hex15 = `${theme.hex}26`;
    const hex30 = `${theme.hex}4d`;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl flex flex-col overflow-hidden"
                style={{
                    background:  'var(--color-bg-surface)',
                    border:      `1px solid ${hex30}`,
                    borderTop:   `3px solid ${theme.hex}`,
                    maxHeight:   '90vh',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header — sabit */}
                <div
                    className="p-5 flex items-center justify-between gap-4 shrink-0"
                    style={{ borderBottom: `1px solid ${hex15}` }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: hex15 }}>
                            <theme.Icon className={`w-5 h-5 ${theme.statusCls}`} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase block`}>
                                [ {theme.label} ]
                            </span>
                            <h2 className="text-tx-primary font-manrope font-extrabold text-base leading-tight truncate">
                                {theme.mainTitle}
                            </h2>
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold uppercase tracking-widest text-tx-secondary/60">
                                {isUrlAnalysis ? <Link2 size={10} /> : <Info size={10} />}
                                {badgeLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Skor */}
                        {!aiComment ? (
                            <div className="relative flex items-center justify-center">
                                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 96 96">
                                    <circle cx="48" cy="48" r="42" fill="transparent"
                                            stroke={hex15} strokeWidth="7" />
                                    <circle cx="48" cy="48" r="42" fill="transparent"
                                            stroke={theme.hex} strokeWidth="7"
                                            strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="font-manrope font-black text-base leading-none text-tx-primary">
                                        %{displayScore}
                                    </span>
                                    <span className="text-tx-secondary text-[8px] tracking-tight uppercase mt-0.5">
                                        Güven
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="font-manrope font-black text-2xl leading-none"
                                      style={{ color: theme.hex }}>
                                    %{displayScore}
                                </span>
                                <span className="font-mono text-[9px] tracking-widest uppercase mt-0.5"
                                      style={{ color: `${theme.hex}80` }}>
                                    SCORE
                                </span>
                            </div>
                        )}
                        {/* Kapat */}
                        <button
                            onClick={onClose}
                            className="text-tx-secondary/40 hover:text-tx-primary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Gövde — scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {isUrlAnalysis && result.scraped_title && (
                        <div className="flex items-start gap-2 opacity-70">
                            <Link2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.statusCls}`} />
                            <p className={`text-xs font-medium truncate ${theme.statusCls}`}>
                                {result.scraped_title}
                            </p>
                        </div>
                    )}

                    {!result.isDirectMatch && (
                        <AICommentCard
                            aiComment={aiComment}
                            theme={theme}
                            sourceBiasSummary={result.source_bias_summary ?? null}
                            temporalAnalysis={result.temporal_analysis ?? null}
                        />
                    )}

                    {!isUrlAnalysis && signals && (
                        <div className="rounded-xl overflow-hidden"
                             style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>
                            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                <Brain className={`w-4 h-4 ${theme.statusCls}`} />
                                <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase`}>
                                    // İçerik_Analizi
                                </span>
                            </div>
                            <div className="px-4 pb-2">
                                <SignalPanel
                                    signals={signals}
                                    theme={theme}
                                    forceKeys={['clickbait_score', 'uppercase_ratio', 'exclamation_ratio', 'source_score']}
                                    sectionLabel=""
                                />
                            </div>
                            {explanation && (
                                <p className="px-4 pb-4 text-tx-secondary leading-relaxed text-sm italic">
                                    &ldquo;{explanation}&rdquo;
                                </p>
                            )}
                        </div>
                    )}

                    {!result.isDirectMatch && (
                        <FalseClaimsCard falseClaims={aiComment?.false_claims} />
                    )}
                </div>

                {/* Footer — sabit */}
                <div
                    className="px-5 py-3 flex items-center justify-between shrink-0"
                    style={{ borderTop: `1px solid ${hex15}`, background: 'var(--color-bg-surface-solid)' }}
                >
                    {articleId ? (
                        <ShareDropdown
                            url={`${window.location.origin}/s/analysis/${articleId}`}
                            text={`${status === 'FAKE' ? 'SAHTE' : 'GÜVENİLİR'} (%${displayScore}) | Sahte Haber Dedektifi`}
                        />
                    ) : <span />}
                    <button
                        onClick={onClose}
                        className="font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2 border transition-all hover:opacity-70"
                        style={{
                            borderColor: 'var(--color-terminal-border-raw)',
                            color:       'var(--color-text-secondary)',
                        }}
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
