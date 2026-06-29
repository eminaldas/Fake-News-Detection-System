// frontend/src/features/messages/shared/linkify.js
export const FORUM_RE = /https?:\/\/(?:www\.)?nehaber\.dev\/forum\/([0-9a-f-]{36})/i;

export function extractForumId(text) {
    const m = (text || '').match(FORUM_RE);
    return m ? m[1] : null;
}

// Metni { text | url } parçalarına böler. Her çağrıda yeni regex (lastIndex state'i taşımaz).
export function splitLinkParts(text) {
    const txt = text ?? '';
    const re  = /https?:\/\/[^\s<>"]+/gi;
    const parts = [];
    let last = 0;
    let m;
    while ((m = re.exec(txt)) !== null) {
        if (m.index > last) parts.push({ type: 'text', value: txt.slice(last, m.index) });
        parts.push({ type: 'url', value: m[0] });
        last = m.index + m[0].length;
    }
    if (last < txt.length) parts.push({ type: 'text', value: txt.slice(last) });
    return parts;
}
