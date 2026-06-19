let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

function playNote(ctx, freq, startTime, duration) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playBadgeSound() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    playNote(ctx, 880,  t,        0.25);
    playNote(ctx, 1320, t + 0.18, 0.30);
  } catch { /* AudioContext henüz izin verilmedi — sessizce atla */ }
}

export function playLevelSound() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    playNote(ctx, 660,  t,        0.20);
    playNote(ctx, 880,  t + 0.15, 0.20);
    playNote(ctx, 1320, t + 0.30, 0.35);
  } catch { /* sessizce atla */ }
}
