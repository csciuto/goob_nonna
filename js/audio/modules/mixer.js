const SMOOTH = 0.012;
const RANGE = 4;          // the shaper's input range, in units: three full sources still fit

/**
 * Three-channel mixer: OSC 1, OSC 2 and noise, each replaceable by a cable into its input.
 * Like the hardware, it starts to overdrive gently above about 1 o'clock on a level knob and
 * harder as levels rise: the sum runs through a soft saturation before the output.
 */
export class MixerModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    this.osc1Input = this.ctx.createGain();
    this.osc2Input = this.ctx.createGain();
    this.noiseInput = this.ctx.createGain();

    this.osc1Level = this.ctx.createGain();
    this.osc1Level.gain.value = 0.8;
    this.osc2Level = this.ctx.createGain();
    this.osc2Level.gain.value = 0;
    this.noiseLevel = this.ctx.createGain();
    this.noiseLevel.gain.value = 0;

    this.sum = this.ctx.createGain();
    this.sum.gain.value = 1 / RANGE;
    this.drive = this.ctx.createWaveShaper();
    this.drive.curve = MixerModule.curve();
    this.drive.oversample = '2x';
    this.output = this.ctx.createGain();

    this.osc1Input.connect(this.osc1Level);
    this.osc2Input.connect(this.osc2Level);
    this.noiseInput.connect(this.noiseLevel);
    for (const n of [this.osc1Level, this.osc2Level, this.noiseLevel]) n.connect(this.sum);
    this.sum.connect(this.drive);
    this.drive.connect(this.output);
  }

  /** The saturation: about 5% compression at a level of 0.6, clearly overdriven by 2. */
  static saturate(x) { return Math.tanh(x * 0.7) / 0.7; }
  static curve(points = 2049) {
    return Float32Array.from({ length: points }, (_, i) => MixerModule.saturate((i / (points - 1) * 2 - 1) * RANGE));
  }

  // knob values, 0 to 10
  setOsc1Level(value) { this.osc1Level.gain.setTargetAtTime(value / 10, this.ctx.currentTime, SMOOTH); }
  setOsc2Level(value) { this.osc2Level.gain.setTargetAtTime(value / 10, this.ctx.currentTime, SMOOTH); }
  setNoiseLevel(value) { this.noiseLevel.gain.setTargetAtTime(value / 10, this.ctx.currentTime, SMOOTH); }

  destroy() {
    for (const n of [this.osc1Input, this.osc2Input, this.noiseInput, this.osc1Level, this.osc2Level, this.noiseLevel, this.sum, this.drive, this.output]) n.disconnect();
  }
}
