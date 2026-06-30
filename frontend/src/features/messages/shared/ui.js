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
    onGreen:         '#062018',              // koyu metin — brand-green rozet/düğme üzerinde
    // Phase 1.5 — görsel canlılık
    accent:          'linear-gradient(90deg, var(--color-brand-primary), #10b981)',
    borderStrong:    'rgba(16,185,129,0.30)',
    cardShadow:      '0 8px 30px -12px rgba(16,185,129,0.25), 0 2px 6px -2px rgba(0,0,0,0.08)',
};

export const BD   = { borderColor: C.border };                              // ortak border yardımcısı
export const SURF = { background: C.surface, borderColor: C.border };      // ortak surface yardımcısı
