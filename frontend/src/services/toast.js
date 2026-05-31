// frontend/src/services/toast.js
let _emit = null;

function _show(type, title, options = {}) {
  if (!_emit) {
    if (import.meta.env.MODE !== 'production') {
      console.warn(`[toast] No listener registered. Call toast._register() first.`);
    }
    return;
  }
  _emit({
    type,
    title,
    sub:      options.sub      ?? null,
    action:   options.action   ?? null,
    duration: options.duration ?? 6000,
    id:       options.id       ?? `toast-${Date.now()}-${Math.random()}`,
  });
}

const toast = {
  success: (title, opts = {}) => _show('success', title, opts),
  error:   (title, opts = {}) => _show('error',   title, { duration: 0, ...opts }),
  info:    (title, opts = {}) => _show('info',    title, opts),
  warning: (title, opts = {}) => _show('warning', title, opts),

  xp: (amount, opts = {}) => {
    const sub = opts.level != null && opts.xpBar
      ? `Seviye ${opts.level} · ${opts.xpBar[0]} / ${opts.xpBar[1]} XP`
      : undefined;
    _show('xp', `+${amount} XP${opts.label ? ` — ${opts.label}` : ''}`, { sub, ...opts });
  },

  badge: (opts = {}) => {
    if (!opts.name) return;
    _show('badge', `Yeni Rozet — ${opts.name}`, {
      sub:      opts.description ?? null,
      duration: 5000,
      ...opts,
    });
  },

  _register:   (emit) => { _emit = emit; },
  _unregister: ()     => { _emit = null; },
};

export default toast;
