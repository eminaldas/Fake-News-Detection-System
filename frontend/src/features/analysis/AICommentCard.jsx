import React from 'react';
import {
    Sparkles, Search, Clock, AlertTriangle,
    FileText, CheckCircle2,
} from 'lucide-react';

const AICommentCard = ({ aiComment, theme, sourceBiasSummary = null, temporalAnalysis = null }) => {
    const hex08 = `${theme.hex}14`;
    const hex15 = `${theme.hex}26`;
    const hex30 = `${theme.hex}4d`;

    return (
        <div className="rounded-xl overflow-hidden" style={{ background: hex08, borderLeft: `3px solid ${hex30}` }}>

            {/* Başlık */}
            <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                <Sparkles className={`w-4 h-4 ${theme.statusCls}`} />
                <span className={`${theme.statusCls} font-mono font-bold text-[10px] tracking-widest uppercase`}>
                    // AI_Analiz_Sonucu
                </span>
            </div>

            {/* Mevcut değil */}
            {!aiComment && (
                <p className="text-tx-secondary/50 text-sm italic px-4 sm:px-5 pb-4">
                    AI yorumu şu an mevcut değil.
                </p>
            )}

            {aiComment && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">

                    {/* Temporal uyarı */}
                    {temporalAnalysis?.freshness_flag === 'recycled' && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
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

                    {/* reason_type pill */}
                    {aiComment.reason_type && (
                        <div className="flex items-center gap-1.5">
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

                    {/* Haber Özeti */}
                    {aiComment.news_summary && (
                        <div className="rounded-lg p-3 sm:p-4"
                             style={{ background: hex15, border: `1px solid ${hex15}` }}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <FileText className={`w-3 h-3 ${theme.statusCls} opacity-70`} />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-tx-secondary/60">
                                    // Haber_Özeti
                                </span>
                            </div>
                            <p className="text-tx-secondary text-sm leading-relaxed">
                                {aiComment.news_summary}
                            </p>
                        </div>
                    )}

                    {/* Doğrulama Yorumu */}
                    {aiComment.summary && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className={`w-3 h-3 ${theme.statusCls} opacity-70`} />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-tx-secondary/60">
                                    // Doğrulama_Yorumu
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed italic" style={{ color: theme.hex }}>
                                "{aiComment.summary}"
                            </p>
                        </div>
                    )}

                    {/* Kaynak bias özeti */}
                    {sourceBiasSummary?.bias_summary && (
                        <div className="flex items-start gap-2 pt-3"
                             style={{ borderTop: `1px solid ${hex30}` }}>
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-tx-secondary/50" />
                            <p className="text-tx-secondary/70 text-[10px] leading-snug">
                                {sourceBiasSummary.bias_summary}
                            </p>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default AICommentCard;
