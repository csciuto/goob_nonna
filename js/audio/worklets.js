/**
 * The synth's signal generators and processors, as pure DSP "cores" plus thin AudioWorklet wrappers.
 *
 * The cores have no Web Audio in them, so the unit tests run them in Node and measure the result
 * (pitch, slope, envelope times). The wrappers at the bottom register each core as a processor; that
 * part runs only inside an AudioWorklet.
 *
 * Signal levels follow the hardware in units of 5 volts: an audio or LFO signal is -1..+1 (10 V peak
 * to peak), a gate or full envelope is 1.6 (+8 V), and pitch inputs are 1 volt per octave, so one
 * unit there is five octaves. The engine does that scaling; cores take plain octaves, Hz and seconds.
 */

const LN2 = Math.LN2;
export const C4 = 261.6255653005986;
export const GATE_THRESHOLD = 0.24;   // 1.2 V: "any signal > +1.2 Volts will act as a Trigger"
export const LOGIC_THRESHOLD = 0.5;   // 2.5 V: clock, on/off and reset inputs

/** Small seeded random generator, so drift, noise seeds and S/H are the same on every run. */
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SHAPE = { TRIANGLE: 0, SAW: 1, SQUARE: 2, NARROW: 3 };

/**
 * Oscillator: triangle, saw, square (50%) and narrow pulse (25%), with pulse-width modulation,
 * hard sync and linear FM. Edges are band-limited (polyBLEP), which needs the sample after an edge,
 * so the output runs one sample late.
 */
export class OscCore {
  constructor(sampleRate, { driftCents = 0, seed = 1 } = {}) {
    this.sr = sampleRate;
    this.phase = 0;
    this.prevSync = 0;
    this.held = 0;            // the previous sample, waiting for any edge correction
    this.driftCents = driftCents;
    this.drift = 0;           // current drift, in octaves
    this.rand = mulberry(seed);
  }

  /** Slow random pitch wander (mean-reverting, about a 2 second time constant). Call once per block. */
  advanceDrift(samples) {
    if (!this.driftCents) return;
    const dt = samples / this.sr, tau = 2;
    const gauss = this.rand() + this.rand() + this.rand() + this.rand() - 2;   // roughly normal, sd 0.58
    const sigma = (this.driftCents / 2) / 1200;
    this.drift += -this.drift * (dt / tau) + sigma * Math.sqrt(2 * dt / tau) * gauss / 0.58;
  }

  static value(shape, phase, duty) {
    if (shape === SHAPE.SAW) return 2 * phase - 1;
    if (shape === SHAPE.TRIANGLE) return 4 * Math.abs(phase - 0.5) - 1;
    return (phase < duty ? 1 : -1) - (2 * duty - 1);     // pulse, with its DC removed (AC coupled)
  }

  /**
   * One sample.
   * @param pitch  octaves above C4 (keyboard, knobs, bend and modulation, already summed)
   * @param shape  SHAPE.*
   * @param pw     pulse-width offset, as a fraction of the cycle (added to 50% or 25%)
   * @param linHz  linear FM, in Hz
   * @param sync   the sync source's signal; a rising zero crossing restarts the cycle when syncOn
   */
  tick(pitch, shape, pw = 0, linHz = 0, sync = 0, syncOn = false) {
    let f = C4 * Math.exp((pitch + this.drift) * LN2) + linHz;
    if (!(f > 0)) f = 0;
    if (f > this.sr * 0.45) f = this.sr * 0.45;
    const dt = f / this.sr;
    const pulse = shape === SHAPE.SQUARE || shape === SHAPE.NARROW;
    let duty = (shape === SHAPE.NARROW ? 0.25 : 0.5) + pw;
    duty = duty < 0.05 ? 0.05 : duty > 0.95 ? 0.95 : duty;

    let prevFix = 0, curFix = 0;
    // A step of height h that happened x samples ago (0 <= x < 1): correct this sample and the last.
    const edge = (h, x) => {
      curFix += h * (x - x * x / 2 - 0.5);
      const t = x - 1;
      prevFix += h * (t * t / 2 + t + 0.5);
    };

    const prevPhase = this.phase;
    let synced = false;
    if (syncOn && this.prevSync <= 0 && sync > 0) {
      const frac = -this.prevSync / (sync - this.prevSync);      // how far into this sample the crossing fell
      let at = prevPhase + dt * frac; if (at >= 1) at -= 1;
      const before = OscCore.value(shape, at, duty);
      this.phase = dt * (1 - frac);
      edge(OscCore.value(shape, 0, duty) - before, 1 - frac);
      synced = true;
    }
    this.prevSync = sync;

    if (!synced) {
      let p = prevPhase + dt, wrapped = false;
      if (p >= 1) {
        p -= 1; wrapped = true;
        if (dt > 0) {
          if (shape === SHAPE.SAW) edge(-2, p / dt);
          else if (pulse) edge(2, p / dt);
        }
      }
      if (pulse && dt > 0 && p >= duty && (wrapped || prevPhase < duty)) edge(-2, (p - duty) / dt);
      this.phase = p;
    }

    const out = this.held + prevFix;
    this.held = OscCore.value(shape, this.phase, duty) + curFix;
    return out;
  }
}

/** The ladder's soft saturation, 2·tanh(z/2), as a gain: sat(z) = z · satGain(z). */
const satGain = z => { const a = 0.5 * z; return a > -1e-4 && a < 1e-4 ? 1 : Math.tanh(a) / a; };

const SELF_OSC_TRIM = 23 / 1200 * Math.LN2;

/** Half-band low-pass for 2× oversampling: a Blackman-windowed sinc at a quarter of the doubled rate. */
const HB_TAPS = 47;
const HALF_BAND = (() => {
  const M = (HB_TAPS - 1) / 2, h = new Float64Array(HB_TAPS);
  let sum = 0;
  for (let n = 0; n < HB_TAPS; n++) {
    const m = n - M, sinc = m === 0 ? 1 : Math.sin(Math.PI * m / 2) / (Math.PI * m / 2);
    const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (HB_TAPS - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (HB_TAPS - 1));
    h[n] = sinc * w; sum += h[n];
  }
  return h.map(v => v / sum);
})();

/**
 * Four-pole (24 dB per octave) transistor-ladder low-pass filter: four one-pole stages in a feedback loop.
 * Each stage saturates, as the transistors do, so a loud signal thickens, resonance softens when driven and
 * self-oscillation stays bounded; resonance thins the bass, as on the hardware. Each stage is
 * dy/dt = ωc·(sat(in) − sat(y)), solved without a delay in the loop so the resonant peak sits at the cutoff;
 * the saturations are folded in as gains from the previous step and refined once (exact when quiet). Runs at
 * twice the sample rate and filters back down, so the saturation's high harmonics don't fold into the
 * audible range.
 */
export class LadderCore {
  constructor(sampleRate, seed = 7) {
    this.sr = sampleRate;
    this.s = new Float64Array(4);      // integrator states
    this.y = new Float64Array(4);      // last stage outputs, for the saturation estimates
    this.u = 0;
    this.prevX = 0;
    this.buf = new Float64Array(HB_TAPS);
    this.pos = 0;
    this.rand = mulberry(seed);
  }

  step(x, g, k) {
    this.solve(x, g, k, this.u, this.y[0], this.y[1], this.y[2], this.y[3]);   // estimate from the last step,
    return this.solve(x, g, k, this.u, this.y[0], this.y[1], this.y[2], this.y[3], true);   // then refine once
  }

  solve(x, g, k, eu, e0, e1, e2, e3, commit = false) {
    const s = this.s, y = this.y;
    const tu = satGain(eu), t0 = satGain(e0), t1 = satGain(e1), t2 = satGain(e2), t3 = satGain(e3);
    // each stage: y_i = a_i · in_i + b_i
    const d0 = 1 / (1 + g * t0), d1 = 1 / (1 + g * t1), d2 = 1 / (1 + g * t2), d3 = 1 / (1 + g * t3);
    const a0 = g * tu * d0, b0 = s[0] * d0;
    const a1 = g * t0 * d1, b1 = s[1] * d1;
    const a2 = g * t1 * d2, b2 = s[2] * d2;
    const a3 = g * t2 * d3, b3 = s[3] * d3;
    // y3 = A·u + B, and u = x − k·y3
    const A = a3 * a2 * a1 * a0;
    const B = a3 * (a2 * (a1 * b0 + b1) + b2) + b3;
    const u = (x - k * B) / (1 + k * A);
    y[0] = a0 * u + b0; y[1] = a1 * y[0] + b1; y[2] = a2 * y[1] + b2; y[3] = a3 * y[2] + b3;
    this.u = u;
    if (commit) for (let i = 0; i < 4; i++) s[i] = 2 * y[i] - s[i];
    return y[3];
  }

  push(v) { this.buf[this.pos] = v; this.pos = (this.pos + 1) % HB_TAPS; }

  /** @param fc cutoff in Hz; @param k feedback amount: 0 none, 4 the edge of self-oscillation */
  tick(x, fc, k) {
    const max = this.sr * 0.45;
    fc = fc < 5 ? 5 : fc > max ? max : fc;
    // Self-oscillating, the saturating input stage pulls the pitch about 23 cents flat; trim it back, as the
    // hardware is calibrated to play in tune from the keys. Below self-oscillation nothing changes.
    if (k > 4) fc *= Math.exp(SELF_OSC_TRIM * Math.min(1, (k - 4) / 0.24));
    const g = Math.tan(Math.PI * fc / (2 * this.sr));
    x += (this.rand() - 0.5) * 2e-5;
    this.push(this.step(0.5 * (this.prevX + x), g, k));
    this.push(this.step(x, g, k));
    this.prevX = x;
    let out = 0;
    for (let n = 0, j = this.pos; n < HB_TAPS; n++, j = (j + 1) % HB_TAPS) out += HALF_BAND[n] * this.buf[j];
    return out;
  }
}

/** Resonance knob (0 to 4) to ladder feedback: the top of the knob is just past self-oscillation. */
export const resonanceToFeedback = knob => Math.max(0, knob) * 1.06;

/**
 * ADSR envelope driven by a gate signal. Attack is linear, decay and release are exponential.
 * A new gate starts the attack from wherever the level is, so retriggering doesn't click.
 * `kb` is the second output, for the VCA's KB RLS mode: full level at once, then the release.
 */
export class EnvCore {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.level = 0;
    this.kb = 0;
    this.stage = 0;      // 0 idle/release, 1 attack, 2 decay/sustain
    this.high = false;
  }

  /** Times in seconds; sustain 0 to 1. Returns the envelope level, 0 to 1. */
  tick(gate, attack, decay, sustain, release) {
    const high = gate > GATE_THRESHOLD;
    if (high && !this.high) this.stage = 1;
    if (!high && this.high) this.stage = 0;
    this.high = high;

    if (this.stage === 1) {
      this.level += 1 / (Math.max(attack, 0.0005) * this.sr);
      if (this.level >= 1) { this.level = 1; this.stage = 2; }
    } else if (this.stage === 2) {
      this.level = sustain + (this.level - sustain) * Math.exp(-3 / (Math.max(decay, 0.001) * this.sr));
    } else if (this.level > 0) {
      this.level *= Math.exp(-3 / (Math.max(release, 0.001) * this.sr));
      if (this.level < 1e-5) this.level = 0;
    }

    if (high) this.kb += (1 - this.kb) * 0.05;                // about a millisecond: instant, without a click
    else if (this.kb > 0) {
      this.kb *= Math.exp(-3 / (Math.max(release, 0.001) * this.sr));
      if (this.kb < 1e-5) this.kb = 0;
    }
    return this.level;
  }
}

export const LFO_OUT = { SINE: 0, SAW: 1, RAMP: 2, SQUARE: 3, SH: 4, TRIANGLE: 5 };

/**
 * Modulation oscillator: every waveform at once, plus sample and hold, which takes a new random
 * value at the start of each cycle. A rising edge on sync restarts the cycle (and so steps the S/H).
 */
export class LfoCore {
  constructor(sampleRate, seed = 11) {
    this.sr = sampleRate;
    this.phase = 0;
    this.prevSync = 0;
    this.rand = mulberry(seed);
    this.sh = this.rand() * 2 - 1;
    this.out = new Float64Array(6);
  }

  tick(rateHz, sync = 0) {
    if (this.prevSync <= GATE_THRESHOLD && sync > GATE_THRESHOLD) { this.phase = 0; this.sh = this.rand() * 2 - 1; }
    this.prevSync = sync;
    const p = this.phase, o = this.out;
    o[0] = Math.sin(2 * Math.PI * p);
    o[1] = 2 * p - 1;
    o[2] = 1 - 2 * p;
    o[3] = p < 0.5 ? 1 : -1;
    o[4] = this.sh;
    o[5] = 1 - 4 * Math.abs(p - 0.5);
    let f = rateHz; if (!(f > 0)) f = 0; if (f > this.sr * 0.45) f = this.sr * 0.45;
    this.phase = p + f / this.sr;
    if (this.phase >= 1) { this.phase -= 1; this.sh = this.rand() * 2 - 1; }
    return o;
  }
}

/** One-pole (6 dB per octave) high-pass filter. */
export class Hp1Core {
  constructor(sampleRate) { this.sr = sampleRate; this.x1 = 0; this.y1 = 0; }
  tick(x, fc) {
    const a = 1 / (1 + 2 * Math.PI * fc / this.sr);
    const y = a * (this.y1 + x - this.x1);
    this.x1 = x; this.y1 = y;
    return y;
  }
}

// ── AudioWorklet wrappers ───────────────────────────────────────────────────────────────────────────

if (typeof registerProcessor === 'function') {
  const at = (arr, i) => (arr.length > 1 ? arr[i] : arr[0]);
  const A = 'a-rate', K = 'k-rate';

  registerProcessor('gn-osc', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'pitch', defaultValue: 0, automationRate: A },    // octaves above C4
        { name: 'tune', defaultValue: 0, automationRate: K },     // octave switch and frequency knob, in octaves
        { name: 'pw', defaultValue: 0, automationRate: A },
        { name: 'linFm', defaultValue: 0, automationRate: A },    // Hz
        { name: 'shape', defaultValue: SHAPE.SAW, automationRate: K },
        { name: 'sync', defaultValue: 0, automationRate: K },
      ];
    }
    constructor(options) {
      super();
      this.core = new OscCore(sampleRate, options.processorOptions || {});
    }
    process(inputs, outputs, p) {
      const out = outputs[0][0], sync = inputs[0][0];
      const tune = p.tune[0], shape = Math.round(p.shape[0]), syncOn = p.sync[0] > 0.5;
      this.core.advanceDrift(out.length);
      for (let i = 0; i < out.length; i++) {
        out[i] = this.core.tick(at(p.pitch, i) + tune, shape, at(p.pw, i), at(p.linFm, i), sync ? sync[i] : 0, syncOn);
      }
      return true;
    }
  });

  registerProcessor('gn-ladder', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'cutoff', defaultValue: 1000, minValue: 1, automationRate: A },   // Hz, from the knob
        { name: 'cv', defaultValue: 0, automationRate: A },                         // octaves added to it
        { name: 'res', defaultValue: 0, automationRate: A },                        // knob units, 0 to 4
      ];
    }
    constructor() { super(); this.core = new LadderCore(sampleRate); }
    process(inputs, outputs, p) {
      const out = outputs[0][0], x = inputs[0][0];
      const core = this.core;
      for (let i = 0; i < out.length; i++) {
        const fc = at(p.cutoff, i) * Math.exp(at(p.cv, i) * LN2);
        out[i] = core.tick(x ? x[i] : 0, fc, resonanceToFeedback(at(p.res, i)));
      }
      return true;
    }
  });

  registerProcessor('gn-env', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'attack', defaultValue: 0.01, automationRate: K },
        { name: 'decay', defaultValue: 0.2, automationRate: K },
        { name: 'sustain', defaultValue: 0.7, automationRate: K },
        { name: 'release', defaultValue: 0.3, automationRate: K },
      ];
    }
    constructor() { super(); this.core = new EnvCore(sampleRate); }
    process(inputs, outputs, p) {
      const env = outputs[0][0], kb = outputs[1][0], gate = inputs[0][0];
      const a = p.attack[0], d = p.decay[0], s = p.sustain[0], r = p.release[0];
      for (let i = 0; i < env.length; i++) {
        env[i] = this.core.tick(gate ? gate[i] : 0, a, d, s, r);
        kb[i] = this.core.kb;
      }
      return true;
    }
  });

  registerProcessor('gn-lfo', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'rate', defaultValue: 5, automationRate: K },      // Hz, from the knob
        { name: 'rateCv', defaultValue: 0, automationRate: A },    // octaves added to it
      ];
    }
    constructor() { super(); this.core = new LfoCore(sampleRate); }
    process(inputs, outputs, p) {
      const sync = inputs[0][0], rate = p.rate[0], n = outputs[0][0].length;
      for (let i = 0; i < n; i++) {
        const o = this.core.tick(rate * Math.exp(at(p.rateCv, i) * LN2), sync ? sync[i] : 0);
        for (let c = 0; c < 6; c++) outputs[c][0][i] = o[c];
      }
      return true;
    }
  });

  registerProcessor('gn-hp1', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [{ name: 'cutoff', defaultValue: 200, minValue: 1, automationRate: K }];
    }
    constructor() { super(); this.core = new Hp1Core(sampleRate); }
    process(inputs, outputs, p) {
      const out = outputs[0][0], x = inputs[0][0], fc = p.cutoff[0];
      for (let i = 0; i < out.length; i++) out[i] = this.core.tick(x ? x[i] : 0, fc);
      return true;
    }
  });

  /** Watches its inputs for logic edges (clock, on/off, reset) and reports them to the main thread. */
  registerProcessor('gn-edge', class extends AudioWorkletProcessor {
    constructor() { super(); this.high = []; }
    process(inputs) {
      for (let n = 0; n < inputs.length; n++) {
        const x = inputs[n][0];
        if (!x) { if (this.high[n]) { this.high[n] = false; this.port.postMessage({ input: n, up: false }); } continue; }
        for (let i = 0; i < x.length; i++) {
          const up = x[i] > LOGIC_THRESHOLD;
          if (up !== !!this.high[n]) { this.high[n] = up; this.port.postMessage({ input: n, up }); }
        }
      }
      return true;
    }
  });
}
