// frontend/src/features/messages/shared/ui.js
// Soft Modern design tokens — theme-aware CSS variables only for colors.
// Green-tint values (rgba(16,185,129,*)) are theme-neutral literals.

export const RADIUS = {
    card:   16,
    bubble: 16,
    tail:    5,
    pill:  9999,
    field:  14,
    chip:  9999,
    panel:  14,
};

export const C = {
    green:           'var(--color-brand-primary)',
    surface:         'var(--color-terminal-surface)',
    border:          'var(--color-terminal-border-raw)',
    textPrimary:     'var(--color-text-primary)',
    textSecondary:   'var(--color-text-secondary)',   // "beyaza yakın" ikincil metin
    textMuted:       'var(--color-text-muted)',
    inBubbleText:    'var(--color-text-primary)',
    outBubbleBg:     'rgba(16,185,129,0.16)',
    outBubbleBorder: 'rgba(16,185,129,0.45)',
    outBubbleText:   'var(--color-text-primary)',     // muted-green tint üzerinde tema-duyarlı, okunur
    greenSoft:       'rgba(16,185,129,0.12)',
    greenSoftBorder: 'rgba(16,185,129,0.30)',
};

export const BD   = { borderColor: C.border };                              // ortak border yardımcısı
export const SURF = { background: C.surface, borderColor: C.border };      // ortak surface yardımcısı
