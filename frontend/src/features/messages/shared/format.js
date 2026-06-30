// frontend/src/features/messages/shared/format.js
export function formatDateLabel(isoString) {
    if (!isoString) return '';
    const dt        = new Date(isoString);
    const now       = new Date();
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 86400000);
    const msgDay    = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    if (msgDay.getTime() === today.getTime())     return 'Bugün';
    if (msgDay.getTime() === yesterday.getTime()) return 'Dün';
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function timeStr(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
