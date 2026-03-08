/**
 * 3-channel mixer: OSC1, OSC2, Noise.
 * Each channel has a level control (GainNode).
 * All summed into a single output.
 */
export class MixerModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    // Input gain nodes for each channel (junction points for patching)
    this.osc1Input = this.ctx.createGain();
    this.osc1Input.gain.value = 1.0;

    this.osc2Input = this.ctx.createGain();
    this.osc2Input.gain.value = 1.0;

    this.noiseInput = this.ctx.createGain();
    this.noiseInput.gain.value = 1.0;

    // Level controls
    this.osc1Level = this.ctx.createGain();
    this.osc1Level.gain.value = 0.8; // Default: OSC1 audible

    this.osc2Level = this.ctx.createGain();
    this.osc2Level.gain.value = 0.0; // Default: OSC2 off

    this.noiseLevel = this.ctx.createGain();
    this.noiseLevel.gain.value = 0.0; // Default: Noise off

    // Output (junction point)
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Connect chain: input → level → output
    this.osc1Input.connect(this.osc1Level);
    this.osc1Level.connect(this.output);

    this.osc2Input.connect(this.osc2Level);
    this.osc2Level.connect(this.output);

    this.noiseInput.connect(this.noiseLevel);
    this.noiseLevel.connect(this.output);
  }

  setOsc1Level(value) {
    // value: 0-10 knob range → 0-1
    this.osc1Level.gain.setValueAtTime(value / 10, this.ctx.currentTime);
  }

  setOsc2Level(value) {
    this.osc2Level.gain.setValueAtTime(value / 10, this.ctx.currentTime);
  }

  setNoiseLevel(value) {
    this.noiseLevel.gain.setValueAtTime(value / 10, this.ctx.currentTime);
  }

  destroy() {
    this.osc1Input.disconnect();
    this.osc2Input.disconnect();
    this.noiseInput.disconnect();
    this.osc1Level.disconnect();
    this.osc2Level.disconnect();
    this.noiseLevel.disconnect();
    this.output.disconnect();
  }
}
