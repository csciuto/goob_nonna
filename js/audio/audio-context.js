let audioContext = null;
/** The last few tries to start the audio, for the on-page sound check. */
export const attempts = [];

export function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    keepTryingToStart(audioContext);
    keepRunning(audioContext);
  }
  return audioContext;
}

/**
 * Browsers only let audio start inside a user gesture, and which events count differs: a key, a mouse press,
 * but for touch only the finger lifting (pointerup, touchend), not landing. So ask on every kind of gesture
 * until the context runs, rather than once on the first press.
 */
/**
 * Once started, keep it running: on some Android phones Chrome switches a running context back to suspended a
 * moment after a tap. While the page is visible, resume straight away (a few times a second at most), and keep
 * a log of the changes for the on-page sound check.
 */
export const changes = [];
function keepRunning(ctx) {
  const t0 = performance.now();
  let tries = [];
  ctx.addEventListener('statechange', () => {
    const t = ((performance.now() - t0) / 1000).toFixed(2);
    const where = `${document.visibilityState}${document.hasFocus() ? ', focused' : ''}`;
    let action = '';
    if (ctx.state === 'suspended' && document.visibilityState === 'visible') {
      const now = performance.now();
      tries = tries.filter(x => now - x < 1000);
      if (tries.length < 4) { tries.push(now); ctx.resume().catch(() => {}); action = ' → resuming'; }
      else action = ' → too often, waiting for a tap';
    }
    changes.push(`+${t}s ${ctx.state} (${where})${action}`);
    if (changes.length > 6) changes.shift();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx.state === 'suspended') ctx.resume().catch(() => {});
  });
}

function keepTryingToStart(ctx) {
  const events = ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'keydown', 'click'];
  const tryStart = (e) => {
    if (ctx.state === 'running') { for (const ev of events) document.removeEventListener(ev, tryStart, true); return; }
    const gesture = navigator.userActivation ? navigator.userActivation.isActive : '?';
    const note = result => { attempts.push(`${e.type} (gesture ${gesture}): ${result}, now ${ctx.state}`); if (attempts.length > 5) attempts.shift(); };
    ctx.resume().then(() => note('ok'), err => note('refused: ' + (err?.message || err)));
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
