/**
 * Sound tests: build the real engine on an OfflineAudioContext, play it, and measure what comes out.
 * Loaded inside the browser by tests/e2e/sound.spec.js.
 */
import { AudioEngine } from '../js/audio/engine.js';

export const SR = 48000;

/**
 * Render the synth.
 * @param setup   (engine) => {}   knob settings before time 0
 * @param events  [[seconds, (engine) => {}], ...]   things done while it plays
 * @returns Float32Array of the output (mono)
 */
export async function render({ seconds = 1, setup = () => {}, events = [], reverb = 0 } = {}) {
  const ctx = new OfflineAudioContext(1, Math.round(seconds * SR), SR);
  const engine = await AudioEngine.create(ctx, { driftCents: 0 });
  engine.setReverbMix(reverb);
  setup(engine);
  for (const [t, fn] of events) {
    if (t <= 0) fn(engine);
    else ctx.suspend(t).then(() => { fn(engine); ctx.resume(); });
  }
  const buffer = await ctx.startRendering();
  return buffer.getChannelData(0);
}

export const slice = (sig, from, to) => sig.subarray(Math.round(from * SR), Math.round(to * SR));
export const rms = sig => Math.sqrt(sig.reduce((s, v) => s + v * v, 0) / sig.length);
export const peak = sig => sig.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
export const dB = x => 20 * Math.log10(x);

/** Amplitude of one frequency (Goertzel). */
export function level(sig, f) {
  let re = 0, im = 0;
  for (let i = 0; i < sig.length; i++) { const p = 2 * Math.PI * f * i / SR; re += sig[i] * Math.cos(p); im -= sig[i] * Math.sin(p); }
  return 2 * Math.hypot(re, im) / sig.length;
}

/** Pitch in Hz: the shortest period at which the signal repeats (autocorrelation), refined between samples. */
export function pitch(sig, lo = 30, hi = 4000) {
  const n = Math.min(sig.length, 8192), minLag = Math.floor(SR / hi), maxLag = Math.min(Math.ceil(SR / lo), n >> 1);
  const ac = new Float64Array(maxLag + 2);
  for (let lag = 0; lag <= maxLag + 1; lag++) { let s = 0; for (let i = 0; i + lag < n; i++) s += sig[i] * sig[i + lag]; ac[lag] = s / (n - lag); }
  let top = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) if (ac[lag] > top) top = ac[lag];
  let best = minLag;
  for (let lag = Math.max(minLag, 2); lag <= maxLag; lag++) {
    // the first peak nearly as strong as the strongest: longer lags that match are multiples of it
    if (ac[lag] >= 0.9 * top && ac[lag] >= ac[lag - 1] && ac[lag] >= ac[lag + 1]) { best = lag; break; }
  }
  const a = ac[best - 1], b = ac[best], c = ac[best + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0;
  return SR / (best + shift);
}

/** Cents between two frequencies. */
export const cents = (f, ref) => 1200 * Math.log2(f / ref);
export const midi = note => 440 * 2 ** ((note - 69) / 12);

/** Loudness over time: RMS in windows of `ms`. */
export function envelope(sig, ms = 10) {
  const w = Math.round(SR * ms / 1000), out = [];
  for (let i = 0; i + w <= sig.length; i += w) out.push(rms(sig.subarray(i, i + w)));
  return out;
}
