import React from 'react';
import { Quote } from 'lucide-react';

// Stitch tasarımıyla eşleşen kategori renkleri (sabit — karardan bağımsız)
const CATEGORY_STYLE = {
    clickbait: { bg: '#ff735133', text: '#ff7351', border: '#ff7351' }, // hata/kırmızı
    hedge:     { bg: '#f9731633', text: '#fb923c', border: '#f97316' }, // turuncu
    source:    { bg: '#3fff8b33', text: '#3fff8b', border: '#3fff8b' }, // yeşil
};

/**
 * triggered_words içindeki ifadeleri metinde vurgular.
 * Uzun ifadeler önce aranır (greedy matching).
 * dangerouslySetInnerHTML kullanılmaz — React node dizisi döner.
 */
function buildHighlightedNodes(text, triggeredWords) {
    if (!text || !triggeredWords) return [text];

    const entries = Object.entries(triggeredWords)
        .flatMap(([category, phrases]) =>
            (phrases || []).map(phrase => ({ phrase: phrase.toLowerCase(), category }))
        )
        .filter(e => e.phrase.length > 0)
        .sort((a, b) => b.phrase.length - a.phrase.length);

    if (entries.length === 0) return [text];

    const nodes = [];
    let remaining = text;
    let keyIndex  = 0;

    while (remaining.length > 0) {
        let earliestIndex = Infinity;
        let earliestEntry = null;

        for (const entry of entries) {
            const idx = remaining.toLowerCase().indexOf(entry.phrase);
            if (idx !== -1 && idx < earliestIndex) {
                earliestIndex = idx;
                earliestEntry = entry;
            }
        }

        if (!earliestEntry) {
            nodes.push(remaining);
            break;
        }

        if (earliestIndex > 0) {
            nodes.push(remaining.slice(0, earliestIndex));
        }

        const matchedText = remaining.slice(earliestIndex, earliestIndex + earliestEntry.phrase.length);
        const style = CATEGORY_STYLE[earliestEntry.category] || CATEGORY_STYLE.source;

        nodes.push(
            <span
                key={keyIndex++}
                title={earliestEntry.category}
                style={{
                    backgroundColor: style.bg,
                    color:           style.text,
                    borderBottom:    `2px solid ${style.border}`,
                }}
                className="px-1 rounded-sm font-medium"
            >
                {matchedText}
            </span>
        );

        remaining = remaining.slice(earliestIndex + earliestEntry.phrase.length);
    }

    return nodes;
}

const HighlightedText = ({ text, triggeredWords }) => {
    if (!text || !triggeredWords) return null;

    const hasAnyTriggers = Object.values(triggeredWords).some(arr => arr && arr.length > 0);
    if (!hasAnyTriggers) return null;

    const nodes = buildHighlightedNodes(text, triggeredWords);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-tx-secondary font-manrope font-bold text-[10px] tracking-widest uppercase">
                    İncelenen Metin
                </h3>
                {/* Kategori renk açıklaması */}
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[9px] text-tx-secondary/60 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-es-error inline-block" />
                        Clickbait
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-tx-secondary/60 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                        Belirsiz
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-tx-secondary/60 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-es-primary inline-block" />
                        Kaynak
                    </span>
                </div>
            </div>
            <div className="bg-surface-solid rounded-2xl p-5 sm:p-6 relative">
                {/* Dekoratif alıntı ikonu */}
                <Quote
                    className="absolute top-4 right-4 w-8 h-8 text-tx-secondary/15 pointer-events-none"
                    aria-hidden
                />
                <p className="text-tx-primary leading-loose text-sm relative z-10">
                    {nodes}
                </p>
            </div>
        </div>
    );
};

export default HighlightedText;
