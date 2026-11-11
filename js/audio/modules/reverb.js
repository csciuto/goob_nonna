/**
 * Spring reverb: a ConvolverNode whose impulse response comes from a small model of a spring tank,
 * computed once at start-up and identical on every load.
 *
 * Each spring is a delay loop. A wave travels down the spring, reflects, and comes back quieter. A
 * spring is dispersive: up to a few kilohertz, higher frequencies travel more slowly, so each echo
 * arrives as a short rising chirp, and each later echo is smeared further. That chirp is the "boing".
 * The model puts a chain of all-pass filters inside each loop. Each is "stretched" (its one-sample
 * delay replaced by several) so that the slow-down happens below about 4 kHz, where a real spring's
 * does; a low-pass then removes everything above that, as a spring tank's pickup does. Three springs
 * of different lengths keep the echoes from lining up.
 */
const SPRINGS = [
  { delay: 0.0331, stages: 36, a: 0.62 },
  { delay: 0.0389, stages: 44, a: 0.60 },
  { delay: 0.0467, stages: 52, a: 0.64 },
];
const DECAY_SECONDS = 1.9;       // time to fall 60 dB
const CHIRP_TOP_HZ = 4000;       // the chirp sweeps from 0 up to here
export const IR_SECONDS = 2.4;

/** The impulse response of the spring tank, as a Float32Array at the given sample rate. */
export function springImpulse(sampleRate, seconds = IR_SECONDS) {
  const n = Math.round(seconds * sampleRate);
  const out = new Float32Array(n);
  const K = Math.max(1, Math.round(sampleRate / (2 * CHIRP_TOP_HZ)));   // all-pass stretch
  const damp = 1 - Math.exp(-2 * Math.PI * CHIRP_TOP_HZ / sampleRate);
  for (const sp of SPRINGS) {
    const d = Math.round(sp.delay * sampleRate);
    const g = -Math.pow(10, -3 * sp.delay / DECAY_SECONDS);     // inverting reflection
    const line = new Float32Array(d);                           // what went into the loop d samples ago
    const xs = new Float32Array(sp.stages * K), ys = new Float32Array(sp.stages * K);
    let low = 0, w = 0, k = 0;
    for (let i = 0; i < n; i++) {
      let v = line[w];                                          // returning from the far end
      for (let s = 0, at = k; s < sp.stages; s++, at += K) {    // dispersion: y[n] = a x[n] + x[n-K] - a y[n-K]
        const y = sp.a * v + xs[at] - sp.a * ys[at];
        xs[at] = v; ys[at] = y; v = y;
      }
      low += damp * (v - low);                                  // highs die a little faster each trip
      out[i] += low;
      line[w] = (i === 0 ? 1 : 0) + g * low;
      w = w + 1 === d ? 0 : w + 1;
      k = k + 1 === K ? 0 : k + 1;
    }
  }
  // the pickup: nothing above the chirp's top (36 dB per octave)
  const cut = 1 - Math.exp(-2 * Math.PI * CHIRP_TOP_HZ * 0.9 / sampleRate);
  for (let pass = 0; pass < 6; pass++) {
    let z = 0;
    for (let i = 0; i < n; i++) { z += cut * (out[i] - z); out[i] = z; }
  }
  let energy = 0;
  for (let i = 0; i < n; i++) energy += out[i] * out[i];
  const scale = 1 / Math.sqrt(energy);                          // unit energy: wet and dry are about as loud
  for (let i = 0; i < n; i++) out[i] *= scale;
  return out;
}

export class ReverbModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this._mix = 0.3;

    this.input = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1 - this._mix;
    this.convolver = this.ctx.createConvolver();
    this.convolver.normalize = false;
    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = this._mix;
    this.output = this.ctx.createGain();

    const ir = springImpulse(this.ctx.sampleRate);
    const buffer = this.ctx.createBuffer(1, ir.length, this.ctx.sampleRate);
    buffer.copyToChannel(ir, 0);
    this.convolver.buffer = buffer;

    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  /** MIX knob, 0 to 10: no reverb at the bottom, only reverb at the top. */
  setMix(value) {
    this._mix = value / 10;
    const now = this.ctx.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this._mix, now, 0.012);
    this.wetGain.gain.setTargetAtTime(this._mix, now, 0.012);
  }

  destroy() {
    for (const n of [this.input, this.dryGain, this.convolver, this.wetGain, this.output]) n.disconnect();
  }
}
