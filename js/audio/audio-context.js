let audioContext = null;

export function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    keepTryingToStart(audioContext);
  }
  return audioContext;
}

/**
 * Browsers only let audio start inside a user gesture, and which events count differs: a key, a mouse press,
 * but for touch only the finger lifting (pointerup, touchend), not landing. So ask on every kind of gesture
 * until the context runs, rather than once on the first press.
 */
function keepTryingToStart(ctx) {
  const events = ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'keydown', 'click'];
  const tryStart = () => {
    if (ctx.state === 'running') { for (const ev of events) document.removeEventListener(ev, tryStart, true); return; }
    ctx.resume().catch(() => {});
  };
  for (const ev of events) document.addEventListener(ev, tryStart, true);
}

/** The context, asked to start now. Doesn't wait for it: the engine can be built before the browser allows sound. */
export async function ensureAudioContextRunning() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** The context if one exists yet, without creating it. */
export const peekAudioContext = () => audioContext;

export function getAudioContextTime() {
  return getAudioContext().currentTime;
}
