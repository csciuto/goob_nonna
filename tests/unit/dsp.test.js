import { describe, it, expect } from 'vitest';
import { OscCore, LadderCore, EnvCore, LfoCore, Hp1Core, SHAPE, LFO_OUT, C4, resonanceToFeedback } from '../../js/audio/worklets.js';

/** These tests run the synth's DSP in Node and measure what comes out. */
const SR = 48000;
const dB = x => 20 * Math.log10(x);
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
/** Amplitude of one frequency in a signal (Goertzel). */
function level(sig, f, sr = SR) {
  let re = 0, im = 0;
  for (let i = 0; i < sig.length; i++) { const p = 2 * Math.PI * f * i / sr; re += sig[i] * Math.cos(p); im -= sig[i] * Math.sin(p); }
  return 2 * Math.hypot(re, im) / sig.length;
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
/** Pitch from rising zero crossings (after the first few samples), with the crossing times interpolated. */
function pitchOf(sig, sr = SR) {
  const t = [];
  for (let i = 200; i < sig.length; i++) if (sig[i - 1] <= 0 && sig[i] > 0) t.push(i - 1 + -sig[i - 1] / (sig[i] - sig[i - 1]));
  return (t.length - 1) / ((t[t.length - 1] - t[0]) / sr);
}
const osc = (seconds, pitch, shape, { pw = 0, lin = 0, sync = null, opts } = {}) => {
  const o = new OscCore(SR, opts), out = new Float64Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = o.tick(pitch, shape, pw, lin, sync ? sync[i] : 0, !!sync);
  return out;
};
const sine = (f, amp, seconds) => Float64Array.from({ length: Math.round(seconds * SR) }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / SR));
const ladderGain = (f, fc, k) => {
  const l = new LadderCore(SR), x = sine(f, 0.02, 0.5), y = x.map(v => l.tick(v, fc, k));
  return dB(level(y.slice(SR / 4), f) / 0.02);
};

describe('oscillator', () => {
  it('plays in tune: C4 at pitch 0, one octave per unit', () => {
    expect(pitchOf(osc(1, 0, SHAPE.SAW))).toBeCloseTo(C4, 1);
    expect(pitchOf(osc(1, 1, SHAPE.TRIANGLE))).toBeCloseTo(2 * C4, 1);
    expect(pitchOf(osc(1, -2, SHAPE.SQUARE))).toBeCloseTo(C4 / 4, 1);
  });

  it('every waveform is full level', () => {
    for (const s of [SHAPE.TRIANGLE, SHAPE.SAW, SHAPE.SQUARE]) {
      const y = osc(0.5, 0, s);
      expect(Math.max(...y)).toBeGreaterThan(0.9);
      expect(Math.max(...y)).toBeLessThan(1.25);
    }
  });

  it('square is 50% and narrow pulse 25%, and pulse width moves them', () => {
    const high = y => { const m = mean(y); return y.filter((v, i) => i > 100 && v > m).length / (y.length - 100); };
    expect(high(osc(1, -1, SHAPE.SQUARE))).toBeCloseTo(0.5, 2);
    expect(high(osc(1, -1, SHAPE.NARROW))).toBeCloseTo(0.25, 2);
    expect(high(osc(1, -1, SHAPE.NARROW, { pw: 0.2 }))).toBeCloseTo(0.45, 2);
    expect(high(osc(1, -1, SHAPE.SQUARE, { pw: 9 }))).toBeCloseTo(0.95, 2);     // limited, never silent
  });

  it('band-limits its edges: far less aliasing than a naive saw', () => {
    const f = C4 * 2 ** 3.37;                       // a high note that doesn't divide the sample rate
    const y = osc(1, 3.37, SHAPE.SAW);
    const naive = Float64Array.from(y, (_, i) => 2 * ((f * i / SR) % 1) - 1);
    const alias = 18 * f - SR;                      // where the 18th harmonic folds back to: an audible 660 Hz
    expect(dB(level(naive, alias) / level(y, alias))).toBeGreaterThan(25);
    expect(level(y, f)).toBeGreaterThan(0.5);
  });

  it('hard sync locks oscillator 2 to oscillator 1', () => {
    const master = osc(1, 0, SHAPE.SAW);
    const y = osc(1, 0.63, SHAPE.SAW, { sync: master });
    const lock = level(y, C4), free = level(y, C4 * 2 ** 0.63);
    expect(lock).toBeGreaterThan(0.3);                      // the pitch heard is oscillator 1's
    expect(level(y, 2 * C4)).toBeGreaterThan(0.05);         // with its harmonics
    expect(free).toBeLessThan(lock);
  });

  it('synced below oscillator 1 it has little output', () => {
    const master = osc(1, 1, SHAPE.SAW);
    const y = osc(1, -1, SHAPE.SAW, { sync: master }).slice(1000), m = mean(y);
    expect(rms(y.map(v => v - m)))
      .toBeLessThan(rms(osc(1, -1, SHAPE.SAW)) / 3);
  });

  it('linear FM shifts the pitch by Hz, not by ratio', () => {
    expect(pitchOf(osc(1, 0, SHAPE.SAW, { lin: 100 }))).toBeCloseTo(C4 + 100, 0);
    expect(pitchOf(osc(1, 1, SHAPE.SAW, { lin: 100 }))).toBeCloseTo(2 * C4 + 100, 0);
  });

  it('drifts by a few cents when asked, never when not', () => {
    const o = new OscCore(SR, { driftCents: 3, seed: 5 });
    let worst = 0;
    for (let i = 0; i < 4000; i++) { o.advanceDrift(128); worst = Math.max(worst, Math.abs(o.drift * 1200)); }
    expect(worst).toBeGreaterThan(0.5);
    expect(worst).toBeLessThan(9);
    const still = new OscCore(SR); still.advanceDrift(128);
    expect(still.drift).toBe(0);
  });
});

describe('ladder filter', () => {
  it('passes the bass and falls 24 dB per octave above the cutoff', () => {
    expect(ladderGain(100, 1000, 0)).toBeCloseTo(0, 0);
    expect(ladderGain(1000, 1000, 0)).toBeCloseTo(-12, 0);     // four poles, 3 dB each
    const slope = ladderGain(8000, 1000, 0) - ladderGain(4000, 1000, 0);
    expect(slope).toBeLessThan(-21);
    expect(slope).toBeGreaterThan(-27);
  });

  it('resonance lifts the cutoff and thins the bass', () => {
    expect(ladderGain(1000, 1000, 3.5) - ladderGain(1000, 1000, 0)).toBeGreaterThan(12);
    expect(ladderGain(100, 1000, 3)).toBeCloseTo(-12, 0);      // 1 / (1 + 3)
  });

  it('self-oscillates at the cutoff with resonance all the way up, and stays bounded', () => {
    for (const fc of [220, 1000, 3000]) {
      const l = new LadderCore(SR), y = new Float64Array(SR * 2);
      for (let i = 0; i < y.length; i++) y[i] = l.tick(0, fc, resonanceToFeedback(4));
      const tail = y.slice(SR);
      expect(rms(tail)).toBeGreaterThan(0.05);
      expect(Math.max(...tail.map(Math.abs))).toBeLessThan(2.5);
      expect(Math.abs(1200 * Math.log2(pitchOf(tail) / fc))).toBeLessThan(25);   // within a quarter of a semitone
    }
  });

  it('does not self-oscillate below the top of the knob', () => {
    const l = new LadderCore(SR), y = new Float64Array(SR);
    for (let i = 0; i < y.length; i++) y[i] = l.tick(0, 1000, resonanceToFeedback(3.6));
    expect(rms(y.slice(SR / 2))).toBeLessThan(0.001);
  });

  it('driven hard it saturates instead of clipping', () => {
    const l = new LadderCore(SR), y = sine(100, 4, 0.5).map(v => l.tick(v, 8000, 0));
    expect(Math.max(...y.map(Math.abs))).toBeLessThan(2.05);
    expect(level(y, 300) / level(y, 100)).toBeGreaterThan(0.05);   // odd harmonics appear
  });
});

describe('envelope', () => {
  const run = (gateAt, { a = 0.1, d = 0.2, s = 0.5, r = 0.3, seconds = 2 } = {}) => {
    const e = new EnvCore(SR), env = new Float64Array(seconds * SR), kb = new Float64Array(seconds * SR);
    for (let i = 0; i < env.length; i++) { env[i] = e.tick(gateAt(i / SR), a, d, s, r); kb[i] = e.kb; }
    return { env, kb, at: t => env[Math.round(t * SR)], kbAt: t => kb[Math.round(t * SR)] };
  };

  it('attack, decay, sustain and release take the times set', () => {
    const { at } = run(t => (t >= 0.1 && t < 1 ? 1.6 : 0));
    expect(at(0.05)).toBe(0);
    expect(at(0.15)).toBeCloseTo(0.5, 2);          // halfway up a 100 ms attack
    expect(at(0.2)).toBeCloseTo(1, 2);
    expect(at(0.4)).toBeCloseTo(0.5 + 0.5 * Math.exp(-3), 2);   // 95% of the way down after the decay time
    expect(at(0.95)).toBeCloseTo(0.5, 2);
    expect(at(1.3)).toBeCloseTo(0.5 * Math.exp(-3), 2);
    expect(at(1.95)).toBeLessThan(0.001);
  });

  it('a new note starts from the current level, not from zero', () => {
    const { env } = run(t => ((t >= 0.1 && t < 0.5) || t >= 0.55 ? 1.6 : 0), { r: 1 });
    const from = Math.round(0.55 * SR);
    expect(env[from - 1]).toBeGreaterThan(0.3);
    expect(env[from + 1]).toBeGreaterThan(env[from - 1]);
    expect(Math.min(...env.slice(from, from + 2000))).toBeGreaterThan(0.3);
  });

  it('gates need more than 1.2 volts', () => {
    expect(Math.max(...run(() => 0.2).env)).toBe(0);
    expect(Math.max(...run(() => 0.3).env)).toBeGreaterThan(0.9);
  });

  it('the KB RLS output is full at once, then follows the release', () => {
    const { kbAt } = run(t => (t >= 0.1 && t < 1 ? 1.6 : 0));
    expect(kbAt(0.11)).toBeGreaterThan(0.99);
    expect(kbAt(0.9)).toBeGreaterThan(0.99);
    expect(kbAt(1.3)).toBeCloseTo(Math.exp(-3), 2);
  });
});

describe('modulation oscillator', () => {
  const run = (rate, seconds, sync = () => 0) => {
    const l = new LfoCore(SR), outs = Array.from({ length: 6 }, () => new Float64Array(seconds * SR));
    for (let i = 0; i < outs[0].length; i++) { const o = l.tick(rate, sync(i / SR)); for (let c = 0; c < 6; c++) outs[c][i] = o[c]; }
    return outs;
  };

  it('runs at its rate, on every waveform', () => {
    const o = run(5, 2);
    expect(pitchOf(o[LFO_OUT.SINE])).toBeCloseTo(5, 2);
    expect(pitchOf(o[LFO_OUT.SQUARE])).toBeCloseTo(5, 2);
    expect(o[LFO_OUT.SAW][100]).toBeGreaterThan(o[LFO_OUT.SAW][0]);     // saw rises
    expect(o[LFO_OUT.RAMP][100]).toBeLessThan(o[LFO_OUT.RAMP][0]);      // ramp falls
  });

  it('sample and hold steps once per cycle and holds in between', () => {
    const sh = run(10, 2)[LFO_OUT.SH];
    const steps = sh.reduce((n, v, i) => n + (i && v !== sh[i - 1] ? 1 : 0), 0);
    expect(steps).toBeGreaterThanOrEqual(18);
    expect(steps).toBeLessThanOrEqual(20);
    expect(new Set(sh).size).toBeGreaterThan(15);
    expect(Math.max(...sh.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it('a sync pulse restarts the cycle and steps the sample and hold', () => {
    const o = run(0.07, 2, t => (t % 0.5 < 0.01 && t > 0.2 ? 1 : 0));
    const sh = o[LFO_OUT.SH];
    expect(sh.reduce((n, v, i) => n + (i && v !== sh[i - 1] ? 1 : 0), 0)).toBe(3);   // pulses at 0.5, 1.0, 1.5
    expect(o[LFO_OUT.SAW][Math.round(1.001 * SR)]).toBeCloseTo(-1, 1);
  });
});

describe('high-pass filter', () => {
  const gain = (f, fc) => { const h = new Hp1Core(SR), x = sine(f, 0.5, 0.5); return dB(level(x.map(v => h.tick(v, fc)).slice(SR / 4), f) / 0.5); };
  it('is 6 dB per octave', () => {
    expect(gain(1000, 1000)).toBeCloseTo(-3, 0);
    expect(gain(8000, 500)).toBeCloseTo(0, 0);
    expect(gain(100, 1600) - gain(200, 1600)).toBeCloseTo(-6, 0);
  });
});
