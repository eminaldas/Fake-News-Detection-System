export function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)     return 'az önce';
    if (diff < 3600)   return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
    const weeks = Math.floor(diff / 604800);
    if (weeks < 8)     return `${weeks} hafta önce`;
    return `${Math.floor(diff / 2592000)} ay önce`;
}

export function reliabilityColor(score) {
    if (score == null) return 'var(--color-text-muted)';
    if (score < 0.40) return 'var(--color-brand-primary)';
    if (score < 0.60) return 'var(--color-accent-amber)';
    return 'var(--color-fake-fill)';
}
