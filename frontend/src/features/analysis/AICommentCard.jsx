import React from 'react';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';

/**
 * Gemini AI yorumunu gösterir.
 * aiComment === null    → yükleniyor spinner
 * aiComment === object  → özet paragraf + kanıt linkleri
 */
const AICommentCard = ({ aiComment, theme }) => {
    const hex08 = `${theme.hex}14`;
    const hex15 = `${theme.hex}26`;
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
                {!aiComment && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-tx-secondary/50 ml-1" />
                )}
            </div>

            {/* Yükleniyor */}
            {!aiComment && (
                <p className="text-tx-secondary/50 text-sm italic">
                    AI yorumu oluşturuluyor...
                </p>
            )}

            {/* İçerik */}
            {aiComment && (
                <>
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
                                    </span>
                                </a>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AICommentCard;
