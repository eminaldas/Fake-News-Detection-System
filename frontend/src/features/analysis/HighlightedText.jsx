import React from 'react';

const CATEGORY_COLORS = {
    clickbait: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded px-0.5',
    hedge:     'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded px-0.5',
    source:    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded px-0.5',
};

/**
 * triggered_words içindeki ifadeleri metinde renkli <mark> ile vurgular.
 * Uzun ifadeler önce aranır (greedy matching).
 * dangerouslySetInnerHTML kullanılmaz — React node dizisi döner.
 */
function buildHighlightedNodes(text, triggeredWords) {
    if (!text || !triggeredWords) return [text];

    // Tüm ifadeler: [{ phrase, category }], uzunluğa göre azalan sıra
    const entries = Object.entries(triggeredWords)
        .flatMap(([category, phrases]) =>
            (phrases || []).map(phrase => ({ phrase: phrase.toLowerCase(), category }))
        )
        .filter(e => e.phrase.length > 0)
        .sort((a, b) => b.phrase.length - a.phrase.length);

    if (entries.length === 0) return [text];

    // Metni tara; eşleşen span'ları React elementi, geri kalanı string olarak diz
    const nodes = [];
    let remaining = text;
    let keyIndex = 0;

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
            // Eşleşme kalmadı
            nodes.push(remaining);
            break;
        }

        // Eşleşme öncesi düz metin
        if (earliestIndex > 0) {
            nodes.push(remaining.slice(0, earliestIndex));
        }

        // Eşleşen kısım — orijinal case korunur
        const matchedText = remaining.slice(earliestIndex, earliestIndex + earliestEntry.phrase.length);
        nodes.push(
            <mark
                key={keyIndex++}
                className={CATEGORY_COLORS[earliestEntry.category] || ''}
                title={earliestEntry.category}
            >
                {matchedText}
            </mark>
        );

        remaining = remaining.slice(earliestIndex + earliestEntry.phrase.length);
    }

    return nodes;
}

const HighlightedText = ({ text, triggeredWords, theme }) => {
    if (!text || !triggeredWords) return null;

    const hasAnyTriggers = Object.values(triggeredWords).some(arr => arr && arr.length > 0);
    if (!hasAnyTriggers) return null;

    const nodes = buildHighlightedNodes(text, triggeredWords);

    return (
        <div className="mt-4">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2 ${theme.title}`}>
                Analiz Edilen Metin
            </p>
            <p className="text-tx-primary dark:text-tx-secondary text-sm leading-relaxed font-medium">
                {nodes}
            </p>
        </div>
    );
};

export default HighlightedText;
