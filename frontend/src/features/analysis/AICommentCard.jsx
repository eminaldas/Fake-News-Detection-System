import React from 'react';
import { Sparkles, ExternalLink, Search, Clock, AlertTriangle } from 'lucide-react';

/**
 * Gemini AI yorumunu gösterir.
 * aiComment === null    → mevcut değil (zaman aşımı veya atlandı)
 * aiComment === object  → özet paragraf + kanıt linkleri
 */
const AICommentCard = ({ aiComment, theme, sourceBiasSummary = null, temporalAnalysis = null }) => {
    const hex08 = `${theme.hex}14`;
    const hex30 = `${theme.hex}4d`;

    return (
        <div
            className="rounded-xl p-4 sm:p-5"
            style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}
        >
            {/* Başlık */}
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`w-4 h-4 ${theme.statusCls}`} />
                <span className={`${theme.statusCls} font-manrope font-bold text-xs tracking-wide`}>
                    Gemini AI Analizi
                </span>
            </div>

            {/* Mevcut değil */}
            {!aiComment && (
                <p className="text-tx-secondary/50 text-sm italic">
                    AI yorumu şu an mevcut değil.
                </p>
            )}

            {/* İçerik */}
            {aiComment && (
                <>
                    {/* Temporal uyarı — recycled */}
                    {temporalAnalysis?.freshness_flag === 'recycled' && (
                        <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-lg"
                             style={{ background: '#f59e0b14', border: '1px solid #f59e0b33' }}>
                            <Clock className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                            <p className="text-amber-500 text-[10px] font-bold leading-snug">
                                Eski bilgi yeniden dolaşımda
                                {temporalAnalysis.temporal_gap_days && (
                                    <span className="font-normal opacity-80">
                                        {' '}· {Math.round(temporalAnalysis.temporal_gap_days / 365 * 10) / 10} yıl önce yayınlandı
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* reason_type pill badge */}
                    {aiComment.reason_type && (
                        <div className="flex items-center gap-1.5 mb-3">
                            <Search className={`w-3 h-3 shrink-0 ${theme.statusCls} opacity-70`} />
                            <span
                                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                style={{
                                    background: `${theme.hex}1a`,
                                    color: theme.hex,
                                    border: `1px solid ${theme.hex}33`,
                                }}
                            >
                                {aiComment.reason_type}
                            </span>
                        </div>
                    )}

                    {/* Özet */}
                    <p className="text-tx-secondary leading-relaxed text-sm italic mb-3">
                        "{aiComment.summary}"
                    </p>

                    {/* Kanıt linkleri */}
                    {aiComment.evidence?.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-tx-secondary/60 text-[10px] uppercase tracking-widest font-bold mb-2">
                                İlgili Haberler
                            </p>
                            {aiComment.evidence.map((item, i) => (
                                <a
                                    key={i}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2 group"
                                >
                                    <ExternalLink
                                        className={`w-3 h-3 mt-0.5 shrink-0 ${theme.statusCls} opacity-60 group-hover:opacity-100`}
                                    />
                                    <span className="text-tx-secondary text-xs leading-snug group-hover:text-tx-primary transition-colors line-clamp-2">
                                        {item.title}
                                        {item.date && (
                                            <span className="text-tx-secondary/40 ml-1 not-italic">
                                                ({item.date})
                                            </span>
                                        )}
                                    </span>
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Kaynak bias özeti */}
                    {sourceBiasSummary?.bias_summary && (
                        <div className="mt-3 pt-3 flex items-start gap-2"
                             style={{ borderTop: `1px solid ${hex30}` }}>
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-tx-secondary/50" />
                            <p className="text-tx-secondary/70 text-[10px] leading-snug">
                                {sourceBiasSummary.bias_summary}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AICommentCard;
