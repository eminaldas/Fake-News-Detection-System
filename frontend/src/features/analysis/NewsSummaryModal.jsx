import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { trackInteraction } from '../../services/interaction.service';

const BRAND  = 'var(--color-brand-primary)';
const BORDER = 'var(--color-terminal-border-raw)';

function relTime(pubDate) {
    if (!pubDate) return '';
    const diff = Math.floor((Date.now() - new Date(pubDate)) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
    return `${Math.floor(diff / 86400)} gün`;
}

function SummaryFeedback() {
    const [state,  setState]  = useState('idle'); // idle | asking | sent
    const [reason, setReason] = useState('');

    const handlePositive = async () => {
        if (state !== 'idle') return;
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_positive' });
    };

    const handleNegative = () => {
        if (state !== 'idle') return;
        setState('asking');
    };

    const handleSubmit = async () => {
        setState('sent');
        await trackInteraction({ content_id: null, interaction_type: 'feedback_negative', note: reason });
    };

    if (state === 'sent') return (
        <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND }} />
            <span>Geri bildirim alındı, teşekkürler.</span>
        </div>
    );

    if (state === 'asking') return (
        <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: 'var(--color-text-muted)' }}>
                Neyi eksik buldun? <span className="normal-case font-normal">(opsiyonel)</span>
            </span>
            <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Yazabilirsin..."
                className="w-full text-sm p-2.5 resize-none focus:outline-none transition-colors"
                style={{
                    background:  'var(--color-terminal-surface)',
                    border:      `1px solid ${BORDER}`,
                    color:       'var(--color-text-primary)',
                }}
            />
            <button
                onClick={handleSubmit}
                className="self-end font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-all hover:brightness-110"
                style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
            >
                Gönder
            </button>
        </div>
    );

    return (
        <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Bu özet faydalı mıydı?
            </span>
            <div className="flex gap-2">
                <button
                    onClick={handlePositive}
                    className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 border transition-all hover:brightness-110"
                    style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
                >
                    <ThumbsUp className="w-3 h-3" /> Evet
                </button>
                <button
                    onClick={handleNegative}
                    className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 border transition-all hover:opacity-70"
                    style={{ borderColor: BORDER, color: 'var(--color-text-secondary)' }}
                >
                    <ThumbsDown className="w-3 h-3" /> Hayır
                </button>
            </div>
        </div>
    );
}

export default function NewsSummaryModal({ result, article, onClose, onAnalyze }) {
    const summary = result?.ai_comment?.news_summary;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg flex flex-col border"
                style={{ background: 'var(--color-terminal-surface)', borderColor: BORDER }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b"
                     style={{ borderColor: BORDER }}>
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: BRAND }} />
                        <span className="font-mono font-bold text-[10px] uppercase tracking-widest"
                              style={{ color: BRAND }}>
                            // HABER_ÖZETİ
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="opacity-40 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                </div>

                {/* Meta */}
                {(article.source_name || article.pub_date) && (
                    <div className="px-5 pt-3 flex items-center gap-2 font-mono text-[10px]"
                         style={{ color: 'var(--color-text-muted)' }}>
                        {article.source_name && (
                            <span className="font-semibold">{article.source_name}</span>
                        )}
                        {article.source_name && article.pub_date && <span>·</span>}
                        {article.pub_date && <span>{relTime(article.pub_date)}</span>}
                    </div>
                )}

                {/* Summary */}
                <div className="px-5 py-4 max-h-[40vh] overflow-y-auto">
                    {summary ? (
                        <p className="text-sm leading-relaxed"
                           style={{ color: 'var(--color-text-primary)' }}>
                            {summary}
                        </p>
                    ) : (
                        <p className="text-sm italic"
                           style={{ color: 'var(--color-text-muted)' }}>
                            Özet henüz mevcut değil, tam analizi deneyebilirsin.
                        </p>
                    )}
                </div>

                {/* Feedback */}
                <div className="px-5 py-3 border-t" style={{ borderColor: BORDER }}>
                    <SummaryFeedback />
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                    <button
                        onClick={onAnalyze}
                        className="w-full font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-3 border transition-all hover:brightness-110"
                        style={{ borderColor: BRAND, color: BRAND, background: 'rgba(16,185,129,0.06)' }}
                    >
                        Tam Analizi Gör →
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
